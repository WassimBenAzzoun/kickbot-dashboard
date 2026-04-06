#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

SKIP_INSTALL=false
SKIP_BUILD=false
FORCE=false

usage() {
  cat <<'EOF'
Usage: ./scripts/update.sh [options]

Options:
  --branch=branch             Branch to deploy. Defaults to main.
  --skip-install              Skip npm ci.
  --skip-build                Skip npm run build.
  --force                     Allow hard reset to origin/<branch>.
  -h, --help                  Show help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch=*)
      DEPLOY_BRANCH="${1#*=}"
      ;;
    --skip-install)
      SKIP_INSTALL=true
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
    --force)
      FORCE=true
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
  check_command git npm
  check_env "${ENV_FILE}" VITE_API_BASE_URL

  cd "${APP_DIR}"

  if [[ ! -d .git ]]; then
    die "Frontend update requires a git checkout at ${APP_DIR}."
  fi

  if [[ "${FORCE}" != "true" ]]; then
    ensure_clean_git_tree "${APP_DIR}"
  fi

  log_info "Syncing frontend repository to origin/${DEPLOY_BRANCH}..."
  git fetch origin

  if git show-ref --verify --quiet "refs/heads/${DEPLOY_BRANCH}"; then
    git checkout "${DEPLOY_BRANCH}"
  else
    git checkout -B "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
  fi

  if [[ "${FORCE}" == "true" ]]; then
    git reset --hard "origin/${DEPLOY_BRANCH}"
  else
    git pull --ff-only origin "${DEPLOY_BRANCH}"
  fi

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

  log_success "Frontend update completed successfully."
}

main
