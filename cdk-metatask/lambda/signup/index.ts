import * as AWS from 'aws-sdk';
const dynamoClient = new AWS.DynamoDB.DocumentClient();
const crypto = require('crypto');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};
module.exports.handler = async (event: any) => {
  const requestBody = JSON.parse(event.body);
  const { address } = requestBody;

  const response = await updateNonce(address);

  console.log('response ', response);

  return {
    headers,
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

const updateNonce = (address: string) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const params: any = {
    TableName: process.env.USER_TABLE,
    Key: {
      address,
    },
    UpdateExpression: 'set nonce = :n',
    ExpressionAttributeValues: {
      ':n': nonce,
    },
    ReturnValues: 'ALL_NEW',
  };
  return dynamoClient.update(params).promise();
};
