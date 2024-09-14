package api

import (
	"fmt"

	"fullstack-webapp-template/common"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigateway"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslogs"
	"github.com/aws/jsii-runtime-go"
)

// Lambda configurations
const (
	MaxAPILambdaTimeout = 35  // seconds
	MaxLambdaTimeout    = 900 // seconds
	MaxLambdaStorage    = 10  // GiB
	MemorySize          = 3008
)

func AddResources(stack awscdk.Stack, env common.Env) {
	// Create a Lambda function Role
	role := awsiam.NewRole(stack, jsii.String("lambda-role"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(jsii.String("lambda.amazonaws.com"), nil),
		InlinePolicies: &map[string]awsiam.PolicyDocument{
			"logging-policy": awsiam.NewPolicyDocument(&awsiam.PolicyDocumentProps{
				Statements: &[]awsiam.PolicyStatement{
					awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
						Effect: awsiam.Effect_ALLOW,
						Actions: jsii.Strings(
							"logs:CreateLogGroup",
							"logs:CreateLogStream",
							"logs:DescribeLogStreams",
							"logs:PutLogEvents",
						),
						Resources: jsii.Strings("*"),
					}),
				},
			}),
		},
	})

	// Create a Lambda function
	lambdaName := fmt.Sprintf("%s-%s-api-lambda", common.ApplicationName, env.Name)
	lambdaFn := awslambda.NewFunction(stack, jsii.String("api-lambda"), &awslambda.FunctionProps{
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Code:         awslambda.Code_FromAsset(jsii.String("../src/backend/bin"), nil),
		Handler:      jsii.String("bootstrap"),
		Architecture: awslambda.Architecture_ARM_64(),
		MemorySize:   jsii.Number(MemorySize),
		Role:         role,
		Environment: &map[string]*string{
			"REGION": jsii.String(env.Region),
			"ENV":    jsii.String(env.Name),
		},
		FunctionName:         jsii.String(lambdaName),
		EphemeralStorageSize: awscdk.Size_Gibibytes(jsii.Number(MaxLambdaStorage)),
	})

	// Creates log group for Lambda function
	awslogs.NewLogGroup(stack, jsii.String("api-lambdalog-group"), &awslogs.LogGroupProps{
		LogGroupName:  jsii.String(fmt.Sprintf("/aws/lambda/%s", lambdaName)),
		RemovalPolicy: awscdk.RemovalPolicy_DESTROY,
		Retention:     awslogs.RetentionDays_THREE_MONTHS,
	})

	// Creates log group for API Gateway access logs
	// https://www.alexdebrie.com/posts/api-gateway-access-logs/
	apiLogGroup := awslogs.NewLogGroup(stack, jsii.String("api-gw-log-group"), &awslogs.LogGroupProps{
		LogGroupName:  jsii.Sprintf("/aws/api-gateway/%s-%s-api-gw", common.ApplicationName, env.Name),
		RemovalPolicy: awscdk.RemovalPolicy_DESTROY,
		Retention:     awslogs.RetentionDays_THREE_MONTHS,
	})

	// Create an API Gateway
	apiName := fmt.Sprintf("%s-%s-api-gw", common.ApplicationName, env.Name)
	api := awsapigateway.NewRestApi(stack, jsii.String("api-gw"), &awsapigateway.RestApiProps{
		RestApiName: jsii.String(apiName),
		Deploy:      jsii.Bool(true),
		Description: jsii.Sprintf("API Gateway for %s (%s)", common.ApplicationName, env.Name),
		DeployOptions: &awsapigateway.StageOptions{
			StageName:            jsii.String(env.Name),
			MetricsEnabled:       jsii.Bool(true),
			AccessLogFormat:      awsapigateway.AccessLogFormat_JsonWithStandardFields(nil),
			AccessLogDestination: awsapigateway.NewLogGroupLogDestination(apiLogGroup),
			TracingEnabled:       jsii.Bool(true),
		},
	})

	// Grant API Gateway permission to invoke the Lambda function
	lambdaFn.GrantInvoke(awsiam.NewServicePrincipal(jsii.String("apigateway.amazonaws.com"), nil))

	// Create a catch-all proxy resource
	api.Root().AddProxy(&awsapigateway.ProxyResourceOptions{
		// DefaultCorsPreflightOptions: &awsapigateway.CorsOptions{},
		DefaultIntegration: awsapigateway.NewLambdaIntegration(lambdaFn, &awsapigateway.LambdaIntegrationOptions{}),
		AnyMethod:          jsii.Bool(true),
	})

	// Output the API URL
	awscdk.NewCfnOutput(stack, jsii.String("APIUrl"), &awscdk.CfnOutputProps{
		Value:       api.Url(),
		Description: jsii.String("API Gateway URL"),
	})
}
