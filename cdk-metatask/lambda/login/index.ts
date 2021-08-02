import * as AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB();
const dynamoClient = new AWS.DynamoDB.DocumentClient();
const cognitoidentity = new AWS.CognitoIdentity();
const crypto = require('crypto');
const Web3 = require('web3');

const web3 = new Web3(Web3.givenProvider);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

module.exports.handler = async (event: any) => {
  const requestBody = JSON.parse(event.body);
  const { address, signature } = requestBody;

  const nonces: any = await getNonce(address);
  console.log('nonces ', nonces.Item.nonce);

  if (nonces.Item.nonce) {
    //   const { nonce } = AWS.DynamoDB.Converter.unmarshall(nonces.Item);
    //   console.log("nonce ", nonce)
    const sigValidated = await validateSig(
      address,
      signature,
      nonces.Item.nonce
    );
    if (sigValidated) {
      const { IdentityId: identityId, Token: token } = await getIdToken(
        address
      );

      console.log('identityId', identityId);
      console.log('token', token);

      const { Credentials: credentials } = await getCredentials(
        identityId,
        token
      );

      console.log('credentials', credentials);

      await updateNonce(address);

      return {
        headers,
        statusCode: 200,
        body: JSON.stringify(credentials),
      };
    }
  }
  return {
    headers,
    statusCode: 401,
    body: JSON.stringify({
      login: false,
    }),
  };
};

const getNonce = (address: string) => {
  var params: any = {
    TableName: process.env.USER_TABLE,
    Key: {
      address,
    },
  };
  return dynamoClient.get(params).promise();
};

const updateNonce = (address: any) => {
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

const validateSig = async (address: any, signature: any, nonce: any) => {
  const message = `Welcome message, nonce: ${nonce}`;
  const hash = web3.utils.sha3(message);
  const signing_address = await web3.eth.accounts.recover(hash, signature);
  return signing_address.toLowerCase() === address.toLowerCase();
};

const getIdToken = (address: any) => {
  const param: any = {
    IdentityPoolId: process.env.IDENTITY_POOL_ID,
    Logins: {},
  };
  param.Logins[process.env.DEVELOPER_PROVIDER_NAME!] = address;
  return cognitoidentity.getOpenIdTokenForDeveloperIdentity(param).promise();
};

const getCredentials = (identityId: any, cognitoOpenIdToken: any) => {
  const params: any = {
    IdentityId: identityId,
    Logins: {},
  };
  params.Logins['cognito-identity.amazonaws.com'] = cognitoOpenIdToken;
  return cognitoidentity.getCredentialsForIdentity(params).promise();
};
