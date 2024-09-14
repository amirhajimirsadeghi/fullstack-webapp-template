prepare-backend:
	cd src/backend && make

prepare-frontend:
	cd src/frontend && npm i

deploy-dev: prepare-backend prepare-frontend
	export DEVELOPMENT=true && cd infra && cdk synth --quiet && cdk deploy --all

deploy: prepare-backend prepare-frontend
	cd infra && cdk synth --quiet && cdk deploy --all

clean:
	cd src/backend && make clean
	cd src/frontend && rm -rf .open-next && rm -rf .next

lint:
	cd src/backend && make lint
	cd src/frontend && npm run lint
	cd infra && golangci-lint run ./...
