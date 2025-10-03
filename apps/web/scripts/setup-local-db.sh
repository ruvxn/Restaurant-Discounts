#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [DB_NAME [DB_USER [DB_PASSWORD]]]

Environment overrides:
  DB_HOST (default: localhost)
  DB_PORT (default: 5432)
  DB_NAME (default: restaurant_discounts)
  DB_USER (default: restaurant_user)
  DB_PASSWORD (default: restaurant_pass)
  ENV_FILE (default: apps/web/.env)
  PGUSER / PGPASSWORD for superuser access
USAGE
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

DB_NAME="${1:-${DB_NAME:-restaurant_discounts}}"
DB_USER="${2:-${DB_USER:-restaurant_user}}"
DB_PASSWORD="${3:-${DB_PASSWORD:-restaurant_pass}}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
ENV_FILE="${ENV_FILE:-apps/web/.env}"

GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

log() { printf "%b[info]%b %s\n" "$GREEN" "$RESET" "$1"; }
warn() { printf "%b[warn]%b %s\n" "$YELLOW" "$RESET" "$1"; }
fail() { printf "%b[error]%b %s\n" "$RED" "$RESET" "$1" >&2; }

die() {
  fail "$1"
  exit 1
}

require_psql() {
  if ! command -v psql >/dev/null 2>&1; then
    die "psql command not found. Install PostgreSQL CLI tools first."
  fi
}

# Helper wrappers around psql
run_psql() {
  local sql="$1"
  if ! PGPASSWORD="${PGPASSWORD:-}" psql \
      --username "${PGUSER:-postgres}" \
      --host "$DB_HOST" \
      --port "$DB_PORT" \
      --tuples-only \
      --no-align \
      --command "$sql" postgres >/dev/null; then
    die "psql failed while executing: $sql"
  fi
}

ensure_user() {
  log "Ensuring PostgreSQL role '$DB_USER' exists"
  run_psql "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE \"$DB_USER\" LOGIN PASSWORD '$DB_PASSWORD'; ELSE ALTER ROLE \"$DB_USER\" WITH PASSWORD '$DB_PASSWORD'; END IF; END $$;"
}

ensure_database() {
  log "Ensuring database '$DB_NAME' exists"
  run_psql "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\"; END IF; END $$;"
}

grant_privileges() {
  log "Granting privileges on '$DB_NAME' to '$DB_USER'"
  if ! PGPASSWORD="${PGPASSWORD:-}" psql \
      --username "${PGUSER:-postgres}" \
      --host "$DB_HOST" \
      --port "$DB_PORT" \
      --command "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" >/dev/null; then
    warn "Could not grant privileges. You may not have permission."
  fi
}

update_env_file() {
  local env_path="$ENV_FILE"
  local target_dir
  target_dir="$(dirname "$env_path")"
  if [ ! -d "$target_dir" ]; then
    mkdir -p "$target_dir"
  fi
  touch "$env_path"

  local db_url="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
  log "Writing DATABASE_URL to $env_path"

  if grep -q '^DATABASE_URL=' "$env_path"; then
    # Replace existing line
    tmp_file="${env_path}.tmp"
    awk -v url="$db_url" 'BEGIN{replaced=0} /^DATABASE_URL=/{print "DATABASE_URL=" url; replaced=1; next} {print} END{if(!replaced) print "DATABASE_URL=" url}' "$env_path" > "$tmp_file"
    mv "$tmp_file" "$env_path"
  else
    echo "DATABASE_URL=$db_url" >> "$env_path"
  fi
}

main() {
  require_psql

  warn "This script expects superuser access to Postgres (defaults to PGUSER=postgres)."
  warn "Set PGUSER/PGPASSWORD if your superuser credentials differ."

  ensure_user
  ensure_database
  grant_privileges
  update_env_file

  log "Setup complete. DATABASE_URL saved to $ENV_FILE"
  log "Next steps: cd apps/web && npm run db:migrate && npm run db:seed"
}

main "$@"
