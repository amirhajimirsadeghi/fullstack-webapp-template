package main

import (
	"fullstack-webapp-template/backend"
	"fullstack-webapp-template/common"
	"fullstack-webapp-template/frontend"
	"fullstack-webapp-template/pipeline"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/jsii-runtime-go"
)

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	// If the application is running in a development environment, create the backend and frontend stacks.
	// Otherwise, create the pipeline stack which will take care of CICD on push
	if common.IsDevEnv() {
		env := common.NewDevEnv()
		stack := awscdk.NewStack(app, jsii.Sprintf("%s-%s", common.ApplicationName, env.Name), &awscdk.StackProps{Env: common.CDKEnv(&env)})
		backend.AddInfra(stack, env)
		frontend.AddInfra(stack, env)
	} else {
		stack := awscdk.NewStack(app, jsii.Sprintf("%s-pipeline", common.ApplicationName), &awscdk.StackProps{Env: common.CDKEnv(nil)})
		pipeline.AddInfra(stack)
	}

	app.Synth(nil)
}
