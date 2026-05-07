# Collabspace Deployment Plan

> **Status:** plan only. No infra code or CI workflows have been written yet.
> Last updated: 2026-05-07.

## 1. Goals and non-goals

**Goals**

- A public URL that recruiters and friends can hit any time and try the
  collaborative editor end-to-end (sign in with GitHub, create a doc,
  open it in two browser sessions, see live cursors and presence).
- Deploy on every push to `main` with no manual steps.
- Real-feeling AWS architecture, IaC, and CI/CD — for the resume bullet
  and the learning value — without lighting money on fire.
- Stay inside the AWS Free Tier for the first 12 months (~$2/mo all-in).

**Non-goals (for now)**

- High availability / multi-AZ.
- Horizontal scaling of the WebSocket sync server (sticky sessions, fan-out).
- Staging environment.
- Zero-downtime deploys (a 30-60s blip on each deploy is acceptable).
- Custom monitoring dashboards beyond a couple of CloudWatch alarms.

## 2. Decision summary

| Area              | Decision                                         | Notes                                                                                               |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Region            | `us-east-2` (Ohio)                               | Cheapest tier, slightly fewer outages than us-east-1.                                               |
| Architecture      | **Single EC2 host + managed RDS, no ALB**        | Caddy on the EC2 terminates TLS via Let's Encrypt and reverse-proxies to Next.js + sync containers. |
| Compute           | EC2 `t3.micro`, on-demand, single instance       | Free tier covers 750 hrs/mo for first 12 months.                                                    |
| Database          | RDS Postgres `db.t3.micro`, single-AZ, 20 GB gp3 | Free tier covers 750 hrs/mo for first 12 months. Postgres 16.                                       |
| Containers        | Docker Compose on the EC2 host                   | Three services: `web` (Next.js), `sync` (y-websocket), `caddy`.                                     |
| TLS               | Caddy + Let's Encrypt (auto-renewing)            | No ALB, no ACM. Caddy is the public ingress on :80/:443.                                            |
| Domain            | `collabspace.dev` registered in Route 53         | Hosted zone $0.50/mo, domain $17/yr. Hosted zone auto-created at registration.                      |
| WebSocket routing | Path-based: `wss://${DOMAIN}/yjs`                | Caddy proxies `/yjs` to sync container, everything else to Next.js.                                 |
| Secrets           | SSM Parameter Store (SecureString)               | Fetched at container startup via IAM instance profile.                                              |
| Image registry    | ECR private repo                                 | Free tier 500 MB storage for first 12 months.                                                       |
| IaC               | Terraform                                        | State in S3 + DynamoDB lock table.                                                                  |
| CI/CD             | GitHub Actions on push to `main`                 | OIDC role assumption (no static AWS keys).                                                          |
| Observability     | CloudWatch Logs + 2 alarms → SNS → email         | EC2 CPU > 80% (5min), instance status check failed.                                                 |
| Backups           | RDS automated backups, 7-day retention           | Single-AZ; restore via point-in-time within window.                                                 |
| Auth (app-level)  | NextAuth + GitHub OAuth (already wired)          | Add a production OAuth app pointed at the prod domain.                                              |

## 3. Architecture

```
                        ┌─────────────────────────┐
   browsers ──HTTPS───▶ │   Route 53 (hosted zone)│
   browsers ──WSS─────▶ │   ${DOMAIN} → A → EIP   │
                        └────────────┬────────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │ EC2 t3.micro        │
                          │ Elastic IP attached │
                          │                     │
                          │ ┌─────────────────┐ │
                          │ │ caddy (:80,:443)│ │ TLS, ACME, reverse proxy
                          │ └──┬─────────────┬┘ │
                          │    │             │  │
                          │    │ /yjs        │ /*
                          │    ▼             ▼  │
                          │ ┌──────┐    ┌──────┐│
                          │ │ sync │    │ web  ││ Docker Compose
                          │ │ :1234│    │ :3000││
                          │ └──┬───┘    └──┬───┘│
                          └────│───────────│────┘
                               │           │
                               └─────┬─────┘
                                     │
                                     ▼ (private subnet, security group)
                            ┌────────────────┐
                            │ RDS Postgres   │
                            │ db.t3.micro    │
                            │ single-AZ      │
                            └────────────────┘

   GitHub Actions ──▶ ECR push ──▶ SSH/SSM RunCommand ──▶ docker compose pull && up
   SSM Parameter Store ──▶ instance profile ──▶ container env at boot
   CloudWatch Logs Agent on host tails docker logs ──▶ /collabspace/* log groups
```

