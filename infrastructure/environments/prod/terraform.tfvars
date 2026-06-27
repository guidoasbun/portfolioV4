aws_region   = "us-east-1"
project_name = "portfolio"
environment  = "prod"
domain_name  = "example.com"  # TODO: Replace with your actual domain

# HTTPS certificate for the ALB — must be a validated ACM cert in the same region
certificate_arn = "arn:aws:acm:us-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000" # TODO: Replace with your ACM certificate ARN

# GitHub repository for OIDC trust (format: org/repo)
github_repo = "your-org/your-repo" # TODO: Replace with your GitHub org/repo
