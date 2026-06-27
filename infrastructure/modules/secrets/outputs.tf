output "dynamodb_config_secret_arn" {
  description = "ARN of the DynamoDB configuration secret"
  value       = aws_secretsmanager_secret.dynamodb_config.arn
}

output "dynamodb_config_secret_name" {
  description = "Name of the DynamoDB configuration secret"
  value       = aws_secretsmanager_secret.dynamodb_config.name
}

output "cognito_config_secret_arn" {
  description = "ARN of the Cognito configuration secret"
  value       = aws_secretsmanager_secret.cognito_config.arn
}

output "cognito_config_secret_name" {
  description = "Name of the Cognito configuration secret"
  value       = aws_secretsmanager_secret.cognito_config.name
}

output "s3_config_secret_arn" {
  description = "ARN of the S3 configuration secret"
  value       = aws_secretsmanager_secret.s3_config.arn
}

output "s3_config_secret_name" {
  description = "Name of the S3 configuration secret"
  value       = aws_secretsmanager_secret.s3_config.name
}

output "api_keys_secret_arn" {
  description = "ARN of the API keys secret"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "api_keys_secret_name" {
  description = "Name of the API keys secret"
  value       = aws_secretsmanager_secret.api_keys.name
}

output "all_secret_arns" {
  description = "List of all secret ARNs (for IAM policy attachment)"
  value = [
    aws_secretsmanager_secret.dynamodb_config.arn,
    aws_secretsmanager_secret.cognito_config.arn,
    aws_secretsmanager_secret.s3_config.arn,
    aws_secretsmanager_secret.api_keys.arn,
  ]
}
