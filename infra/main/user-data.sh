#!/bin/bash
# Bootstrap script for the Collabspace application host.
# Runs once on first boot. Idempotent so re-running is safe.
set -euxo pipefail

# Update package metadata. Using dnf on Amazon Linux 2023.
dnf -y update

# Docker.
dnf -y install docker
systemctl enable --now docker
usermod -aG docker ec2-user

# Docker Compose v2 plugin (not packaged on AL2023; install the static binary).
DOCKER_PLUGINS_DIR=/usr/local/lib/docker/cli-plugins
mkdir -p "$DOCKER_PLUGINS_DIR"
COMPOSE_VERSION=v2.31.0
curl -fsSL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o "$DOCKER_PLUGINS_DIR/docker-compose"
chmod +x "$DOCKER_PLUGINS_DIR/docker-compose"

# CloudWatch Agent.
dnf -y install amazon-cloudwatch-agent

# Application directory. Owned by ec2-user so SSM RunCommand sessions can write there.
install -d -o ec2-user -g ec2-user -m 0755 /opt/${project_name}
install -d -o ec2-user -g ec2-user -m 0755 /opt/${project_name}/caddy-data
install -d -o ec2-user -g ec2-user -m 0755 /opt/${project_name}/caddy-config

# CloudWatch Agent config: tail Docker container logs into the per-service log groups.
cat >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'CWAGENT'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/lib/docker/containers/*/*-json.log",
            "log_group_name": "/${project_name}/docker",
            "log_stream_name": "{instance_id}/{hostname}",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
CWAGENT

systemctl enable amazon-cloudwatch-agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

# Mark first boot complete. Future deploys check this file before pulling images.
date -u +%FT%TZ > /opt/${project_name}/first-boot.txt
