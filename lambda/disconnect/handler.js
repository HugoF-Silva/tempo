const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
exports.handler = async event => {
  const { connectionId } = event.requestContext;
  await ddb.delete({
    TableName: process.env.CONNECTIONS_TABLE,
    Key: { connectionId }
  }).promise();
  return { statusCode: 200 };
};