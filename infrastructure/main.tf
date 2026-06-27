terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

################################################################################
# Networking Module
################################################################################

module "networking" {
  source = "./modules/networking"

  project_name    = var.project_name
  environment     = var.environment
  certificate_arn = var.certificate_arn
}

################################################################################
# Storage Module
################################################################################

module "storage" {
  source = "./modules/storage"

  project_name = var.project_name
  environment  = var.environment
}

################################################################################
# Auth Module
################################################################################

module "auth" {
  source = "./modules/auth"

  project_name = var.project_name
  environment  = var.environment
}

################################################################################
# Secrets Module
################################################################################

module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment
}

################################################################################
# Compute Module
################################################################################

module "compute" {
  source = "./modules/compute"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  alb_target_group_arn  = module.networking.alb_target_group_arn

  dynamodb_table_arn    = module.storage.dynamodb_table_arn
  s3_bucket_arn         = module.storage.s3_bucket_arn
  secret_arns           = module.secrets.all_secret_arns
  cognito_user_pool_arn = module.auth.user_pool_arn
}
