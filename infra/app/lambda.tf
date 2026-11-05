locals {
  functions = {
    api = {
      runtime     = "nodejs24.x"
      memory_size = 256
      timeout     = 10
    }
    loader = {
      runtime     = "nodejs24.x"
      memory_size = 512
      timeout     = 300
    }
    authorizer = {
      runtime     = "python3.13"
      memory_size = 128
      timeout     = 5
    }
  }

  function_environments = {
    api = {
      TABLE_NAME = aws_dynamodb_table.items.name
    }
    loader = {
      TABLE_NAME         = aws_dynamodb_table.items.name
      INGEST_BUCKET_NAME = aws_s3_bucket.buckets["ingest"].bucket
      WRITE_RATE_WCU     = "20"
    }
    authorizer = {
      API_KEY_PARAMETER_NAME = aws_ssm_parameter.api_key.name
    }
  }
}

data "archive_file" "placeholders" {
  for_each = local.functions

  type        = "zip"
  source_dir  = "${path.module}/placeholder/${each.key}"
  output_path = "${path.module}/build/${each.key}.zip"
}

resource "aws_lambda_function" "functions" {
  for_each = local.functions

  function_name    = "${local.name_prefix}-${each.key}"
  role             = aws_iam_role.functions[each.key].arn
  runtime          = each.value.runtime
  memory_size      = each.value.memory_size
  timeout          = each.value.timeout
  handler          = "handler.handler"
  filename         = data.archive_file.placeholders[each.key].output_path
  source_code_hash = data.archive_file.placeholders[each.key].output_base64sha256

  environment {
    variables = local.function_environments[each.key]
  }

  logging_config {
    log_format            = "JSON"
    log_group             = aws_cloudwatch_log_group.functions[each.key].name
    application_log_level = "INFO"
    # Las líneas START, END y REPORT son de nivel INFO y sirven para diagnosticar timeouts.
    system_log_level = "INFO"
  }

  # El código real lo despliega un pipeline aparte, no Terraform.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  # Sin este permiso, la primera invocación no podría escribir en su grupo de logs.
  depends_on = [aws_iam_role_policy.functions]
}

resource "aws_lambda_function_event_invoke_config" "loader" {
  function_name                = aws_lambda_function.functions["loader"].function_name
  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600
}

resource "aws_lambda_permission" "s3_invoke_loader" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["loader"].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.buckets["ingest"].arn
}

resource "aws_lambda_permission" "api_gateway_invoke_api" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["api"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_invoke_authorizer" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["authorizer"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/authorizers/${aws_apigatewayv2_authorizer.key.id}"
}
