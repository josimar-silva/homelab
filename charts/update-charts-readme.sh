#!/bin/sh

set -e

# Build the helm-docs Docker image if it doesn't exist
if ! docker image inspect helm-docs:local >/dev/null 2>&1; then
	echo "🐳 Building helm-docs Docker image..."
	docker build -t helm-docs:local - <<EOF
FROM alpine:3.19
RUN apk add --no-cache curl && \
    curl -L https://github.com/norwoodj/helm-docs/releases/download/v1.13.1/helm-docs_1.13.1_Linux_x86_64.tar.gz | tar xz -C /usr/local/bin helm-docs
WORKDIR /charts
ENTRYPOINT ["helm-docs"]
EOF
fi

# Run helm-docs for all charts under the charts folder
echo "📄 Generating Helm chart documentation for all charts in $PWD ..."
docker run --rm -v "$PWD":/charts helm-docs:local --chart-search-root /charts

echo "✅ Helm chart documentation generated/updated for all charts in $PWD"
