output "dynamodb_table_name" {
  description = "Name of the DynamoDB portfolio table"
  value       = aws_dynamodb_table.portfolio.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB portfolio table"
  value       = aws_dynamodb_table.portfolio.arn
}

output "s3_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = aws_s3_bucket.assets.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 assets bucket"
  value       = aws_s3_bucket.assets.arn
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 assets bucket"
  value       = aws_s3_bucket.assets.bucket_regional_domain_name
}
