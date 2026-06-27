variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
}

variable "ecr_repository_arn" {
  description = "ARN of the ECR repository for image push permissions"
  type        = string
}

variable "ecs_cluster_arn" {
  description = "ARN of the ECS cluster for deploy permissions"
  type        = string
}

variable "ecs_service_arn" {
  description = "ARN of the ECS service for deploy permissions"
  type        = string
}

variable "secret_arns" {
  description = "List of Secrets Manager secret ARNs for read permissions"
  type        = list(string)
}

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without org prefix)"
  type        = string
}

variable "task_execution_role_arn" {
  description = "ARN of the ECS task execution role (for iam:PassRole)"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role (for iam:PassRole)"
  type        = string
}
