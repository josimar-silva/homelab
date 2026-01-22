#!/usr/bin/env bash
set -euo pipefail

# Renovate Configuration Validator Script
# This script validates renovate.json using the official Renovate config validator
# Can be run locally or in CI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${REPO_ROOT}/renovate.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RENOVATE_VERSION="${RENOVATE_VERSION:-latest}"
STRICT_MODE="${STRICT_MODE:-true}"

echo -e "${BLUE}=== Renovate Configuration Validator ===${NC}"
echo ""
echo "Configuration:"
echo "  - File: ${CONFIG_FILE}"
echo "  - Renovate version: ${RENOVATE_VERSION}"
echo "  - Strict mode: ${STRICT_MODE}"
echo ""

# Check if config file exists
if [[ ! -f "${CONFIG_FILE}" ]]; then
	echo -e "${RED}Error: renovate.json not found at ${CONFIG_FILE}${NC}"
	exit 1
fi

# Validate JSON syntax first
echo -e "${BLUE}Step 1: Validating JSON syntax...${NC}"
if jq empty "${CONFIG_FILE}" 2>/dev/null; then
	echo -e "${GREEN}✓ JSON syntax is valid${NC}"
else
	echo -e "${RED}✗ JSON syntax is invalid${NC}"
	echo "Please fix JSON syntax errors before proceeding."
	exit 1
fi
echo ""

# Run Renovate config validator
echo -e "${BLUE}Step 2: Running Renovate config validator...${NC}"

# Build Docker command as array to avoid word splitting issues
DOCKER_ARGS=(
	"run" "--rm"
	"-v" "${CONFIG_FILE}:/usr/src/app/renovate.json:ro"
	"renovate/renovate:${RENOVATE_VERSION}"
	"renovate-config-validator"
)

# Add strict flag if enabled
if [[ "${STRICT_MODE}" == "true" ]]; then
	DOCKER_ARGS+=("--strict")
	echo "  - Running in strict mode (will fail if config needs migration)"
fi

echo ""
echo "Command: docker ${DOCKER_ARGS[*]}"
echo ""

# Run the validator and capture output
if docker "${DOCKER_ARGS[@]}"; then
	echo ""
	echo -e "${GREEN}=== Validation Successful ===${NC}"
	echo -e "${GREEN}✓ renovate.json is valid${NC}"
	exit 0
else
	echo ""
	echo -e "${RED}=== Validation Failed ===${NC}"
	echo -e "${RED}✗ renovate.json has validation errors${NC}"
	echo ""
	echo "Please fix the errors above and run validation again."
	exit 1
fi
