import * as AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB();
const cognitoidentity = new AWS.CognitoIdentity();
var documentClient = new AWS.DynamoDB.DocumentClient();
// const dynamoClient = new AWS.DynamoDB.DocumentClient();
const crypto = require('crypto');
const Web3 = require('web3');

const web3 = new Web3(
  new Web3.providers.HttpProvider(
    'https://mainnet.infura.io/v3/4b75835b483b4ad1818bb6dd981ee25a'
  )
);

const getNonce = (address: string) => {
    var params: any = {
      TableName: process.env.USER_TABLE,
      Key: {
        address,
      },
    };
    return documentClient.get(params).promise();
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
    return documentClient.update(params).promise();
  };
  
  const validateSig = async (address: any, signature: any, nonce: any) => {
    const message = `Welcome message, nonce: ${nonce}`;
    const hash = web3.utils.sha3(message);
    const signing_address = await web3.eth.accounts.recover(hash, signature);
    console.log("signing_address", signing_address.toLowerCase())
    console.log("signing_address",address.toLowerCase())
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

module.exports = {
  getIdToken,
  getNonce,
  getCredentials,
  updateNonce,
  validateSig,
};