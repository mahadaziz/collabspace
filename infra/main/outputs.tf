output "ec2_instance_id" {
  description = "Use with `aws ssm start-session --target <id>` to get a shell on the host."
  value       = aws_instance.app.id
}

output "ec2_public_ip" {
  description = "Static EIP attached to the instance."
  value       = aws_eip.app.public_ip
}

output "domain" {
  description = "Apex domain pointing at the EIP."
  value       = var.domain
}

output "rds_endpoint" {
  description = "RDS instance address (host only, no port)."
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS instance port."
  value       = aws_db_instance.main.port
}

output "ecr_web_repository_url" {
  description = "Push the Next.js image here."
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_sync_repository_url" {
  description = "Push the y-websocket sync image here."
  value       = aws_ecr_repository.sync.repository_url
}

output "alerts_topic_arn" {
  description = "SNS topic for CloudWatch alarms. Confirm the email subscription via the link AWS sends after first apply."
  value       = aws_sns_topic.alerts.arn
}

output "ssm_parameter_paths" {
  description = "All SSM parameters. Placeholder ones must be populated before first deploy."
  value = {
    database_url         = aws_ssm_parameter.database_url.name
    db_master_password   = aws_ssm_parameter.db_master_password.name
    nextauth_url         = aws_ssm_parameter.nextauth_url.name
    next_public_sync_url = aws_ssm_parameter.next_public_sync_url.name
    auth_secret          = aws_ssm_parameter.auth_secret.name
    auth_github_id       = aws_ssm_parameter.auth_github_id.name
    auth_github_secret   = aws_ssm_parameter.auth_github_secret.name
  }
}
