variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
}

variable "allowed_origins" {
  description = "List of allowed origins for S3 CORS configuration (e.g. [\"https://example.com\"])"
  type        = list(string)

  validation {
    condition     = length(var.allowed_origins) > 0 && !contains(var.allowed_origins, "*")
    error_message = "allowed_origins must contain at least one explicit origin and must not use wildcard \"*\"."
  }
}
