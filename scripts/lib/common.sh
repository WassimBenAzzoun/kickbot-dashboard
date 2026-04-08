#!/usr/bin/env bash
set -euo pipefail

SCRIPT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_APP_DIR="$(cd "${SCRIPT_LIB_DIR}/../.." && pwd)"

APP_DIR="${APP_DIR:-$DEFAULT_APP_DIR}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
FRONTEND_DEPLOY_TARGET_DIR="${FRONTEND_DEPLOY_TARGET_DIR:-}"
FRONTEND_POST_DEPLOY_CMD="${FRONTEND_POST_DEPLOY_CMD:-}"

if [[ -t 1 ]]; then
  COLOR_BLUE="$(printf '\033[34m')"
  COLOR_GREEN="$(printf '\033[32m')"
  COLOR_YELLOW="$(printf '\033[33m')"
  COLOR_RED="$(printf '\033[31m')"
  COLOR_RESET="$(printf '\033[0m')"
else
  COLOR_BLUE=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_RED=""
  COLOR_RESET=""
fi

log_info() {
  printf "%s[INFO]%s %s\n" "${COLOR_BLUE}" "${COLOR_RESET}" "$*"
}

log_success() {
  printf "%s[SUCCESS]%s %s\n" "${COLOR_GREEN}" "${COLOR_RESET}" "$*"
}

log_warning() {
  printf "%s[WARNING]%s %s\n" "${COLOR_YELLOW}" "${COLOR_RESET}" "$*"
}

log_error() {
  printf "%s[ERROR]%s %s\n" "${COLOR_RED}" "${COLOR_RESET}" "$*"
}

die() {
  log_error "$*"
  exit 1
}

check_command() {
  local command_name

  for command_name in "$@"; do
    if ! command -v "${command_name}" >/dev/null 2>&1; then
      die "Required command '${command_name}' is not installed."
    fi
  done
}

require_file() {
  local path="$1"

  [[ -f "${path}" ]] || die "Required file not found: ${path}"
}

get_env_value() {
  local env_file="$1"
  local key="$2"
  local line

  [[ -f "${env_file}" ]] || return 1

  line="$(grep -E "^[[:space:]]*${key}=" "${env_file}" | tail -n 1 || true)"
  [[ -n "${line}" ]] || return 1

  line="${line#*=}"
  line="${line%$'\r'}"

  printf "%s" "${line}"
}

check_env() {
  local env_file="$1"
  shift

  require_file "${env_file}"

  local missing=()
  local key
  local value

  for key in "$@"; do
    value="$(get_env_value "${env_file}" "${key}" || true)"

    if [[ -z "${value// }" ]]; then
      missing+=("${key}")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    die "Missing required environment variables in ${env_file}: ${missing[*]}"
  fi
}

sync_dist_if_configured() {
  if [[ -z "${FRONTEND_DEPLOY_TARGET_DIR}" ]]; then
    log_info "No FRONTEND_DEPLOY_TARGET_DIR configured; keeping build artifacts in ${APP_DIR}/dist."
    return 0
  fi

  install -d -m 755 "${FRONTEND_DEPLOY_TARGET_DIR}"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "${APP_DIR}/dist/" "${FRONTEND_DEPLOY_TARGET_DIR}/"
  else
    log_warning "rsync is not installed; falling back to cp-based sync."
    find "${FRONTEND_DEPLOY_TARGET_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a "${APP_DIR}/dist/." "${FRONTEND_DEPLOY_TARGET_DIR}/"
  fi

  log_success "Synced frontend build to ${FRONTEND_DEPLOY_TARGET_DIR}."
}

run_post_deploy_if_configured() {
  if [[ -z "${FRONTEND_POST_DEPLOY_CMD}" ]]; then
    return 0
  fi

  log_info "Running configured frontend post-deploy command..."
  bash -lc "${FRONTEND_POST_DEPLOY_CMD}"
  log_success "Frontend post-deploy command completed."
}

ensure_clean_git_tree() {
  local repo_dir="$1"

  if ! git -C "${repo_dir}" diff --quiet || ! git -C "${repo_dir}" diff --cached --quiet; then
    die "The git worktree at ${repo_dir} has uncommitted changes."
  fi
}
