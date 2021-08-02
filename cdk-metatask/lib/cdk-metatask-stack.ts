import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cognito from "@aws-cdk/aws-cognito";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as iam from "@aws-cdk/aws-iam";
import * as ddb from "@aws-cdk/aws-dynamodb";

export class CdkMetataskStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

 // The code that defines your stack goes here

 const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
  allowUnauthenticatedIdentities: false, 
  identityPoolName: "MetaMaskIdentityPool",
  developerProviderName: "developer_provider_name"
});

const authRole = new iam.Role(this, "CognitoAuthorizedRole", {
  assumedBy: new iam.FederatedPrincipal(
    "cognito-identity.amazonaws.com",
    {
      StringEquals: {
        "cognito-identity.amazonaws.com:aud": identityPool.ref,
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "authenticated",
      },
    },
    "sts:AssumeRoleWithWebIdentity"
  ),
  
});

authRole.addToPolicy(
  new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "execute-api:Invoke",
        "lambda:InvokeFunction",
        "cognito-identity:*",
      ],
      resources: ["*"],
  })
);

const unAuthRole = new iam.Role(this, "CognitoUnauthorizedRole", {
  assumedBy: new iam.FederatedPrincipal(
    "cognito-identity.amazonaws.com",
    {
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "unauthenticated",
      },
    },
    "sts:AssumeRoleWithWebIdentity"
  ),
  
});

unAuthRole.addToPolicy(
  new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: [
        "lambda:InvokeFunction",
        "cognito-identity:*",
      ],
      resources: ["*"],
  })
);

new cognito.CfnIdentityPoolRoleAttachment(
  this,
  "IdentityPoolRoleAttachment",
  {
    identityPoolId: identityPool.ref,
    roles: { authenticated: authRole.roleArn, unauthenticated : unAuthRole.roleArn },
  }
);

const api = new apigw.RestApi(this, 'authAPI', {
  restApiName: 'authenticationAPIs',
  defaultCorsPreflightOptions: {
    allowOrigins: apigw.Cors.ALL_ORIGINS,
    allowMethods: apigw.Cors.ALL_METHODS, 
  },
  deploy: true
});

const authLayers = new lambda.LayerVersion(
  this,
  "metamaskLayer",
  {
    layerVersionName: "metamaskLayer",
    code: lambda.Code.fromAsset("lambda-layer"),
  }
);

const nonceLambda = new lambda.Function(this, "nonceLambda", {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset("lambda/nonce"),
  timeout: cdk.Duration.seconds(60),
  layers: [authLayers]
});

const getnonce = api.root.addResource('getnonce');
const getAllIntegration = new apigw.LambdaIntegration(nonceLambda);
getnonce.addMethod('GET', getAllIntegration);

const signupLambda = new lambda.Function(this, "signupLambda", {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset("lambda/signup"),
  timeout: cdk.Duration.seconds(60),
  layers: [authLayers]
});

const signup = api.root.addResource('signup');
const signupIntegration = new apigw.LambdaIntegration(signupLambda);
signup.addMethod('POST', signupIntegration);

const loginLambda = new lambda.Function(this, "loginLambda", {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset("lambda/login"),
  timeout: cdk.Duration.seconds(60),
  layers: [authLayers],
  environment: {
    IDENTITY_POOL_ID: identityPool.ref,
    DEVELOPER_PROVIDER_NAME: identityPool.developerProviderName!
  }
});

const loginPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ["cognito-identity:*"],
  resources: ["*"]
});

loginLambda.addToRolePolicy(loginPolicy);

const login = api.root.addResource('login');
const loginIntegration = new apigw.LambdaIntegration(loginLambda);
login.addMethod('POST', loginIntegration);

const userTable = new ddb.Table(this, 'CDKMETAMASKUSERTable', {
  partitionKey: {
    name: 'address',
    type: ddb.AttributeType.STRING,
  }
});

userTable.grantFullAccess(nonceLambda)
nonceLambda.addEnvironment('USER_TABLE', userTable.tableName);

userTable.grantFullAccess(signupLambda)
signupLambda.addEnvironment('USER_TABLE', userTable.tableName);

userTable.grantFullAccess(loginLambda)
loginLambda.addEnvironment('USER_TABLE', userTable.tableName);
}
}
