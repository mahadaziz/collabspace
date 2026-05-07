#!/bin/bash
# Fetches all SSM parameters under /collabspace/prod into a runtime env file
# at /opt/collabspace/.env.runtime. Compose then loads it via env_file.
#
# Run on the host. Uses the EC2 instance profile for AWS auth.
set -euo pipefail

PREFIX="/collabspace/prod"
OUT="/opt/collabspace/.env.runtime"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

aws ssm get-parameters-by-path \
	--path "$PREFIX" \
	--recursive \
	--with-decryption \
	--query 'Parameters[*].[Name,Value]' \
	--output text \
	| while IFS=$'\t' read -r name value; do
		# Strip the prefix and uppercase the key.
		key="${name#"$PREFIX/"}"
		key="$(echo "$key" | tr '[:lower:]' '[:upper:]')"
		# Quote the value safely (handles =, spaces, special chars).
		printf '%s=%q\n' "$key" "$value"
	done > "$TMP"

install -m 0600 "$TMP" "$OUT"
echo "[fetch-secrets] wrote $(wc -l < "$OUT") env vars to $OUT"
