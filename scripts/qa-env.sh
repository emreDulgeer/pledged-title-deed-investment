#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
COMPOSE_ARGS=(-f "$ROOT_DIR/docker-compose.yml" -f "$ROOT_DIR/docker-compose.qa.yml")
ENV_FILE="./config/env/qa.env.sample"

run_compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

ensure_server_dependencies() {
  if [[ ! -d "$SERVER_DIR/node_modules" ]]; then
    echo "Installing server dependencies with npm ci..."
    (
      cd "$SERVER_DIR"
      npm ci
    )
  fi
}

wait_for_mongo() {
  local attempts=0
  local max_attempts=30

  until run_compose exec -T mongo mongosh --quiet --eval "db.adminCommand({ ping: 1 }).ok" | grep -q "1"; do
    attempts=$((attempts + 1))

    if [[ "$attempts" -ge "$max_attempts" ]]; then
      echo "MongoDB did not become ready in time." >&2
      exit 1
    fi

    echo "Waiting for MongoDB... ($attempts/$max_attempts)"
    sleep 2
  done
}

prepare_storage() {
  run_compose run --rm minio-init
}

run_seed() {
  ensure_server_dependencies
  (
    cd "$SERVER_DIR"
    npm run seed:qa
  )
}

run_reset() {
  ensure_server_dependencies
  (
    cd "$SERVER_DIR"
    npm run qa:reset
  )
}

print_ready_banner() {
  cat <<'EOF'

QA environment is ready.

MongoDB: mongodb://localhost:27021/pledged_platform
MinIO API: http://localhost:9000
MinIO Console: http://localhost:9001
Seed env file: server/config/env/qa.env.sample

Useful commands:
  ./scripts/qa-env.sh reset
  ./scripts/qa-env.sh logs
  ./scripts/qa-env.sh down

EOF
}

up() {
  run_compose up -d mongo minio
  wait_for_mongo
  prepare_storage
  run_seed
  print_ready_banner
}

reset() {
  run_compose up -d mongo minio
  wait_for_mongo
  prepare_storage
  run_reset
  print_ready_banner
}

down() {
  run_compose down
}

logs() {
  run_compose logs -f mongo minio
}

status() {
  run_compose ps
}

usage() {
  cat <<EOF
Usage: ./scripts/qa-env.sh [up|reset|down|logs|status]

Commands:
  up      Start Mongo + MinIO and seed the standard QA dataset
  reset   Reseed the running QA environment from scratch
  down    Stop the QA containers
  logs    Follow Mongo + MinIO logs
  status  Show container status
EOF
}

case "${1:-up}" in
  up)
    up
    ;;
  reset)
    reset
    ;;
  down)
    down
    ;;
  logs)
    logs
    ;;
  status)
    status
    ;;
  *)
    usage
    exit 1
    ;;
esac
