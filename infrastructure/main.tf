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
# Route 53 Zone (data source - already exists in your account)
################################################################################

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

################################################################################
# ACM Certificate (covers apex + www, validated via DNS)
################################################################################

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Name = "${var.project_name}-${var.environment}-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

################################################################################
# Networking Module
################################################################################

module "networking" {
  source = "./modules/networking"

  project_name    = var.project_name
  environment     = var.environment
  certificate_arn = aws_acm_certificate_validation.main.certificate_arn
}

################################################################################
# DNS Records (A records pointing domain → ALB)
################################################################################

module "dns" {
  source = "./modules/dns"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name
  alb_dns_name = module.networking.alb_dns_name
  alb_zone_id  = module.networking.alb_zone_id
}

################################################################################
# Storage Module
################################################################################

module "storage" {
  source = "./modules/storage"

  project_name    = var.project_name
  environment     = var.environment
  allowed_origins = ["https://${var.domain_name}", "https://www.${var.domain_name}"]
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
  alb_listener_arn     = module.networking.alb_listener_arn

  dynamodb_table_arn    = module.storage.dynamodb_table_arn
  s3_bucket_arn         = module.storage.s3_bucket_arn
  secret_arns           = module.secrets.all_secret_arns
  cognito_user_pool_arn = module.auth.user_pool_arn
}

################################################################################
# CI/CD Module
################################################################################

module "cicd" {
  source = "./modules/cicd"

  project_name = var.project_name
  environment  = var.environment

  ecr_repository_arn     = module.compute.ecr_repository_arn
  ecs_cluster_arn        = module.compute.cluster_arn
  ecs_service_arn        = module.compute.service_arn
  secret_arns            = module.secrets.all_secret_arns
  task_execution_role_arn = module.compute.task_execution_role_arn
  task_role_arn          = module.compute.task_role_arn

  github_org  = split("/", var.github_repo)[0]
  github_repo = split("/", var.github_repo)[1]
}
