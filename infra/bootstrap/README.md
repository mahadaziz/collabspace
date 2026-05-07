# Bootstrap module

Creates the AWS resources that everything else depends on:

- S3 bucket + DynamoDB table — the remote backend used by `infra/main`.
- GitHub Actions OIDC provider — lets the deploy workflow assume an AWS role without static credentials.
- `collabspace-deploy` IAM role — least-privilege policy for pushing to ECR and triggering SSM run-commands.

This module uses **local state** (`terraform.tfstate` lives in this directory). That is intentional: it has to bootstrap the remote backend before the remote backend exists. The local state is gitignored.

## Apply

Run from this directory:

```bash
cd infra/bootstrap
terraform init
terraform plan      # sanity check
terraform apply
```

Apply prints the values needed for everything that follows. Save them or re-read with `terraform output` later.

## After apply

1. **Note the outputs** — `state_bucket_name`, `state_lock_table_name`, `region`, `deploy_role_arn`. The first three go into `infra/main/backend.tf`. The fourth goes into the GitHub repo as a variable named `AWS_DEPLOY_ROLE_ARN` (Settings → Secrets and variables → Actions → Variables → New repository variable). It's not a secret — role ARNs are not credentials on their own — so use a variable, not a secret.

2. **Don't commit `terraform.tfstate`.** It's gitignored; back it up to a personal location (1Password, encrypted USB, etc.) if you want belt-and-suspenders. If you lose it: import the existing resources with `terraform import` or destroy them in console and re-apply.

3. **Don't run `terraform destroy` casually.** Doing so wipes the OIDC provider, the deploy role, and (if empty) the state bucket and lock table. The main module's state is in that bucket, so destroying it before destroying the main module would orphan all main-module resources.

## Customizing

Variables are documented in `variables.tf`. Defaults assume:

- Region `us-east-2`
- Project prefix `collabspace`
- GitHub repo `mahadaziz/collabspace`

Override on the command line if needed: `terraform apply -var 'github_repo=someone-else/collabspace'`.
