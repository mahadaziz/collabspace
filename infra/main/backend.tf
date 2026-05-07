terraform {
  backend "s3" {
    bucket         = "collabspace-tfstate-db7018bb"
    key            = "main/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "collabspace-tfstate-locks"
    encrypt        = true
  }
}
