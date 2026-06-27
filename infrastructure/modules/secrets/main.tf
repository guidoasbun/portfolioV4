################################################################################
# Secrets Manager - Database Configuration
################################################################################

resource "aws_secretsmanager_secret" "dynamodb_config" {
  name        = "${var.project_name}-${var.environment}-dynamodb-config"
  description = "DynamoDB table configuration (table name, region)"

  tags = {
    Name = "${var.project_name}-${var.environment}-dynamodb-config"
  }
}

################################################################################
# Secrets Manager - Cognito Configuration
################################################################################

resource "aws_secretsmanager_secret" "cognito_config" {
  name        = "${var.project_name}-${var.environment}-cognito-config"
  description = "Cognito client configuration (user pool ID, client ID, JWKS URL)"

  tags = {
    Name = "${var.project_name}-${var.environment}-cognito-config"
  }
}

################################################################################
# Secrets Manager - S3 Configuration
################################################################################

resource "aws_secretsmanager_secret" "s3_config" {
  name        = "${var.project_name}-${var.environment}-s3-config"
  description = "S3 bucket configuration (bucket name, region)"

  tags = {
    Name = "${var.project_name}-${var.environment}-s3-config"
  }
}

################################################################################
# Secrets Manager - API Keys
################################################################################

resource "aws_secretsmanager_secret" "api_keys" {
  name        = "${var.project_name}-${var.environment}-api-keys"
  description = "API keys used by the application"

  tags = {
    Name = "${var.project_name}-${var.environment}-api-keys"
  }
}
