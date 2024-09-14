.PHONY: build scripts update clean lint

build:
	mkdir -p bin
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap ./api

update:
	go get -v -u ./...
	go mod tidy

clean:
	rm -f ./bin/*

lint:
	golangci-lint run ./...
