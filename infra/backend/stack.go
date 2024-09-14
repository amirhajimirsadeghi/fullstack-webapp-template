package backend

import (
	"fullstack-webapp-template/backend/api"
	"fullstack-webapp-template/common"

	"github.com/aws/aws-cdk-go/awscdk/v2"
)

func AddInfra(stack awscdk.Stack, env common.Env) {
	api.AddResources(stack, env)
}
