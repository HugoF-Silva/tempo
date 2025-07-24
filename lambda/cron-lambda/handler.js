const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const apigw = new AWS.ApiGatewayManagementApi({
  endpoint: `${process.env.WS_API_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/prod`
});

async function broadcast(changedCenters) {
  // 1) get all active connections
  const { Items } = await ddb.scan({
    TableName: process.env.CONNECTIONS_TABLE,
    ProjectionExpression: 'connectionId'
  }).promise();

  // 2) for each, POST to the WebSocket
  await Promise.all(Items.map(({ connectionId }) =>
    apigw.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({ action: 'healthCentersUpdate', data: changedCenters })
    }).promise().catch(err => {
      // clean up stale connections
      if (err.statusCode === 410) {
        return ddb.delete({
          TableName: process.env.CONNECTIONS_TABLE,
          Key: { connectionId }
        }).promise();
      }
    })
  ));
}

// your existing handler
exports.handler = async () => {
  const changedCenters = await diffDynamoAndGetChanges();
  if (changedCenters.length) {
    await broadcast(changedCenters);
  }
};
