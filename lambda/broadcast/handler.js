const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const apigw = new AWS.ApiGatewayManagementApi({
  endpoint: `${process.env.WS_API_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/prod`
});

async function diffDynamoAndGetChanges() {
  // 1) Load current and previous
  const [{ Items: current }, { Items: previous }] = await Promise.all([
    ddb.scan({ TableName: process.env.HEALTH_CENTERS_TABLE }).promise(),
    ddb.scan({ TableName: process.env.SNAPSHOT_TABLE }).promise()
  ]);

  // 2) Map previous by id
  const prevMap = new Map(previous.map(c => [c.name, c]));

  // 3) Find changed
  const changed = [];
  current.forEach(c => {
    const prev = prevMap.get(c.name);
    if (!prev || prev.status !== c.status) {
      changed.push(c);
    }
  });

  // 1. Delete all previous
  if (previous.length > 0) {
    const deleteBatches = [];
    for (let i = 0; i < previous.length; i += 25) {
      deleteBatches.push(previous.slice(i, i + 25));
    }
    for (const batch of deleteBatches) {
      await ddb.batchWrite({
        RequestItems: {
          [process.env.SNAPSHOT_TABLE]: batch.map(c => ({
            DeleteRequest: { Key: { name: c.name } }
          }))
        }
      }).promise();
    }
  }

  // 2. Write all current
  if (current.length > 0) {
    const putBatches = [];
    for (let i = 0; i < current.length; i += 25) {
      putBatches.push(current.slice(i, i + 25));
    }
    for (const batch of putBatches) {
      await ddb.batchWrite({
        RequestItems: {
          [process.env.SNAPSHOT_TABLE]: batch.map(c => ({
            PutRequest: { Item: c }
          }))
        }
      }).promise();
    }
  }

  return changed;
}

// simple simulation: pick a random status ≠ current
function simulateStatus(currentStatus) {
  const statuses = ['empty','average','full'];
  const options = statuses.filter(s => s !== currentStatus);
  return options[Math.floor(Math.random() * options.length)];
}

async function broadcast(changedCenters) {
  // 1) load *all* centers so we can simulate the rest
  const { Items: allCenters } = await ddb.scan({
    TableName: process.env.HEALTH_CENTERS_TABLE
  }).promise();

  // quick map for lookup
  const changedMap = new Map(changedCenters.map(c => [c.name, c]));

  let payloadData;
  if (changedCenters.length === allCenters.length) {
    // everyone was updated → no simulation
    payloadData = changedCenters.map(c => ({
      ...c,
      updated: true
    }));
  } else {
    payloadData = allCenters.map(center => {
      if (changedMap.has(center.name)) {
        // real update
        return {
          ...changedMap.get(center.name),
          updated: true
        };
      } else {
        // simulated “hourly” change
        return {
          ...center,
          status: simulateStatus(center.status),
          simulated: true
        };
      }
    });
  }

  // 2) broadcast to all connections
  const { Items } = await ddb.scan({
    TableName: process.env.CONNECTIONS_TABLE,
    ProjectionExpression: 'connectionId'
  }).promise();

  await Promise.all(Items.map(({ connectionId }) =>
    apigw.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        action: 'healthCentersUpdate',
        data: payloadData
      })
    }).promise().catch(err => {
      if (err.statusCode === 410) {
        // remove stale connection
        return ddb.delete({
          TableName: process.env.CONNECTIONS_TABLE,
          Key: { connectionId }
        }).promise();
      }
    })
  ));
}

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  // If this is an API Gateway WebSocket request (subscribe), event.requestContext.connectionId will be set
  if (event.requestContext && event.requestContext.connectionId) {
    // Handle as a request/response: send initial data to the single connection
    const connectionId = event.requestContext.connectionId;
    try {
      const { Items: healthCenters } = await ddb.scan({
        TableName: process.env.HEALTH_CENTERS_TABLE
      }).promise();

      await apigw.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: 'healthCentersInitial',
          data: healthCenters
        })
      }).promise();

      return { statusCode: 200 };
    } catch (err) {
      console.error("Error handling healthCentersSubscribe:", err);
      try {
        await apigw.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            action: "error",
            message: err.message || "Internal server error"
          })
        }).promise();
      } catch (e) {}
      return { statusCode: 500, body: "Internal server error" };
    }
  }

  const changedCenters = await diffDynamoAndGetChanges();
  if (changedCenters.length) {
    await broadcast(changedCenters);
  }
};
