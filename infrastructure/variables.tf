variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project, used for resource naming and tagging"
  type        = string
  default     = "portfolio"
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
  default     = "prod"
}



variable "github_repo" {
  description = "GitHub repository in format 'org/repo'"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$", var.github_repo))
    error_message = "github_repo must be in the format 'org/repo' (e.g. 'myorg/my-repo')."
  }
}

variable "domain_name" {
  description = "Public domain name for the portfolio site (e.g. example.com)"
  type        = string
}
