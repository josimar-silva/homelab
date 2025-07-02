#!/bin/bash

set -euo pipefail

if ! command -v helm &> /dev/null || ! helm plugin list | grep -q "unittest"; then
    echo "Error: helm or helm-unittest plugin not found."
    echo "Please install Helm (https://helm.sh/docs/intro/install/) and helm-unittest (https://github.com/helm-unittest/helm-unittest#installation)."
    exit 1
fi

for chart in charts/*/; do
    echo "🧪 Running unittest on chart: $chart"
    helm unittest "$chart"
done

echo "All Helm unit tests completed."
