locals {
  api_routes = toset(["GET /items", "GET /items/{id}"])
}

resource "aws_apigatewayv2_api" "api" {
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins  = var.cors_allow_origins
    allow_methods  = ["GET", "OPTIONS"]
    allow_headers  = ["x-api-key"]
    expose_headers = ["x-request-id", "apigw-requestid"]
  }
}

resource "aws_apigatewayv2_authorizer" "key" {
  api_id                            = aws_apigatewayv2_api.api.id
  name                              = "${local.name_prefix}-authorizer"
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.functions["authorizer"].invoke_arn
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  identity_sources                  = ["$request.header.x-api-key"]
  authorizer_result_ttl_in_seconds  = 300
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.functions["api"].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "items" {
  for_each = local.api_routes

  api_id             = aws_apigatewayv2_api.api.id
  route_key          = each.key
  target             = "integrations/${aws_apigatewayv2_integration.api.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.key.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 5
    throttling_burst_limit = 10
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      service                = "gateway"
      message                = "request_completed"
      correlation_id         = "$context.requestId"
      request_time           = "$context.requestTime"
      route                  = "$context.routeKey"
      status                 = "$context.status"
      response_latency_ms    = "$context.responseLatency"
      integration_status     = "$context.integrationStatus"
      integration_latency_ms = "$context.integrationLatency"
      authorizer_error       = "$context.authorizer.error"
      integration_error      = "$context.integrationErrorMessage"
      lambda_request_id      = "$context.integration.requestId"
    })
  }
}
