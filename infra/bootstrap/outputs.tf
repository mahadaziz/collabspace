output "state_bucket_name" {
  description = "S3 bucket holding Terraform state for the main module. Reference this as backend.bucket in infra/main."
  value       = aws_s3_bucket.tfstate.id
}

output "state_lock_table_name" {
  description = "DynamoDB table for Terraform state locking. Reference as backend.dynamodb_table in infra/main."
  value       = aws_dynamodb_table.tfstate_lock.name
}

output "deploy_role_arn" {
  description = "IAM role ARN that GitHub Actions assumes via OIDC. Add to the GitHub repo as variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.deploy.arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub Actions OIDC provider. Useful if other roles in this account need to trust the same provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "region" {
  description = "Region these resources live in. Reference as backend.region in infra/main."
  value       = var.region
}
