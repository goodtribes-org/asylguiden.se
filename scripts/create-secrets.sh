#!/usr/bin/env bash
#
# Create or top up the `asylguiden-secret` Secret that every asylguiden workload
# consumes via `envFrom`.
#
# Why this script exists instead of a Helm template:
#   The chart deliberately renders NO `kind: Secret`. `helm template` output is
#   committed to the goodtribes-org/deploy repo, so anything the chart templates
#   is published to git. Keeping the Secret out of the chart also keeps it out of
#   ArgoCD's resource tree — ArgoCD only prunes what it tracks, so a Secret it
#   never rendered is one it can never overwrite or prune. That is the whole
#   mechanism protecting these values; do not add a Secret template to the chart.
#
# Idempotent by design: a key that already exists is left EXACTLY as it is. This
# script only ever fills in what is missing, so re-running it is always safe and
# never rotates a working credential out from under a running pod.
#
# To rotate a key deliberately, delete just that key first, then re-run:
#   kubectl -n asylguiden patch secret asylguiden-secret \
#     --type json -p '[{"op":"remove","path":"/data/JWT_SECRET"}]'
#
set -euo pipefail

NAMESPACE="${NAMESPACE:-asylguiden}"
SECRET_NAME="${SECRET_NAME:-asylguiden-secret}"
KUBECONFIG_PATH="${KUBECONFIG_PATH:-$HOME/.kube/confighrb}"

kc() { kubectl --kubeconfig "$KUBECONFIG_PATH" -n "$NAMESPACE" "$@"; }

gen() { openssl rand -base64 32 | tr -d '\n'; }

if ! kc get secret "$SECRET_NAME" >/dev/null 2>&1; then
  echo "Secret $SECRET_NAME does not exist — creating it empty."
  kc create secret generic "$SECRET_NAME"
fi

# Keys already present, so we know what to leave alone.
existing="$(kc get secret "$SECRET_NAME" -o json | jq -r '.data | keys[]')"

has_key() { grep -qx "$1" <<<"$existing"; }

# ensure KEY VALUE — sets KEY only when absent.
ensure() {
  local key="$1" value="$2"
  if has_key "$key"; then
    echo "  = $key already set, leaving it alone"
    return
  fi
  kc patch secret "$SECRET_NAME" --type merge \
    -p "$(jq -n --arg k "$key" --arg v "$value" '{stringData: {($k): $v}}')" >/dev/null
  echo "  + $key added"
}

echo "Topping up $SECRET_NAME in namespace $NAMESPACE:"

# --- Strapi crypto material -------------------------------------------------
# Rotating any of these logs sessions out, which is harmless.
ensure APP_KEYS "$(gen),$(gen),$(gen),$(gen)"
ensure ADMIN_JWT_SECRET "$(gen)"
ensure TRANSFER_TOKEN_SALT "$(gen)"
ensure JWT_SECRET "$(gen)"

# API_TOKEN_SALT is the one value we must NOT generate.
#
# Strapi hashes every API token as hmac-sha512(token, API_TOKEN_SALT) and stores
# only the hash. Changing the salt therefore invalidates every issued token at
# once — including STRAPI_API_TOKEN (frontend → Strapi reads) and
# COLLECTOR_STRAPI_API_TOKEN (collector → Strapi writes), both of which are live
# and working. Seeding the salt with the value production has effectively been
# running under keeps those tokens valid.
#
# It is a weak salt. Rotating it is a deliberate, separate operation: generate a
# new salt, restart the backend, then re-issue BOTH tokens from the Strapi admin
# UI and write them back into this Secret. Doing that here would break the site.
ensure API_TOKEN_SALT "changeme"

# config/admin.ts reads ENCRYPTION_KEY for secrets.encryptionKey, but it was set
# nowhere — not in the Secret, not in values.yaml. Strapi tolerates it missing
# today, so this is a gap being closed rather than a break being fixed.
#
# Deliberately 16 bytes, not 32: Strapi feeds this key straight into
# aes-128-ecb, which accepts only a 16-byte key. `openssl rand -base64 32` would
# decode to 32 bytes and make Strapi throw "Invalid key length" on boot.
#
# Safe to add now precisely because it was unset — nothing in the database was
# ever encrypted under a previous key, so there is nothing to fail to decrypt.
# Once Strapi encrypts anything with it, changing it makes that data unreadable.
ensure ENCRYPTION_KEY "$(openssl rand -base64 16 | tr -d '\n')"

# --- Frontend ---------------------------------------------------------------
# Signs NextAuth session cookies. It was literally "changeme" in values.yaml, so
# anyone could forge a session; generating a real one is the point of this pass.
ensure NEXTAUTH_SECRET "$(gen)"

# --- Keep ArgoCD's hands off ------------------------------------------------
# The primary protection is structural: the chart renders no Secret, so ArgoCD
# never tracks this resource and cannot prune or overwrite it. These annotations
# are the second line of defence, for the day someone adds a Secret template or
# flips the app to a tracking method that would sweep this resource up:
#
#   compare-options: IgnoreExtraneous — do not treat this live resource as
#     "extraneous" (present in the cluster, absent from git) and delete it.
#   sync-options: Prune=false — never delete it during a sync, even if tracked.
#
# Neither annotation stops a deliberate `kubectl apply`; they only stop ArgoCD's
# automated prune/selfHeal from reaping a Secret that git does not know about.
echo
echo "Applying ArgoCD protection annotations:"
kc annotate secret "$SECRET_NAME" --overwrite \
  argocd.argoproj.io/compare-options=IgnoreExtraneous \
  argocd.argoproj.io/sync-options=Prune=false >/dev/null
echo "  + argocd.argoproj.io/compare-options=IgnoreExtraneous"
echo "  + argocd.argoproj.io/sync-options=Prune=false"

echo
echo "Done. Current keys:"
kc get secret "$SECRET_NAME" -o json | jq -r '.data | keys[]' | sed 's/^/  /'
