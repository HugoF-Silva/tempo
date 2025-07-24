const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
exports.handler = async event => {
  const { connectionId } = event.requestContext;
  await ddb.put({
    TableName: process.env.CONNECTIONS_TABLE,
    Item: { connectionId, connectedAt: Date.now() }
  }).promise();
  return { statusCode: 200 };
};