# SSM parameters for application secrets and config.
#
# Two patterns here:
# 1. Values that Terraform knows (DB URL, public URLs) — TF sets them and
#    keeps them in sync on every apply.
# 2. Values that come from outside AWS (NextAuth secret, GitHub OAuth) —
#    TF creates the parameter as a placeholder and ignores subsequent
#    value changes. You populate the real value with `aws ssm put-parameter`.

resource "aws_ssm_parameter" "database_url" {
  name        = "${local.ssm_prefix}/database_url"
  description = "Postgres connection URL consumed by the Next.js app and Prisma."
  type        = "SecureString"
  value = format(
    "postgres://%s:%s@%s:%d/%s?schema=public",
    var.db_username,
    urlencode(random_password.db_master.result),
    aws_db_instance.main.address,
    aws_db_instance.main.port,
    var.db_name,
  )

  tags = {
    Sensitive = "true"
  }
}

resource "aws_ssm_parameter" "db_master_password" {
  name        = "${local.ssm_prefix}/db_master_password"
  description = "Raw RDS master password. Stored for break-glass recovery; the app uses database_url instead."
  type        = "SecureString"
  value       = random_password.db_master.result

  tags = {
    Sensitive = "true"
  }
}

resource "aws_ssm_parameter" "nextauth_url" {
  name        = "${local.ssm_prefix}/nextauth_url"
  description = "Public origin used by NextAuth for callback URLs."
  type        = "String"
  value       = "https://${var.domain}"
}

resource "aws_ssm_parameter" "next_public_sync_url" {
  name        = "${local.ssm_prefix}/next_public_sync_url"
  description = "Public WebSocket URL the Next.js client connects to for Yjs sync."
  type        = "String"
  value       = "wss://${var.domain}/yjs"
}

# Placeholders — populate with `aws ssm put-parameter --overwrite ...` after apply.
resource "aws_ssm_parameter" "auth_secret" {
  name        = "${local.ssm_prefix}/auth_secret"
  description = "NextAuth session signing secret. Generate with: openssl rand -base64 32"
  type        = "SecureString"
  value       = "PLACEHOLDER-replace-with-aws-ssm-put-parameter"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Sensitive = "true"
  }
}

resource "aws_ssm_parameter" "auth_github_id" {
  name        = "${local.ssm_prefix}/auth_github_id"
  description = "Production GitHub OAuth app client ID."
  type        = "SecureString"
  value       = "PLACEHOLDER-replace-with-aws-ssm-put-parameter"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Sensitive = "true"
  }
}

resource "aws_ssm_parameter" "auth_github_secret" {
  name        = "${local.ssm_prefix}/auth_github_secret"
  description = "Production GitHub OAuth app client secret."
  type        = "SecureString"
  value       = "PLACEHOLDER-replace-with-aws-ssm-put-parameter"

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Sensitive = "true"
  }
}
