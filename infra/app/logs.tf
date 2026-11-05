locals {
  log_retention_days = 7
}

resource "aws_cloudwatch_log_group" "functions" {
  for_each = local.functions

  name              = "/aws/lambda/${local.name_prefix}-${each.key}"
  retention_in_days = local.log_retention_days
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${local.name_prefix}-api"
  retention_in_days = local.log_retention_days
}
