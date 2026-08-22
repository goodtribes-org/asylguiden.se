#!/usr/bin/env bash
#
# Rotate API_TOKEN_SALT without re-issuing any Strapi API token.
#
# The naive rotation — change the salt, restart Strapi — silently invalidates
# every API token, because Strapi never stores a token, only
#
#   access_key = hmac-sha512(API_TOKEN_SALT, token)      (hex digest)
#
# (@strapi/admin/dist/server/server/src/services/api-token.js, `hash`). Change
# the salt and every stored digest stops matching the token that produced it,
# so the frontend and the collector both start getting 403s and the only way
# back is issuing new tokens from the admin UI.
#
# But we already hold the plaintext tokens — they live in asylguiden-secret so
# the pods can present them. So we can simply recompute each digest under the
# new salt and write it back. The tokens themselves never change, which means
# nothing outside the database needs updating and there is no admin UI step.
#
# Order matters. The Secret is patched first and the database second, so the
# window in which the running pod's in-memory salt disagrees with the stored
# digests is bounded by the rollout that immediately follows. Authenticated
# reads 403 during that window — a few seconds, and self-healing.
#
# Safe to re-run: it verifies the current digests before touching anything and
# aborts if they do not match, so a half-finished run cannot be compounded.
#
set -euo pipefail

NAMESPACE="${NAMESPACE:-asylguiden}"
SECRET_NAME="${SECRET_NAME:-asylguiden-secret}"
KUBECONFIG_PATH="${KUBECONFIG_PATH:-$HOME/.kube/confighrb}"

kc() { kubectl --kubeconfig "$KUBECONFIG_PATH" -n "$NAMESPACE" "$@"; }
secret_val() { kc get secret "$SECRET_NAME" -o jsonpath="{.data.$1}" | base64 -d; }

# Strapi connects via DATABASE_URL, whose connection string overrides the
# discrete DATABASE_NAME in config/database.ts — so the CMS tables are NOT
# necessarily in the database DATABASE_NAME names. Take the database from the
# URL itself rather than assuming.
DB_URL="$(secret_val DATABASE_URL)"
DB_NAME="${DB_URL##*/}"
DB_NAME="${DB_NAME%%\?*}"
DB_USER="$(secret_val POSTGRES_USER)"

psql_q() { kc exec deploy/asylguiden-postgres -- psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1"; }

OLD_SALT="$(secret_val API_TOKEN_SALT)"
FE_TOKEN="$(secret_val STRAPI_API_TOKEN)"
CO_TOKEN="$(secret_val COLLECTOR_STRAPI_API_TOKEN)"

echo "Database: $DB_NAME (taken from DATABASE_URL, not DATABASE_NAME)"

digest() { # digest <salt> <token>
  SALT="$1" TOKEN="$2" node -e \
    'process.stdout.write(require("crypto").createHmac("sha512",process.env.SALT).update(process.env.TOKEN).digest("hex"))'
}

# --- Verify the world is as we expect before mutating it --------------------
FE_OLD="$(digest "$OLD_SALT" "$FE_TOKEN")"
CO_OLD="$(digest "$OLD_SALT" "$CO_TOKEN")"

FE_ID="$(psql_q "select id from strapi_api_tokens where access_key='$FE_OLD';" | tr -d '\r\n ')"
CO_ID="$(psql_q "select id from strapi_api_tokens where access_key='$CO_OLD';" | tr -d '\r\n ')"

if [[ -z "$FE_ID" || -z "$CO_ID" ]]; then
  echo "ABORT: could not match a stored digest for one or both tokens." >&2
  echo "  STRAPI_API_TOKEN row:           ${FE_ID:-NOT FOUND}" >&2
  echo "  COLLECTOR_STRAPI_API_TOKEN row: ${CO_ID:-NOT FOUND}" >&2
  echo "Nothing was changed. The salt in the Secret may already have been rotated" >&2
  echo "without the digests being updated; re-hash from the previous salt first." >&2
  exit 1
fi
echo "Matched STRAPI_API_TOKEN -> row $FE_ID, COLLECTOR_STRAPI_API_TOKEN -> row $CO_ID"

# --- Rotate ------------------------------------------------------------------
NEW_SALT="$(openssl rand -base64 32 | tr -d '\n')"
FE_NEW="$(digest "$NEW_SALT" "$FE_TOKEN")"
CO_NEW="$(digest "$NEW_SALT" "$CO_TOKEN")"

echo "Patching Secret with the new salt..."
kc patch secret "$SECRET_NAME" --type merge \
  -p "$(jq -n --arg v "$NEW_SALT" '{stringData: {API_TOKEN_SALT: $v}}')" >/dev/null

echo "Re-hashing stored digests under the new salt..."
psql_q "update strapi_api_tokens set access_key='$FE_NEW' where id=$FE_ID;" >/dev/null
psql_q "update strapi_api_tokens set access_key='$CO_NEW' where id=$CO_ID;" >/dev/null

echo "Restarting Strapi so it picks up the new salt..."
kc rollout restart deploy/asylguiden-backend >/dev/null
kc rollout status deploy/asylguiden-backend --timeout=180s

echo
echo "Done. Verify with an authenticated request; both tokens should still work."
