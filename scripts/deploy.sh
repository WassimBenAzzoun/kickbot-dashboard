#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

SKIP_INSTALL=false
SKIP_BUILD=false

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy.sh [options]

Options:
  --skip-install              Skip npm ci.
  --skip-build                Skip npm run build.
  -h, --help                  Show help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install)
      SKIP_INSTALL=true
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac

  shift
done

main() {
  check_command npm
  check_env "${ENV_FILE}" VITE_API_BASE_URL

  cd "${APP_DIR}"

  if [[ "${SKIP_INSTALL}" != "true" ]]; then
    log_info "Installing frontend dependencies..."
    npm ci
  else
    log_warning "Skipping npm ci."
  fi

  if [[ "${SKIP_BUILD}" != "true" ]]; then
    log_info "Building frontend..."
    npm run build
  else
    log_warning "Skipping frontend build."
  fi

  sync_dist_if_configured
  run_post_deploy_if_configured

  log_success "Frontend deployment completed successfully."
}

main
