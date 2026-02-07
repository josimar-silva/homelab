#!/bin/bash
#
# DNS Health Check Script
# Validates NodeLocal DNSCache and CoreDNS configuration
#
# Usage: ./scripts/dns-health-check.sh
#

set -e

echo "================================================================"
echo "DNS Health Check - $(date)"
echo "================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

echo "1. NodeLocal DNS DaemonSet Status"
echo "-----------------------------------"
if kubectl get daemonset node-local-dns -n kube-system &>/dev/null; then
    DESIRED=$(kubectl get daemonset node-local-dns -n kube-system -o jsonpath='{.status.desiredNumberScheduled}')
    READY=$(kubectl get daemonset node-local-dns -n kube-system -o jsonpath='{.status.numberReady}')

    if [ "$DESIRED" -eq "$READY" ]; then
        success "NodeLocal DNS DaemonSet is healthy: $READY/$DESIRED pods ready"
    else
        warning "NodeLocal DNS DaemonSet is degraded: $READY/$DESIRED pods ready"
    fi

    kubectl get pods -n kube-system -l k8s-app=node-local-dns -o wide
else
    error "NodeLocal DNS DaemonSet not found"
fi

echo ""
echo "2. CoreDNS Pod Status"
echo "---------------------"
if kubectl get pods -n kube-system -l k8s-app=kube-dns &>/dev/null; then
    COREDNS_PODS=$(kubectl get pods -n kube-system -l k8s-app=kube-dns --no-headers | wc -l)
    COREDNS_READY=$(kubectl get pods -n kube-system -l k8s-app=kube-dns --field-selector=status.phase=Running --no-headers | wc -l)

    if [ "$COREDNS_PODS" -eq "$COREDNS_READY" ]; then
        success "CoreDNS is healthy: $COREDNS_READY/$COREDNS_PODS pods ready"
    else
        warning "CoreDNS is degraded: $COREDNS_READY/$COREDNS_PODS pods ready"
    fi

    kubectl get pods -n kube-system -l k8s-app=kube-dns
else
    error "CoreDNS pods not found"
fi

echo ""
echo "3. DNS Configuration Check"
echo "--------------------------"

# Check if force_tcp is enabled in CoreDNS
if kubectl get cm coredns -n kube-system -o yaml | grep -q "force_tcp"; then
    success "CoreDNS has force_tcp enabled"
else
    warning "CoreDNS does not have force_tcp enabled"
fi

# Check if NodeLocal DNS ConfigMap exists
if kubectl get cm node-local-dns -n kube-system &>/dev/null; then
    success "NodeLocal DNS ConfigMap exists"

    # Check if force_tcp is enabled in NodeLocal DNS
    if kubectl get cm node-local-dns -n kube-system -o yaml | grep -q "force_tcp"; then
        success "NodeLocal DNS has force_tcp enabled"
    else
        warning "NodeLocal DNS does not have force_tcp enabled"
    fi
else
    error "NodeLocal DNS ConfigMap not found"
fi

echo ""
echo "4. DNS Resolution Test"
echo "----------------------"

# Test DNS resolution
if timeout 10 kubectl run test-dns-check-$RANDOM --image=busybox:1.36 --rm -i --restart=Never --quiet -- nslookup google.com &>/dev/null; then
    success "DNS resolution test passed"

    # Get the nameserver used
    NAMESERVER=$(timeout 10 kubectl run test-dns-check-$RANDOM --image=busybox:1.36 --rm -i --restart=Never --quiet -- cat /etc/resolv.conf 2>/dev/null | grep "^nameserver" | head -1 | awk '{print $2}')

    if [ "$NAMESERVER" == "169.254.20.10" ]; then
        success "Pods are using NodeLocal DNS (169.254.20.10)"
    elif [ "$NAMESERVER" == "10.96.0.10" ]; then
        warning "Pods are using CoreDNS directly (10.96.0.10) - NodeLocal DNS may not be active"
    else
        warning "Pods are using unexpected DNS server: $NAMESERVER"
    fi
else
    error "DNS resolution test failed"
fi

echo ""
echo "5. Cache Statistics"
echo "-------------------"

