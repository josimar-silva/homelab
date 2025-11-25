#!/usr/bin/env bash
set -euo pipefail

# Renovate Custom Manager Testing Wrapper Script
# This script runs the JavaScript-based test suite using bun or node.
# The JavaScript implementation uses native regex matching without conversion.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JS_TEST_SCRIPT="${SCRIPT_DIR}/test-renovate-managers.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

# Check if JS test script exists
if [[ ! -f "${JS_TEST_SCRIPT}" ]]; then
    log_error "Test script not found: ${JS_TEST_SCRIPT}"
    exit 1
fi

# Determine which runtime to use
RUNTIME=""
RUNTIME_NAME=""

if command -v bun &> /dev/null; then
    RUNTIME="bun"
    RUNTIME_NAME="Bun"
elif command -v node &> /dev/null; then
    RUNTIME="node"
    RUNTIME_NAME="Node.js"
else
    log_error "Neither bun nor node found in PATH"
    log_info "Please install Node.js (https://nodejs.org/) or Bun (https://bun.sh/)"
    exit 1
fi

log_info "Using ${RUNTIME_NAME} runtime: $(command -v ${RUNTIME})"

# Check if glob package is available (required for the JS script)
if [[ "${RUNTIME}" == "node" ]]; then
    if ! node -e "require('glob')" &> /dev/null; then
        log_error "Required Node.js package 'glob' is not installed"
        log_info "Install dependencies: npm install glob"
        exit 1
    fi
fi

echo ""

# Run the JavaScript test script
exec "${RUNTIME}" "${JS_TEST_SCRIPT}" "$@"
