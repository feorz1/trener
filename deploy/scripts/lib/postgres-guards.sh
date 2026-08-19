#!/usr/bin/env bash

# Shared fail-closed guards for PostgreSQL operational scripts. This file does
# not enable shell options so callers can source it without changing semantics.

postgres_guard_error() {
  printf 'database guard rejected operation: %s\n' "$1" >&2
  return 1
}

parse_postgres_url() {
  local database_url="$1"
  local remainder authority host_port path host port database

  case "$database_url" in
    postgresql://*) remainder="${database_url#postgresql://}" ;;
    postgres://*) remainder="${database_url#postgres://}" ;;
    *) postgres_guard_error "URL must use postgres:// or postgresql://"; return 1 ;;
  esac

  [[ "$remainder" == */* ]] || { postgres_guard_error "URL must contain an explicit database name"; return 1; }
  authority="${remainder%%/*}"
  path="${remainder#*/}"
  PG_GUARD_HAS_QUERY=false
  PG_GUARD_HAS_FRAGMENT=false
  [[ "$path" != *\?* ]] || PG_GUARD_HAS_QUERY=true
  [[ "$path" != *\#* ]] || PG_GUARD_HAS_FRAGMENT=true
  host_port="${authority##*@}"
  database="${path%%\?*}"
  database="${database%%\#*}"

  [[ -n "$host_port" ]] || { postgres_guard_error "database host is empty"; return 1; }
  [[ -n "$database" ]] || { postgres_guard_error "database name is empty"; return 1; }
  [[ "$database" =~ ^[A-Za-z0-9_-]+$ ]] || {
    postgres_guard_error "database name must be explicit ASCII letters, digits, '_' or '-'"
    return 1
  }

  if [[ "$host_port" == \[* ]]; then
    [[ "$host_port" == *\]* ]] || { postgres_guard_error "invalid bracketed database host"; return 1; }
    host="${host_port#\[}"
    host="${host%%\]*}"
    port="${host_port#*\]}"
    port="${port#:}"
  else
    host="${host_port%%:*}"
    if [[ "$host_port" == *:* ]]; then
      port="${host_port##*:}"
    else
      port="5432"
    fi
  fi

  [[ -n "$host" ]] || { postgres_guard_error "database host is empty"; return 1; }
  while [[ "$host" == *. ]]; do host="${host%.}"; done
  [[ -n "$host" ]] || { postgres_guard_error "database host is empty after normalization"; return 1; }
  [[ "$host" =~ ^[A-Za-z0-9._:-]+$ ]] || { postgres_guard_error "database host has an invalid shape"; return 1; }
  [[ -z "$port" || "$port" =~ ^[0-9]+$ ]] || { postgres_guard_error "database port has an invalid shape"; return 1; }

  PG_GUARD_HOST="$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]')"
  PG_GUARD_PORT="${port:-5432}"
  PG_GUARD_DATABASE="$database"
}

is_blocked_production_host() {
  local host blocked blocked_lower
  local -a blocked_hosts=()
  host="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"

  case "$host" in
    trener-app.com|*.trener-app.com|trainer-app.com|*.trainer-app.com|prod|production|*.prod|*.production|prod.*|production.*)
      return 0
      ;;
  esac
  if [[ "$host" =~ (^|[.-])(prod|production)([.-]|$) ]]; then
    return 0
  fi

  if [[ -n "${PRODUCTION_DATABASE_HOSTS:-}" ]]; then
    IFS=',' read -r -a blocked_hosts <<<"$PRODUCTION_DATABASE_HOSTS"
    for blocked in "${blocked_hosts[@]}"; do
      blocked="${blocked//[[:space:]]/}"
      blocked_lower="$(printf '%s' "$blocked" | tr '[:upper:]' '[:lower:]')"
      [[ -z "$blocked_lower" ]] && continue
      [[ "$host" != "$blocked_lower" && "$host" != *".$blocked_lower" ]] || return 0
    done
  fi
  return 1
}

assert_disposable_test_database() {
  [[ "${NODE_ENV:-}" != "production" ]] || { postgres_guard_error "NODE_ENV=production is forbidden"; return 1; }
  [[ "${ACCOUNT_DELETION_TEST_DB_ACK:-}" == "DELETE_DISPOSABLE_DATABASE" ]] || {
    postgres_guard_error "ACCOUNT_DELETION_TEST_DB_ACK must equal DELETE_DISPOSABLE_DATABASE"
    return 1
  }
  [[ -n "${TEST_DATABASE_URL:-}" ]] || { postgres_guard_error "TEST_DATABASE_URL is required; DATABASE_URL fallback is forbidden"; return 1; }
  [[ -z "${DATABASE_URL:-}" ]] || {
    postgres_guard_error "DATABASE_URL must be unset for destructive test operations"
    return 1
  }
  local routing_variable
  for routing_variable in PGHOST PGHOSTADDR PGPORT PGDATABASE PGSERVICE PGSERVICEFILE; do
    [[ -z "${!routing_variable:-}" ]] || {
      postgres_guard_error "$routing_variable must be unset for destructive test operations"
      return 1
    }
  done
  parse_postgres_url "$TEST_DATABASE_URL" || return 1
  [[ "$PG_GUARD_HAS_QUERY" == false && "$PG_GUARD_HAS_FRAGMENT" == false ]] || {
    postgres_guard_error "query parameters and fragments are forbidden for destructive test database URLs"
    return 1
  }
  [[ "$PG_GUARD_HOST" != *:* ]] || {
    postgres_guard_error "IPv6 targets are forbidden for destructive test operations; use a canonical DNS or IPv4 host"
    return 1
  }
  local database_lower
  database_lower="$(printf '%s' "$PG_GUARD_DATABASE" | tr '[:upper:]' '[:lower:]')"
  [[ "$database_lower" =~ (^|[-_])(test|testing|disposable|restore|ci)([-_]|$) ]] || {
    postgres_guard_error "database name must explicitly contain test, disposable, restore, or ci"
    return 1
  }
  case "$database_lower" in
    postgres|template0|template1|trainer_app|trainer-prod|trainer_production)
      postgres_guard_error "database name is reserved or production-like"
      return 1
      ;;
  esac
  if is_blocked_production_host "$PG_GUARD_HOST"; then
    postgres_guard_error "production host/domain is forbidden"
    return 1
  fi

  printf 'database guard approved: host=%s port=%s database=%s\n' "$PG_GUARD_HOST" "$PG_GUARD_PORT" "$PG_GUARD_DATABASE"
}

assert_explicit_preflight_database() {
  [[ -n "${PREFLIGHT_DATABASE_URL:-}" ]] || {
    postgres_guard_error "PREFLIGHT_DATABASE_URL is required; DATABASE_URL fallback is forbidden"
    return 1
  }
  parse_postgres_url "$PREFLIGHT_DATABASE_URL" || return 1
  printf 'preflight target: host=%s port=%s database=%s\n' "$PG_GUARD_HOST" "$PG_GUARD_PORT" "$PG_GUARD_DATABASE"
}
