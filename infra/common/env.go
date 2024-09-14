package common

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/jsii-runtime-go"
)

type Env struct {
	Account string
	Region  string
	Name    string
}

func NewDevEnv() Env {
	return Env{
		Account: os.Getenv("CDK_DEFAULT_ACCOUNT"),
		Region:  os.Getenv("CDK_DEFAULT_REGION"),
		Name:    DevEnvName,
	}
}

// CDKEnv returns an awscdk.CDKEnv object based on the provided Env object.
// If the Env object is nil, it will return an awscdk.CDKEnv object based on the default
// AWS account and region.
func CDKEnv(env *Env) *awscdk.Environment {
	if env == nil {
		return &awscdk.Environment{
			Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
			Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
		}
	}
	return &awscdk.Environment{
		Account: jsii.String(env.Account),
		Region:  jsii.String(env.Region),
	}
}

// IsDevEnv returns true if the DEVELOPMENT environment variable is set to "true".
// This is useful for determining if the application is running in a development environment.
func IsDevEnv() bool {
	return os.Getenv("DEVELOPMENT") == "true"
}
