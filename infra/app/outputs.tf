output "site_url" {
  description = "URL del sitio web."
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "api_url" {
  description = "URL base de la API, sin barra final."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "web_bucket_name" {
  description = "Nombre del bucket del sitio web."
  value       = aws_s3_bucket.buckets["web"].bucket
}

output "ingest_bucket_name" {
  description = "Nombre del bucket de ingesta."
  value       = aws_s3_bucket.buckets["ingest"].bucket
}

output "cloudfront_distribution_id" {
  description = "ID de la distribución de CloudFront, necesario para invalidar su caché."
  value       = aws_cloudfront_distribution.web.id
}
