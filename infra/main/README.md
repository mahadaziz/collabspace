# Main infrastructure module

Creates everything the application needs to run in AWS:

- VPC with two public subnets across two AZs
- EC2 `t3.micro` (AL2023) with EIP, IAM instance profile, IMDSv2 only
- RDS Postgres 16 (`db.t3.micro`, single-AZ), 7-day backups, deletion protection on
- ECR repos for `collabspace/web` and `collabspace/sync`
- Route 53 A and CNAME records for the apex and `www`
- CloudWatch log group + 2 alarms (CPU high, status check) wired to an SNS topic with email subscription
- SSM parameter tree under `/collabspace/prod/*` for app config and secrets

Uses the S3 backend created by `infra/bootstrap`.

## Apply

You must supply `alert_email` (no default). One option is a `terraform.tfvars` file:

```hcl
alert_email = "you@example.com"
```

Then:

```bash
cd infra/main
terraform init
terraform plan
terraform apply
```

Apply takes ~10–15 minutes (RDS creation is the slow step).

## After apply, before first deploy

1. **Confirm the SNS email subscription.** AWS sends a confirmation email to
   `var.alert_email`. Click the link or alarms will go nowhere.

2. **Populate the placeholder SSM parameters.** The Terraform creates them with
   the literal value `PLACEHOLDER-replace-with-aws-ssm-put-parameter`. Replace
   each with real values:

   ```bash
   # NextAuth signing secret
   aws ssm put-parameter --overwrite \
     --name /collabspace/prod/auth_secret \
     --type SecureString \
     --value "$(openssl rand -base64 32)"

   # Production GitHub OAuth app credentials
   aws ssm put-parameter --overwrite \
     --name /collabspace/prod/auth_github_id \
     --type SecureString \
     --value "Ov23li...your client id..."

   aws ssm put-parameter --overwrite \
     --name /collabspace/prod/auth_github_secret \
     --type SecureString \
     --value "...your client secret..."
   ```

   `database_url`, `nextauth_url`, and `next_public_sync_url` are set automatically.

3. **Verify the EIP / DNS.** `dig +short collabspace.dev` should return the EIP
   (output `ec2_public_ip`). Propagation is fast since Route 53 is authoritative.

4. **Verify SSM Session Manager works.** Connecting to the host:

   ```bash
   aws ssm start-session --target $(terraform output -raw ec2_instance_id)
   ```

   You should land in a shell on the EC2 host. From there, `docker --version`
   and `docker compose version` should both work; CloudWatch Agent should be
   enabled (`systemctl is-enabled amazon-cloudwatch-agent`).

5. **Add the deploy role ARN to GitHub.** From `infra/bootstrap`,
   `terraform output deploy_role_arn` → repo Settings → Secrets and variables →
   Actions → Variables → New repository variable named `AWS_DEPLOY_ROLE_ARN`.

The host is now ready, but no app is running yet. Phase 3 adds the
docker-compose.yml, Caddyfile, container images, and GitHub Actions deploy
workflow.

## Variables of note

| Variable            | Default           | Why you might change it                                                             |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `alert_email`       | —                 | Required. Where alarm emails go.                                                    |
| `ssh_ingress_cidr`  | `""` (closed)     | Set to `your.ip.add.ress/32` if you want SSH. SSM Session Manager works without it. |
| `region`            | `us-east-2`       | Must match the bootstrap module.                                                    |
| `domain`            | `collabspace.dev` | The Route 53 hosted zone is referenced as a data source — must already exist.       |
| `db_instance_class` | `db.t3.micro`     | Free-tier eligible for 12 months.                                                   |
| `ec2_instance_type` | `t3.micro`        | Free-tier eligible for 12 months.                                                   |
