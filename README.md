# Fullstack Webapp Template
This is a template for a fullstack webapp using AWS/CDK/Go Backend/NextJS Frontend. It is a simple template you can use to get started with a fullstack webapp.

# Prerequisites
- Prepare Toolchain
  - Install and Configure [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
  - Install and Configure [Go](https://golang.org/doc/install)
  - Install and Configure [NodeJS](https://nodejs.org/en/download/)
  - Install and Configure [NPM](https://www.npmjs.com/get-npm)
- Manually need to enable logging for API Gateway (once per aws account)
   1. Create Role for API Gateway to write logs to CloudWatch
      1. Visit https://us-east-1.console.aws.amazon.com/iam/home#/roles
      2. Click "Create role"
      3. Select "API Gateway" as the service that will use this role
      4. Click "Next: Permissions"
      5. Name the role `APIGatewayCloudwatchRole`
      6. Click "Create role"
   2. Add role to API GW settings
      1. Copy the role arn for `APIGatewayCloudwatchRole`
      2. Visit https://us-east-1.console.aws.amazon.com/apigateway/main/settings
      3. Click `Edit` in logging section
      4. Paste the arn
      5. Click `Save changes`

# Getting Started
1. Clone the repository
2. Update the config file in `infra/common/config.go` with your desired values
3. Begin development
   1. Add your api code in `src/backend/api`
   2. Add your frontend code in `src/frontend`
4. Run `make deploy` to deploy the application CICD. (After this step, ever push to the main branch will trigger a deployment)
   1. (One time only) Confirm the github connection on AWS Codepipeline for this pipeline
      1. Visit [Connections Page](https://us-east-1.console.aws.amazon.com/codesuite/settings/connections)
      2. Click the connection marked as pending
      3. Click Update Pending
      4. Login to github and authorize the connection
5. Iterate and Run `make deploy-dev` to deploy just the application stack (no cicd pipeline) to a dev env for testing
