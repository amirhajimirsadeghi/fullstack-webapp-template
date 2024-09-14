package pipeline

import (
	"fmt"

	"fullstack-webapp-template/backend"
	"fullstack-webapp-template/common"
	"fullstack-webapp-template/frontend"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscodestarconnections"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/pipelines"
	"github.com/aws/jsii-runtime-go"
)

func AddInfra(stack awscdk.Stack) {
	connection := awscodestarconnections.NewCfnConnection(stack, jsii.String("Conn"), &awscodestarconnections.CfnConnectionProps{
		ConnectionName: jsii.String(common.ApplicationName + "-Conn"),
		ProviderType:   jsii.String("GitHub"),
	})
	codeBuildRole := awsiam.NewRole(stack, jsii.String("PipelineRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(jsii.String("codebuild.amazonaws.com"), nil),
		InlinePolicies: &map[string]awsiam.PolicyDocument{
			"use-connection": awsiam.NewPolicyDocument(&awsiam.PolicyDocumentProps{
				Statements: &[]awsiam.PolicyStatement{
					awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
						Effect:    awsiam.Effect_ALLOW,
						Actions:   jsii.Strings("codestar-connections:UseConnection"),
						Resources: &[]*string{connection.AttrConnectionArn()},
					}),
				},
			}),
		},
	})
	pipeline := pipelines.NewCodePipeline(stack, jsii.String("Pipeline"), &pipelines.CodePipelineProps{
		PipelineName: jsii.String(fmt.Sprintf("%s-Pipeline", common.ApplicationName)),
		Synth: pipelines.NewCodeBuildStep(jsii.String("Synth"), &pipelines.CodeBuildStepProps{
			Input: pipelines.CodePipelineSource_Connection(jsii.String(common.RepoName), jsii.String(common.RepoBranch), &pipelines.ConnectionSourceOptions{
				ConnectionArn: connection.AttrConnectionArn(),
			}),
			Role:                   codeBuildRole,
			PrimaryOutputDirectory: jsii.String("infra/cdk.out"),
			InstallCommands: jsii.Strings(
				// Install Golang
				"cd /root/.goenv && git pull && cd -",
				fmt.Sprintf("goenv install %s", common.GolangVer),
				fmt.Sprintf("goenv global %s", common.GolangVer),
				// Enable go modules
				"go env -w GO111MODULE=on",
				// Install esbuild
				"npm i -g esbuild",
				// Install CDK
				"npm i -g aws-cdk",
			),
			Commands: jsii.Strings(
				// Build backend go code
				"cd src/backend",
				"make",
				"cd ../..",

				// Build fronend nextjs code
				"cd src/frontend",
				"npm i",
				// "npx --yes open-next@latest build",
				"cd ../..",

				// Run CDK synth
				"cd infra",
				"cdk synth",
			),
		}),
	})

	// Add all environment stages
	envs := []common.Env{
		// {Account: common.MainAccountID, Region: common.MainRegion, Name: "qa"},
		{Account: common.MainAccountID, Region: common.MainRegion, Name: "prod"},
	}

	for _, env := range envs {
		stage := awscdk.NewStage(stack, jsii.Sprintf("Stage%s", env.Name), &awscdk.StageProps{Env: common.CDKEnv(&env)})
		stageStack := awscdk.NewStack(stage, jsii.Sprintf("%s-%s", common.ApplicationName, env.Name), &awscdk.StackProps{Env: common.CDKEnv(&env)})

		// Add frontend and backend resources to stage stacks then add it to pipeline
		backend.AddInfra(stageStack, env)
		frontend.AddInfra(stageStack, env)
		pipeline.AddStage(stage, nil)
	}
}
