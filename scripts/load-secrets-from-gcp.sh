#!/usr/bin/env bash
# Pulls this project's API keys from GCP Secret Manager (project
# personalsites-487021) and writes them into .env, preserving every
# existing comment/blank line and only updating the KEY=value part of
# each matching line. Idempotent -- safe to re-run any time a secret
# rotates. Requires `gcloud` to be authenticated with access to
# personalsites-487021 (gcloud auth login, then gcloud config set
# project personalsites-487021).
#
# .env itself is gitignored and never committed -- this script exists
# purely as a local-dev convenience so a fresh checkout (or a new
# session on a different machine) doesn't require re-pasting every key
# by hand. Secret Manager is the source of truth; .env is a local cache
# of it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
PROJECT="personalsites-487021"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found. Install the Google Cloud SDK first." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE does not exist. Create it first (see README for the expected keys)." >&2
  exit 1
fi

# secret-name -> env-var-name
MAPPING="
mapstack-fbi-crime-api-key:FBI_CRIME_API_KEY
mapstack-dataverse-api-token:DATAVERSE_API_TOKEN
mapstack-census-api-key:CENSUS_API_KEY
mapstack-bls-api-key:BLS_API_KEY
mapstack-epa-airnow-api-key:EPA_AIRNOW_API_KEY
mapstack-bea-api-key:BEA_API_KEY
mapstack-nass-api-key:NASS_API_KEY
mapstack-eia-api-key:EIA_API_KEY
mapstack-hud-api-key:HUD_API_KEY
"

TMP_FILE="$(mktemp)"
cp "$ENV_FILE" "$TMP_FILE"

echo "$MAPPING" | while IFS=':' read -r secret_name var_name; do
  [ -z "$secret_name" ] && continue
  value="$(gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT" 2>/dev/null || true)"
  if [ -z "$value" ]; then
    echo "SKIP (not found in Secret Manager): $secret_name" >&2
    continue
  fi
  escaped_value="$(printf '%s' "$value" | sed 's/[&/\]/\\&/g')"
  if grep -q "^${var_name}=" "$TMP_FILE"; then
    sed -i '' "s/^${var_name}=.*/${var_name}=${escaped_value}/" "$TMP_FILE"
    echo "updated: $var_name"
  else
    printf '\n%s=%s\n' "$var_name" "$value" >> "$TMP_FILE"
    echo "appended: $var_name"
  fi
done

mv "$TMP_FILE" "$ENV_FILE"
echo "Done. .env refreshed from GCP Secret Manager (project: $PROJECT)."
