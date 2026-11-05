locals {
  function_statements = {
    api = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:Scan"]
      Resource = aws_dynamodb_table.items.arn
    }]
    loader = [
      {
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.buckets["ingest"].arn}/incoming/*"
      },
      {
        Effect   = "Allow"
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.buckets["ingest"].arn}/reports/*"
      },
      {
        Effect   = "Allow"
        Action   = "dynamodb:BatchWriteItem"
        Resource = aws_dynamodb_table.items.arn
      },
    ]
    # Sin KMS: se asume que la política de la clave aws/ssm autoriza el descifrado vía SSM; falta confirmarlo en AWS.
    authorizer = [{
      Effect   = "Allow"
      Action   = "ssm:GetParameter"
      Resource = aws_ssm_parameter.api_key.arn
    }]
  }
}

resource "aws_iam_role" "functions" {
  for_each = local.functions

  name = "${local.name_prefix}-${each.key}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Solo políticas en línea: el usuario de despliegue no puede adjuntar políticas administradas.
resource "aws_iam_role_policy" "functions" {
  for_each = local.functions

  name = "${local.name_prefix}-${each.key}"
  role = aws_iam_role.functions[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(local.function_statements[each.key], [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.functions[each.key].arn}:*"
    }])
  })
}