## 4. AWS resources inventory

### Networking

- 1 VPC with 2 public subnets in 2 AZs (RDS requires a subnet group across ≥2 AZs even when single-AZ).
- Internet gateway. **No NAT gateway** ($32/mo — would blow the budget).
- Security groups:
  - `sg-web`: ingress 22 (your IP only), 80, 443 from `0.0.0.0/0`.
  - `sg-db`: ingress 5432 from `sg-web` only.

### Compute

- 1 EC2 `t3.micro`, Amazon Linux 2023, ARM-incompatible image (t3 is x86; we want free tier).
- 1 Elastic IP attached.
- 30 GB gp3 root volume (free tier covers 30 GB).
- IAM instance profile granting:
  - `ssm:GetParametersByPath` for `/collabspace/prod/*`
  - `ecr:GetAuthorizationToken`, `ecr:BatchGet*`, `ecr:GetDownloadUrlForLayer`
  - `logs:CreateLogStream`, `logs:PutLogEvents` for the project log groups
  - `ssm:UpdateInstanceInformation` (for SSM Session Manager — preferred over SSH)

### Database

- RDS Postgres 16, `db.t3.micro`, single-AZ, 20 GB gp3 storage, storage autoscaling off.
- Automated backups: 7-day retention, default backup window.
- Deletion protection: on.
- Final snapshot on destroy: yes (named with timestamp).

### Storage / registry

- ECR repository `collabspace/web`.
- ECR repository `collabspace/sync`.
- Lifecycle policy: keep last 5 untagged images; tagged images kept indefinitely.

### Secrets

SSM Parameter Store, all under `/collabspace/prod/`:

- `database_url` (SecureString)
- `auth_secret` (SecureString)
- `auth_github_id` (SecureString)
- `auth_github_secret` (SecureString)
- `nextauth_url` (String — the prod URL)
- `next_public_sync_url` (String — `wss://${DOMAIN}/yjs`)

### DNS

- Route 53 hosted zone for `${DOMAIN}`.
- A record `${DOMAIN}` → EIP.
- (Optional) `www.${DOMAIN}` → CNAME to apex, with Caddy redirect.

### Observability

- CloudWatch log groups: `/collabspace/web`, `/collabspace/sync`, `/collabspace/caddy`. 7-day retention to stay within free tier.
- CloudWatch alarms (2):
  - `EC2 CPUUtilization > 80% for 5 minutes` (catches runaway loops).
  - `EC2 StatusCheckFailed > 0` (instance unreachable).
- SNS topic `collabspace-alerts`; subscription: your email.

### Terraform state

- S3 bucket `collabspace-tfstate-${random_suffix}`, versioning on, public access block on, server-side encryption.
- DynamoDB table `collabspace-tfstate-locks`, on-demand billing, partition key `LockID`.
- Bootstrap problem: these resources must exist before `terraform init` can use them as a backend. Plan: a one-shot `bootstrap/` Terraform module with local state that creates the bucket and table, applied once manually. Main module then uses the S3 backend.

## 5. Cost estimate

### Year 1 (within free tier)

| Item                               | Monthly       |
| ---------------------------------- | ------------- |
| EC2 t3.micro (750 hrs)             | $0            |
| RDS db.t3.micro (750 hrs, 20 GB)   | $0            |
| EBS 30 GB gp3                      | $0            |
| Data transfer out (≤100 GB)        | $0            |
| ECR (≤500 MB)                      | $0            |
| CloudWatch Logs (≤5 GB)            | $0            |
| SSM Parameter Store standard       | $0            |
| Route 53 hosted zone               | $0.50         |
| Domain registration (.dev, $17/yr) | $1.42         |
| S3 + DynamoDB for TF state         | ~$0.10        |
| **Total**                          | **~$2.00/mo** |

### Year 2 onward (after free tier expires)

| Item                               | Monthly     |
| ---------------------------------- | ----------- |
| EC2 t3.micro on-demand (us-east-2) | ~$7.50      |
| RDS db.t3.micro single-AZ          | ~$13.00     |
| EBS 30 GB gp3                      | ~$2.40      |
| RDS storage 20 GB gp3              | ~$2.30      |
| Route 53 + domain                  | ~$1.60      |
| Misc (Logs, ECR, S3, DDB)          | ~$1.00      |
| **Total**                          | **~$28/mo** |

