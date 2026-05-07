provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
      Module    = "bootstrap"
    }
  }
}

data "aws_caller_identity" "current" {}

resource "random_id" "state_suffix" {
  byte_length = 4
}

locals {
  state_bucket_name = "${var.project_name}-tfstate-${random_id.state_suffix.hex}"
  lock_table_name   = "${var.project_name}-tfstate-locks"
  account_id        = data.aws_caller_identity.current.account_id
}
