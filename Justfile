# Linting recipes
lint:
    @echo "Running yamllint (via Docker)"
    docker run --rm -v "$(pwd):/app" cytopia/yamllint .

    @echo "Running shellcheck (via Docker)"
    docker run --rm -v "$(pwd):/mnt" koalaman/shellcheck:stable $(find . -name "*.sh" -print | sed 's/^\.\//\/mnt\//')

    @echo "Running helm lint..."
    for chart in charts/*/; do \
        helm lint "$chart"; \
    done

    @echo "Running kubeconform (via Docker)..."
    docker run --rm -v "$(pwd):/app" ghcr.io/yannh/kubeconform:v0.6.4 -summary -strict -verbose \
        -ignore-missing-schemas \
        -schema-location default \
        -schema-location 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.29.0-standalone-strict/' \
        /app/apps/ /app/infrastructure/ /app/storage/ /app/clusters/

# Validation recipes
validate-renovate:
    @echo "Validating Renovate configuration..."
    ./scripts/validate-renovate.sh

test-renovate:
    @echo "Testing Renovate custom manager regex patterns..."
    ./scripts/test-renovate-managers.sh

test-renovate-all: validate-renovate test-renovate
    @echo ""
    @echo "All Renovate validation and tests completed successfully!"

# Formatting recipes
format:
    @echo "Running shfmt (via Docker)..."
    docker run --rm -v "$(pwd):/mnt" mvdan/shfmt:latest -w $(find . -name "*.sh" -print | sed 's/^\.\//\/mnt\//')

    @echo "Running prettier (via Docker)"
    docker run --rm -v "$(pwd):/app" tmknom/prettier:latest --write /app