> ⚠️ Year 2 is **above the stated $20/mo ceiling**. Three options when free tier expires:
>
> 1. Buy a 1-year Reserved Instance for the t3.micro (~$4/mo, saves ~$3.50).
> 2. Move Postgres onto the EC2 host (kill RDS, ~$15 saved, lose managed backups).
> 3. Accept ~$28/mo and treat it as the cost of a real demo URL.
>
> Decide at month 11. Calendar reminder belongs in your personal system, not in code.

## 6. Deploy flow

### Local prerequisites (one-time)

1. AWS account, root access used only to create an admin IAM user.
2. `aws configure` with that admin user (used only to bootstrap TF state and the OIDC provider).
3. Domain `collabspace.dev` registered in Route 53 console (done 2026-05-07). Hosted zone is auto-created at registration; Terraform will reference it via `data "aws_route53_zone" { name = "collabspace.dev" }` rather than creating it.
4. Production GitHub OAuth app created at github.com/settings/developers, callback URL `https://${DOMAIN}/api/auth/callback/github`. Client ID and secret put into SSM.

### Bootstrap (one-time, manual)

```
cd infra/bootstrap
terraform init
terraform apply         # creates TF state bucket + lock table + GitHub OIDC provider + deploy role
```

Outputs the role ARN to add to GitHub repo secrets as `AWS_DEPLOY_ROLE_ARN`.

### Main apply (one-time, manual; thereafter idempotent)

```
cd infra
terraform init          # uses S3 backend
terraform apply         # creates VPC, EC2, RDS, ECR, Route 53, SSM, alarms
```

After apply: SSH/SSM into the instance, install Docker + Compose + the CloudWatch Agent via user-data (so this is automatic on first boot), and the host pulls the `docker-compose.yml` from a known path in the repo at deploy time.

### Per-deploy (automated)

GitHub Actions workflow `.github/workflows/deploy.yml`, triggered on push to `main`:

1. **Test job**: `npm ci && npm run lint && npm test && npx tsc --noEmit && npm run build`.
2. **Build & push job** (depends on test):
   - Configure AWS credentials via OIDC (`aws-actions/configure-aws-credentials`).
   - `docker build` web and sync images, tag with `${GITHUB_SHA}` and `latest`, push to ECR.
3. **Deploy job** (depends on build):
   - `aws ssm send-command` to the EC2 instance with a shell snippet:
     ```
     cd /opt/collabspace
     export IMAGE_TAG=${GITHUB_SHA}
     docker compose pull
     docker compose up -d
     docker image prune -f
     ```
   - Poll `aws ssm list-command-invocations` for completion.
   - Smoke test: `curl -f https://${DOMAIN}/api/health` (need to add a `/api/health` route).

Total wall time target: < 5 minutes.

### Migrations

Prisma migrations run on container startup before the Next.js server boots:

```
prisma migrate deploy && next start
```

Single instance, single deploy → no risk of two containers racing on migrations. When we eventually scale to 2+ tasks, this needs to move to a one-shot migration job.

## 7. Secrets management detail

- All secrets live in SSM Parameter Store under `/collabspace/prod/*`.
- The EC2 instance profile has a least-privilege policy scoped to that path.
- On container start, an entrypoint script does `aws ssm get-parameters-by-path --path /collabspace/prod --with-decryption` and exports the results as env vars before exec'ing the app process. This script lives in the container image, not the host.
- Rotation: manual via `aws ssm put-parameter --overwrite` followed by `docker compose restart` (or just push to main, which redeploys). No automated rotation.
- Secrets never appear in Terraform state because they are written to SSM out-of-band (via `aws ssm put-parameter` from your laptop), not via `aws_ssm_parameter` resources. Terraform only references their _paths_.

## 8. Observability detail

- CloudWatch Agent on the host is configured (via user-data) to tail `/var/lib/docker/containers/*/*.log` and ship to the per-service log groups. Log retention: 7 days.
- Alarms:
  - `collabspace-cpu-high`: namespace `AWS/EC2`, metric `CPUUtilization`, dimension instance ID, threshold 80%, period 5 min, evaluation periods 1, action: SNS topic.
  - `collabspace-status-check`: metric `StatusCheckFailed`, threshold ≥ 1, period 1 min, action: SNS topic.
