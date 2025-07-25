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

  // 4) Replace snapshot (delete all then batchWrite, or overwrite individually)
  // here’s a simple full overwrite:
  const deleteRequests = previous.map(c => ({
    DeleteRequest: { Key: { name: c.name } }
  }));
  const putRequests = current.map(c => ({
    PutRequest: { Item: c }
  }));
  const batch = { RequestItems: {
    [process.env.SNAPSHOT_TABLE]: [...deleteRequests, ...putRequests]
  }};
  await ddb.batchWrite(batch).promise();

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

exports.handler = async () => {
  const changedCenters = await diffDynamoAndGetChanges();
  if (changedCenters.length) {
    await broadcast(changedCenters);
  }
};
