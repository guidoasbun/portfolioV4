terraform {
  backend "s3" {
    # Values provided at init via -backend-config=environments/prod/backend.tfvars
    # bucket         = "..."
    # key            = "..."
    # region         = "..."
    # dynamodb_table = "..."
    encrypt = true
  }
}
