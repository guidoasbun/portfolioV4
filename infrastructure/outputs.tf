# Root module outputs

output "aws_region" {
  description = "AWS region used for deployment"
  value       = var.aws_region
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "certificate_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.networking.alb_dns_name
}

output "site_url" {
  description = "Public URL of the portfolio site"
  value       = "https://${var.domain_name}"
}

output "www_url" {
  description = "Public URL of the portfolio site (www)"
  value       = "https://www.${var.domain_name}"
}
