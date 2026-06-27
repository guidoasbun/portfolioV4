bucket         = "portfolio-terraform-state"
key            = "prod/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "portfolio-terraform-locks"
encrypt        = true
