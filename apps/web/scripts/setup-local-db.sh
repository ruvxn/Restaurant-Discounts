#!/usr/bin/env bash
set -euo pipefail

# Defaults (can be overridden via env vars or CLI arguments)
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

info() { printf "%b[info]%b %s\n" "$GREEN" "$RESET" "$1"; }
warn() { printf "%b[warn]%b %s\n" "$YELLOW" "$RESET" "$1"; }
err() { printf "%b[error]%b %s\n" "$RED" "$RESET" "$1" 1>&2; }

die() {
  err "$1"
  exit 1
}

require_psql() {
  if ! command -v psql >/dev/null 2>&1; then
    die "psql command not found. Install PostgreSQL or add it to PATH before running this script."
  fi
}

# Runs a psql command as the Postgres superuser.
run_psql() {
  local sql="$1"
  PGPASSWORD="${PGPASSWORD:-}" psql \
    --username "${PGUSER:-postgres}" \
    --host "$DB_HOST" \
    --port "$DB_PORT" \
    --tuples-only \
    --command "$sql" postgres >/dev/null
}

ensure_user() {
  info "Ensuring role '$DB_USER' exists"
  run_psql "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE \"$DB_USER\" LOGIN PASSWORD '$DB_PASSWORD'; ELSE ALTER ROLE \"$DB_USER\" WITH PASSWORD '$DB_PASSWORD'; END IF; END $$;"
}

ensure_database() {
  info "Ensuring database '$DB_NAME' exists"
  run_psql "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\"; END IF; END $$;"
}

grant_privileges() {
  info "Granting privileges on database '$DB_NAME' to '$DB_USER'"
  PGPASSWORD="${PGPASSWORD:-}" psql \
    --username "${PGUSER:-postgres}" \
    --host "$DB_HOST" \
    --port "$DB_PORT" \
    --command "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" >/dev/null
}

update_env_file() {
  local env_path="$ENV_FILE"

  info "Writing DATABASE_URL to $env_path"

  local db_url="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"

  if [ -f "$env_path" ]; then
    # Remove existing DATABASE_URL line
    grep -v '^DATABASE_URL=' "$env_path" > "$env_path.tmp" && mv "$env_path.tmp" "$env_path"
  else
    mkdir -p "$(dirname "$env_path")"
    touch "$env_path"
  fi

  echo "DATABASE_URL=$db_url" >> "$env_path"
}

main() {
  require_psql

  warn "This script expects you to have superuser access to Postgres."
  warn "Set PGUSER/PGPASSWORD environment variables if needed before running."

  ensure_user
  ensure_database
  grant_privileges
  update_env_file

  info "All done! Database credentials written to $ENV_FILE"
  info "Remember to run 'npm run db:migrate' followed by 'npm run db:seed' inside apps/web."
}

main "$@"
