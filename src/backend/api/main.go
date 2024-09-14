package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/amirhajimirsadeghi/util-go/logger"
	"github.com/aquasecurity/lmdrouter"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

var router *lmdrouter.Router

func init() {
	logger.Initialize()
	router = lmdrouter.NewRouter("/api", loggerMiddleware)

	router.Route("GET", "/", List)
}

type ListInput struct {
	Offset string `lambda:"query.offset"`
	Limit  int    `lambda:"query.limit"`
}

func List(ctx context.Context, req events.APIGatewayProxyRequest) (res events.APIGatewayProxyResponse, err error) {
	var input ListInput
	err = lmdrouter.UnmarshalRequest(req, false, &input)
	if err != nil {
		return lmdrouter.HandleError(err)
	}
	return lmdrouter.MarshalResponse(http.StatusOK, nil, []string{fmt.Sprintf("Offset: %s, Limit: %d", input.Offset, input.Limit)})
}

func loggerMiddleware(next lmdrouter.Handler) lmdrouter.Handler {
	return func(ctx context.Context, req events.APIGatewayProxyRequest) (res events.APIGatewayProxyResponse, err error) {
		logger.Infow("Request", "req", req)
		res, err = next(ctx, req)
		logger.Infow("Response", "res", res, "err", err)
		return res, err
	}
}

func main() {
	lambda.Start(router.Handler)
}
