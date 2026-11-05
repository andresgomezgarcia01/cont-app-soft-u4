locals {
  bucket_purposes = toset(["web", "ingest"])
}

resource "aws_s3_bucket" "buckets" {
  for_each = local.bucket_purposes

  bucket        = "${local.name_prefix}-${each.key}-${local.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "buckets" {
  for_each = aws_s3_bucket.buckets

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "buckets" {
  for_each = aws_s3_bucket.buckets

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.buckets["web"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.buckets["web"].arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.web.arn }
      }
    }]
  })

  # Evita enviar a la vez estos dos cambios del bucket, que S3 puede rechazar por conflicto.
  depends_on = [aws_s3_bucket_public_access_block.buckets]
}

resource "aws_s3_bucket_notification" "ingest" {
  bucket = aws_s3_bucket.buckets["ingest"].id

  lambda_function {
    lambda_function_arn = aws_lambda_function.functions["loader"].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "incoming/"
    filter_suffix       = ".csv"
  }

  # S3 valida el destino al crear la notificación y lo rechaza si aún no puede invocarlo.
  depends_on = [aws_lambda_permission.s3_invoke_loader]
}
