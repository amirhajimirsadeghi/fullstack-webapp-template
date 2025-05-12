import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const appName = "template"
export const domain = "app.template.com"

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Create secrets
    const secretName = `${appName}-idp-client-credentials`;
    new Secret(this, 'idp-client-credentials', {
      secretName,
    });

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, 'user-pool', {
      userPoolName: `${appName}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
        profilePicture: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    // Create Lambda hook handler
    const cognitoHookHandler = new lambda.Function(this, 'cognito-hook-handler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../app/cognito/dist')),
      memorySize: 1024,
      environment: {
      },
    });
    // Need to be able to list users to check if they already exist
    cognitoHookHandler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cognito-idp:ListUsers'],
      resources: ['*']
    }));

    // Add the hook handler to the user pool
    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, cognitoHookHandler);

    const idpClientCredentials = Secret.fromSecretNameV2(this, 'idp-client-credentials-values', secretName)

    // If you're deploying this for the first time, comment out the following code and run `cdk deploy`
    // We need the secret to be created first, so we can reference the secret values in the following code
    const googleIdp = new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
      userPool: userPool,
      clientId: idpClientCredentials.secretValueFromJson('googleClientID').unsafeUnwrap(),
      clientSecret: idpClientCredentials.secretValueFromJson('googleClientSecret').unsafeUnwrap(),
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        fullname: cognito.ProviderAttribute.GOOGLE_NAME,
        profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        custom: {
          email_verified: cognito.ProviderAttribute.other('email_verified'),
        }
      },
      scopes: [
        cognito.OAuthScope.OPENID.scopeName,
        cognito.OAuthScope.EMAIL.scopeName,
        cognito.OAuthScope.PROFILE.scopeName,
      ],
    });
    userPool.registerIdentityProvider(googleIdp);

    // It's good practice to add a Cognito Domain to your User Pool for federation
    userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: appName,
      },
    });

    // Create Cognito User Pool Client
    const localUserPoolClientProps: cognito.UserPoolClientProps = {
      userPool,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      // Update OAuth settings for the client
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO, // To keep username/password sign-in
        cognito.UserPoolClientIdentityProvider.GOOGLE, // Add Google
      ],
      oAuth: {
        flows: {
          authorizationCodeGrant: true, // Recommended for web apps
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [`http://localhost:3000/`],
        logoutUrls: [`http://localhost:3000/auth`],
      },
    }
    const localUserPoolClient = new cognito.UserPoolClient(this, 'local-user-pool-client', localUserPoolClientProps)
    localUserPoolClient.node.addDependency(googleIdp);


    const deployedUserPoolClientProps: cognito.UserPoolClientProps = {
      ...localUserPoolClientProps,
      oAuth: {
        flows: {
          authorizationCodeGrant: true, // Recommended for web apps
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [`https://${domain}/`],
        logoutUrls: [`https://${domain}/auth`],
      },
    }
    const deployedUserPoolClient = new cognito.UserPoolClient(this, 'deployed-user-pool-client', deployedUserPoolClientProps)
    deployedUserPoolClient.node.addDependency(googleIdp);

    // Create Lambda function
    const apiHandler = new lambda.Function(this, 'api-handler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../app/api/dist')),
      memorySize: 1024,
      environment: {
      },
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'api', {
      restApiName: `${appName} API`,
      description: `API for ${appName} application`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Add Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'authorizer', {
      cognitoUserPools: [userPool],
    });

    // Create API Gateway resource and method
    const apiResource = api.root.addResource('api');
    apiResource.addMethod('ANY', new apigateway.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Output important values
    new cdk.CfnOutput(this, 'user-pool-id', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'local-user-pool-client-id', {
      value: localUserPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'deployed-user-pool-client-id', {
      value: deployedUserPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'api-url', {
      value: api.url,
    });
  }
} 