.PHONY: build-api
build-api:
	@echo "Building cloud API application..."
	cd cloud/app/api && npm i && npm run build

.PHONY: build-cognito
build-cognito:
	@echo "Building cloud Cognito application..."
	cd cloud/app/cognito && npm i && npm run build

.PHONY: deploy-infra
deploy-infra: build-api build-cognito
	@echo "Deploying cloud infrastructure..."
	cd cloud/infra && cdk synth && cdk deploy

.PHONY: run-api
run-api:
	@echo "Running cloud API..."
	cd cloud/app/api && npm i && npm run start

.PHONY: run-frontend
run-frontend:
	@echo "Running frontend Next.js application..."
	cd client/web-app && npm i && npm run dev

# Help command
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  build-api       - Build the cloud API application"
	@echo "  deploy-infra    - Deploy cloud infrastructure using CDK"
	@echo "  run-api         - Run the cloud API server"
	@echo "  run-frontend    - Run the frontend Next.js application"
	@echo "  help            - Display this help message" 