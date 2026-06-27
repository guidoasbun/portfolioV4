variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for ECR and CloudWatch configuration"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "cpu" {
  description = "CPU units for the Fargate task (1024 = 1 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory (MiB) for the Fargate task"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of ECS tasks running"
  type        = number
  default     = 1
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets for ECS tasks"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ID of the ECS tasks security group"
  type        = string
}

variable "alb_target_group_arn" {
  description = "ARN of the ALB target group to register ECS tasks with"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for task role policy"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 assets bucket for task role policy"
  type        = string
}

variable "secret_arns" {
  description = "List of Secrets Manager secret ARNs for task role policy"
  type        = list(string)
}

variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool for task role policy"
  type        = string
}

variable "image_tag" {
  description = "Container image tag. Defaults to 'initial' for first deploy; CI/CD overrides with Git commit SHA."
  type        = string
  default     = "initial"
}