if kubectl get pods -n kube-system -l k8s-app=node-local-dns &>/dev/null; then
    # Get first NodeLocal DNS pod
    POD=$(kubectl get pods -n kube-system -l k8s-app=node-local-dns -o name | head -1)

    if [ -n "$POD" ]; then
        # Get cache metrics with port-forward
        METRICS=$(timeout 10 kubectl port-forward -n kube-system $POD 9253:9253 >/dev/null 2>&1 &
        PF_PID=$!
        sleep 2
        curl -s http://localhost:9253/metrics 2>/dev/null
        kill $PF_PID 2>/dev/null || true
        wait $PF_PID 2>/dev/null || true)

        if [ -n "$METRICS" ]; then
            # Sum all cache hits across all zones and types
            CACHE_HITS=$(echo "$METRICS" | grep 'coredns_cache_hits_total' | grep -v '#' | awk -F' ' '{sum += $NF} END {if (sum > 0) print int(sum)}')
            # Sum all cache misses across all zones
            CACHE_MISSES=$(echo "$METRICS" | grep 'coredns_cache_misses_total' | grep -v '#' | awk -F' ' '{sum += $NF} END {if (sum > 0) print int(sum)}')

            if [ -n "$CACHE_HITS" ] && [ -n "$CACHE_MISSES" ]; then
                TOTAL=$((CACHE_HITS + CACHE_MISSES))

                if [ $TOTAL -gt 0 ]; then
                    HIT_RATE=$(awk "BEGIN {printf \"%.2f\", ($CACHE_HITS / $TOTAL) * 100}")
                    echo "Cache Hits: $CACHE_HITS"
                    echo "Cache Misses: $CACHE_MISSES"
                    echo "Hit Rate: ${HIT_RATE}%"

                    if (( $(echo "$HIT_RATE > 80" | bc -l) )); then
                        success "Cache hit rate is healthy (${HIT_RATE}%)"
                    elif (( $(echo "$HIT_RATE > 50" | bc -l) )); then
                        warning "Cache hit rate is moderate (${HIT_RATE}%)"
                    else
                        warning "Cache hit rate is low (${HIT_RATE}%) - may need warm-up time"
                    fi
                else
                    warning "No cache activity yet (cache may be warming up)"
                fi
            elif [ -n "$CACHE_HITS" ] && [ -z "$CACHE_MISSES" ]; then
                # Only hits available
                echo "Cache Hits: $CACHE_HITS"
                success "Cache is active with $CACHE_HITS hits"
            else
                warning "Could not parse cache metrics"
            fi
        else
            error "Could not fetch metrics from NodeLocal DNS pod"
        fi
    else
        error "No NodeLocal DNS pods found"
    fi
else
    error "NodeLocal DNS not deployed"
fi

echo ""
echo "6. Recent DNS Errors (Last 100 Lines)"
echo "--------------------------------------"

# Check for DNS timeout errors in application logs
# Adjust namespace/label based on your monitoring setup
if kubectl get namespace gatus &>/dev/null; then
    TIMEOUT_ERRORS=$(kubectl logs -n gatus -l app.kubernetes.io/name=gatus --tail=100 2>/dev/null | grep -c "i/o timeout" || echo "0")

    if [ "$TIMEOUT_ERRORS" -eq 0 ]; then
        success "No DNS timeout errors found in Gatus logs"
    else
        warning "Found $TIMEOUT_ERRORS DNS timeout errors in recent Gatus logs"
    fi
else
    warning "Gatus namespace not found - skipping application error check"
fi

echo ""
echo "7. Resource Usage"
echo "-----------------"

if command -v kubectl-top &>/dev/null || kubectl top pods -n kube-system &>/dev/null 2>&1; then
    echo "NodeLocal DNS resource usage:"
    kubectl top pods -n kube-system -l k8s-app=node-local-dns 2>/dev/null || warning "Metrics server not available"

    echo ""
    echo "CoreDNS resource usage:"
    kubectl top pods -n kube-system -l k8s-app=kube-dns 2>/dev/null || warning "Metrics server not available"
else
    warning "kubectl top not available - install metrics-server to view resource usage"
fi

echo ""
echo "================================================================"
echo "Health Check Complete"
echo "================================================================"
echo ""

# Exit with appropriate code
if kubectl get daemonset node-local-dns -n kube-system &>/dev/null; then
    READY=$(kubectl get daemonset node-local-dns -n kube-system -o jsonpath='{.status.numberReady}')
    DESIRED=$(kubectl get daemonset node-local-dns -n kube-system -o jsonpath='{.status.desiredNumberScheduled}')

    if [ "$READY" -eq "$DESIRED" ]; then
        echo -e "${GREEN}Overall Status: HEALTHY${NC}"
        exit 0
    else
        echo -e "${YELLOW}Overall Status: DEGRADED${NC}"
        exit 1
    fi
else
    echo -e "${RED}Overall Status: NOT DEPLOYED${NC}"
    exit 2
fi
