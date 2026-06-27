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
