package frontend

import (
	"fullstack-webapp-template/common"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/jsii-runtime-go"
	"github.com/datasprayio/open-next-cdk/opennextcdk"
)

func AddInfra(stack awscdk.Stack, env common.Env) {
	next := opennextcdk.NewNextjs(stack, jsii.String("frontend"), &opennextcdk.NextjsProps{
		NextJsPath: jsii.String("../src/frontend"),
	})

	// Output the API URL
	awscdk.NewCfnOutput(stack, jsii.String("app-url"), &awscdk.CfnOutputProps{
		Value:       next.Url(),
		Description: jsii.String("Frontend URL"),
	})
}