- SNS topic `collabspace-alerts`; one email subscription. Confirmation email must be clicked once after first apply (Terraform can't auto-confirm).
- No application metrics in v1. If WebSocket health becomes a question, add a `/yjs/healthz` endpoint and a `CloudWatch synthetic canary` later — costs ~$0.0012 per run, fine.

## 9. Backups and recovery

- **RDS**: 7-day automated backups + transaction logs. Point-in-time restore via `aws rds restore-db-instance-to-point-in-time`. Tested by you once after first deploy: spin up a restore into a `-restore-test` instance, verify it boots, delete it.
- **Yjs document state**: lives in Postgres (already implemented in commit `4bf6c50`). RDS backup covers it.
- **Awareness state**: ephemeral, not backed up. Correct.
- **Code & infra**: GitHub. Terraform state in S3 with versioning on (so a bad apply can be rolled back).
- **EC2 host**: cattle, not pets. If the instance dies, `terraform apply` recreates it; the user-data script reinstalls Docker, pulls images from ECR, and starts compose. Total downtime to recover from a dead instance: ~5 minutes.
- **What's NOT backed up**: Caddy's local cert cache. Let's Encrypt rate-limits new cert issuance to 5/week per domain. If we destroy and recreate the EC2 several times in quick succession we can hit it. Mitigation: persist `/var/lib/caddy` to a small EBS volume that survives instance replacement (a `aws_ebs_volume` + `aws_volume_attachment` separate from the root volume).

## 10. Year-2 migration path to ECS Fargate + ALB

Captured here so the year-1 architecture doesn't paint us into a corner.

When the demo grows past one instance worth of traffic (or you just want the resume bullet):

1. Create an ALB in the existing VPC. ACM cert for `${DOMAIN}` (free).
2. Add Route 53 alias record from `${DOMAIN}` to the ALB. Old A record gets removed.
3. ECS cluster + Fargate service for `web` (Next.js): 1-2 tasks, 0.25 vCPU / 0.5 GB.
4. Separate Fargate service for `sync` with `deregistration_delay = 0` and **sticky sessions enabled on the target group** (already noted in CLAUDE.md as a constraint).
5. Caddy goes away. ALB does TLS termination and path routing (`/yjs` → sync TG, default → web TG).
6. SSM secrets stay; ECS task definition references them via `secrets` block.
7. Drop the EC2. RDS stays put.

Year-2 cost with ECS path: ~$45/mo (ALB $16, two Fargate tasks ~$18, RDS ~$13).

## 11. Open items / TBD

- [x] ~~Pick the actual domain name.~~ → `collabspace.dev` (registered in Route 53 on 2026-05-07).
- [x] ~~Decide whether to register the domain through Route 53 console first or via Terraform.~~ → Console-first; hosted zone will be referenced as a Terraform data source.
- [ ] Confirm the AWS account is new enough to have free tier eligibility. If you've used this account for >12 months, year 1 costs jump to year-2 pricing immediately.
- [ ] Add a `/api/health` route to Next.js for the deploy smoke test (small implementation task before first deploy).
- [ ] Decide the EBS-persisted Caddy data volume size (5 GB is more than enough; default to that).
- [ ] Production GitHub OAuth app — needs to be created manually before first deploy succeeds; values get written to SSM via `aws ssm put-parameter` from your laptop.

## 12. Implementation phases (when you're ready)

Rough order, not a commitment:

1. **Bootstrap module**: TF state bucket, DynamoDB lock table, GitHub OIDC provider, deploy IAM role.
2. **Main TF module — networking**: VPC, subnets, IGW, security groups.
3. **Main TF module — data**: RDS subnet group, RDS instance, SSM parameter _paths_ (values populated out-of-band).
4. **Main TF module — compute**: ECR repos, EC2 instance + EIP + IAM instance profile, user-data script (installs Docker, Compose, CloudWatch Agent, fetches `docker-compose.yml`).
5. **Main TF module — DNS + observability**: hosted zone, A record, log groups, alarms, SNS topic, email subscription.
6. **Repo additions**:
   - `infra/bootstrap/` — bootstrap Terraform.
   - `infra/` — main Terraform.
   - `Dockerfile.web`, `Dockerfile.sync` — multi-stage builds.
   - `docker-compose.yml` — web + sync + caddy.
   - `Caddyfile` — TLS + reverse proxy.
   - `scripts/entrypoint.sh` — pulls SSM secrets, exec's the app.
   - `src/app/api/health/route.ts` — health endpoint.
   - `.github/workflows/deploy.yml` — CI/CD.
7. **First deploy**: bootstrap apply → main apply → put secrets into SSM → push to main → verify.
8. **Post-deploy verification**: two-browser-session test (regular + incognito), TLS cert validity, alarm fires when you `stress` the instance, log lines visible in CloudWatch, restore-test drill on RDS.
