# ADR: Prometheus Stack Deployment for Kubernetes Monitoring

**Date:** 2025-11-26
**Status:** Accepted
**Deciders:** josimar-silva

## Context

A homelab Kubernetes cluster requires comprehensive monitoring and observability to:
- Track resource utilization and performance metrics
- Detect and alert on infrastructure issues
- Visualize system health and trends
- Support capacity planning and optimization
- Enable debugging and troubleshooting

The infrastructure is managed through GitOps using FluxCD, requiring a declarative approach to monitoring stack deployment. The solution must integrate with existing infrastructure components (Longhorn storage, Cloudflare tunnels, 1Password secret management) while providing enterprise-grade monitoring capabilities suitable for a production-like homelab environment.

## Decision

Deploy **kube-prometheus-stack** (Prometheus Operator) v79.8.2 via FluxCD HelmRelease, distributed through OCI registry, with security hardening and integration with existing infrastructure.

## Architecture

### Component Overview

```mermaid
flowchart TB
    subgraph Sources["Metric Sources"]
        API[API Server]
        Kubelet[Kubelet]
        DNS[CoreDNS]
        Proxy[kube-proxy]
        NE[node-exporter]
        KSM[kube-state-metrics]
        Apps[Application ServiceMonitors]
    end

    subgraph Monitoring["Monitoring Stack"]
        PO[Prometheus Operator]

        subgraph Prometheus["Prometheus"]
            P1[Prometheus Server]
            SM[ServiceMonitor CRDs]
            PR[PrometheusRule CRDs]
        end

        subgraph Storage["Persistent Storage"]
            PV1[Prometheus PVC<br/>50Gi Longhorn]
            PV2[Alertmanager PVC<br/>10Gi Longhorn]
            PV3[Grafana PVC<br/>10Gi Longhorn]
        end

        AM[Alertmanager]
        GR[Grafana]
    end

    subgraph Secrets["Secret Management"]
        OP[1Password]
        GS[Grafana Admin Secret]
    end

    subgraph Access["External Access"]
        CF[Cloudflare Tunnel]
        DNS_Record[grafana.from-gondor.com]
    end

    subgraph Security["Security Controls"]
        NP[NetworkPolicies<br/>9 policies]
        PSS[Pod Security Standard<br/>restricted]
        CSP[Security Headers<br/>CSP, HSTS]
    end

    Sources --> SM
    SM --> P1
    P1 --> PV1
    P1 --> PR
    PR --> AM
    AM --> PV2
    P1 --> GR
    GR --> PV3

    OP --> GS
    GS --> GR

    CF --> GR
    DNS_Record --> CF

    NP --> Monitoring
    PSS --> Monitoring
    CSP --> GR

    PO --> Prometheus
    PO --> AM
```

### Monitoring Data Flow

```mermaid
sequenceDiagram
    participant Target as Metric Target
    participant SM as ServiceMonitor
    participant PO as Prometheus Operator
    participant P as Prometheus
    participant AM as Alertmanager
    participant G as Grafana
    participant U as User

    PO->>SM: Watch for ServiceMonitors
    SM->>PO: Define scrape targets
    PO->>P: Update scrape configuration
    P->>Target: Scrape metrics (HTTP)
    Target-->>P: Return Prometheus metrics
    P->>P: Store in TSDB (50Gi)
    P->>P: Evaluate PrometheusRules
    P->>AM: Send alerts
    U->>G: Access grafana.from-gondor.com
    G->>P: Query metrics (PromQL)
    P-->>G: Return query results
    G-->>U: Render dashboards
```

### Security Architecture

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        User[User Browser]
    end

    subgraph Cloudflare["Cloudflare Edge"]
        CDN[CDN + DDoS Protection]
        Tunnel[Cloudflare Tunnel]
    end

    subgraph K8s["Kubernetes Cluster"]
        subgraph NSPolicy["Network Policies"]
            NP1[Prometheus Ingress<br/>Only from ServiceMonitors]
            NP2[Grafana Ingress<br/>Only from Cloudflare]
            NP3[Alertmanager Ingress<br/>Only from Prometheus]
            NP4[DNS Egress<br/>CoreDNS only]
            NP5[Webhook Egress<br/>Alertmanager only]
        end

        subgraph Monitoring["monitoring namespace"]
            PSS_Label[pod-security.kubernetes.io/enforce: restricted]

            Grafana[Grafana<br/>Read-only FS<br/>CSP Headers<br/>Rate Limiting]
            Prometheus[Prometheus<br/>Label-based Discovery<br/>Resource Limits]
            Alert[Alertmanager<br/>Resource Limits]
        end

        subgraph Secrets["Secret Management"]
            OP[1Password ESO]
            Secret[Grafana Admin Creds]
        end
    end

    User --> CDN
    CDN --> Tunnel
    Tunnel --> NP2
    NP2 --> Grafana
    Grafana --> Secret
    OP --> Secret

    Prometheus --> NP3
    NP3 --> Alert
```

## File Structure

```text
infrastructure/
├── base/
│   └── kube-prometheus-stack/
│       ├── kustomization.yaml           # Base configuration
│       ├── repository.yaml              # OCI Helm repository
│       ├── release.yaml                 # HelmRelease v79.8.2
│       ├── grafana-secret.yaml          # 1Password integration
│       └── network-policies.yaml        # Security policies
└── apps/
    └── monitoring/
        └── service-monitors/            # Application monitoring
```

## Key Decisions

### 1. Stack Selection: kube-prometheus-stack

**Decision:** Deploy kube-prometheus-stack (Prometheus Operator) instead of standalone components.

**Rationale:**
- **Industry Standard**: kube-prometheus-stack is the de facto monitoring solution for Kubernetes, with extensive community support and battle-tested in production environments
- **Integrated Components**: Bundles Prometheus, Alertmanager, Grafana, and operators in a cohesive package, reducing integration complexity
- **Operator Pattern**: Prometheus Operator provides Kubernetes-native CRDs (ServiceMonitor, PrometheusRule) enabling declarative monitoring configuration
- **Pre-configured Dashboards**: Ships with 20+ Grafana dashboards covering core Kubernetes components, reducing setup time
- **Automatic Discovery**: ServiceMonitor CRDs automatically discover and configure scrape targets based on label selectors

**Alternatives Considered:**
- **Standalone Prometheus + Grafana**: Rejected due to manual configuration overhead, no operator benefits, complex service discovery setup
- **VictoriaMetrics**: Not chosen as Prometheus meets current needs; VM would be considered for multi-cluster or higher scale
- **Cloud Provider Solutions** (GCP Monitoring, AWS CloudWatch): Not applicable for self-hosted homelab

**Trade-offs:**
- **Complexity**: Introduces operator patterns and additional CRDs to manage
- **Resource Overhead**: Operator adds ~100Mi memory, but automation benefits outweigh cost
- **Version Coupling**: Components versions are bundled; selective upgrades require values overrides

### 2. Distribution Method: OCI Registry

**Decision:** Use OCI registry (`oci://ghcr.io/prometheus-community/charts`) instead of traditional Helm repository.

**Rationale:**
- **Performance**: OCI registries leverage container image caching infrastructure, resulting in faster chart downloads (typically 2-3x faster than HTTP-based Helm repos)
- **Reliability**: Benefits from container registry redundancy and CDN distribution, reducing failure points
- **Ecosystem Alignment**: Native integration with container ecosystem tooling (registries, vulnerability scanners, artifact signing)
- **Future-Proof**: OCI is the strategic direction for Helm chart distribution (Helm 3.8+ native support)

**Alternatives Considered:**
- **Traditional Helm Repository** (`https://prometheus-community.github.io/helm-charts`): Functional but slower, HTTP-based, less cache-friendly

**Trade-offs:**
- **Tooling Support**: Some older Helm tooling may not support OCI; not an issue with FluxCD v2.0+
- **Migration Path**: Requires updating FluxCD HelmRepository resources, but one-time effort

**Implementation:**
```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: prometheus-community
spec:
  type: oci
  url: oci://ghcr.io/prometheus-community/charts
```

### 3. Storage Strategy: Longhorn with Retention Policy

**Decision:** Use Longhorn storage class for all persistent volumes with specific allocations and retention periods.

**Storage Allocations:**
- **Prometheus**: 50Gi with 30-day retention
- **Alertmanager**: 10Gi
- **Grafana**: 10Gi

**Rationale:**
- **Distributed Storage**: Longhorn provides replication across nodes, protecting against single-node failures
- **Dynamic Provisioning**: Automatic PVC creation eliminates manual storage management
- **Snapshots & Backup**: Built-in snapshot capabilities enable point-in-time recovery
- **Existing Infrastructure**: Already deployed and operational in the homelab
- **Data Locality**: Keeps monitoring data within the cluster, avoiding external dependencies

**Retention Calculation:**
Prometheus 30-day retention with 50Gi storage:
- Estimated ingestion rate: ~500 samples/sec across all targets
- Approximate storage requirement: 1.5-2Gi per day
- 50Gi provides comfortable buffer for 30 days (~45Gi expected usage)

**Alternatives Considered:**
- **Local Storage**: Rejected due to lack of replication, data loss on node failure
- **NFS**: Considered but introduces external dependency, potential network bottleneck for Prometheus writes
- **Object Storage (S3/Thanos)**: Overkill for single-cluster homelab; would reconsider for multi-cluster or long-term retention (1+ year)

**Trade-offs:**
- **Cost**: Longhorn replication consumes 3x raw storage (150Gi total for 50Gi Prometheus volume with 3 replicas)
- **Performance**: Network-attached storage has higher latency than local SSD, but acceptable for homelab monitoring workload
- **Complexity**: Requires Longhorn maintenance, but already operational

### 4. Secret Management: 1Password Integration

**Decision:** Use 1Password External Secrets Operator (ESO) for Grafana admin credentials.

**Rationale:**
- **Zero Secrets in Git**: No credentials committed to repository, eliminating primary attack vector
- **Centralized Management**: Single source of truth for all infrastructure secrets
- **Rotation Support**: Credentials can be rotated in 1Password without redeploying manifests
- **Audit Trail**: 1Password provides access logging and change history
- **Integration Consistency**: Aligns with existing homelab secret management strategy

**Alternatives Considered:**
- **Sealed Secrets**: Encrypts secrets but requires key management, no centralized rotation
- **HashiCorp Vault**: Enterprise-grade but operationally heavy for homelab (requires HA setup, maintenance)

**Trade-offs:**
- **External Dependency**: Monitoring stack requires 1Password Connect API availability
- **Complexity**: Additional operator and configuration overhead
- **Recovery**: Need 1Password access to recover from disaster scenarios


### 5. External Access: Cloudflare Tunnel

**Decision:** Expose Grafana via Cloudflare Tunnel to `grafana.from-gondor.com` instead of Ingress/Gateway API.

**Rationale:**
- **No Public IP Required**: Tunnel establishes outbound connections from cluster, eliminating need for port forwarding or public IP allocation
- **DDoS Protection**: Cloudflare edge network absorbs attacks before traffic reaches homelab
- **TLS at Edge**: Certificate management handled by Cloudflare, automatic rotation
- **Access Control**: Cloudflare Access can enforce authentication before traffic reaches Grafana
- **High Availability**: Cloudflare's global network provides 99.99% uptime SLA
- **Zero Trust**: Outbound-only connections reduce attack surface

**Alternatives Considered:**
- **Ingress + cert-manager**: Requires exposing Kubernetes cluster publicly, manual certificate management, no DDoS protection
- **Gateway API + LoadBalancer**: Similar limitations to Ingress, requires MetalLB IP, no edge security
- **NodePort**: Requires non-standard ports, manual firewall rules, no TLS automation
- **Port Forwarding**: Exposes home IP, no DDoS mitigation, fragile

**Trade-offs:**
- **Cloudflare Dependency**: Service unavailable if Cloudflare has outages
- **Latency**: Additional hop through Cloudflare edge (typically +20-50ms)
- **Vendor Lock-in**: Tunnel configuration is Cloudflare-specific

**Metrics:**
Prometheus and Alertmanager are intentionally **not** exposed externally, accessible only within cluster via:
- Port-forwarding for operator access: `kubectl port-forward -n monitoring svc/prometheus 9090:9090`
- Internal service mesh routing for ServiceMonitors

### 6. Security Hardening: Defense-in-Depth

**Decision:** Implement comprehensive security controls across network, pod, and application layers.

#### 6.1 Network Policies (Zero Trust Segmentation)

**Implemented Policies:**
1. **prometheus-ingress**: Allow only ServiceMonitor targets to reach Prometheus (ports 9090, 8080)
2. **prometheus-egress**: Allow Prometheus to scrape targets cluster-wide and access Kubernetes API
3. **alertmanager-ingress**: Allow only Prometheus to reach Alertmanager (port 9093)
4. **alertmanager-egress**: Allow Alertmanager webhook notifications and DNS resolution
5. **grafana-ingress**: Allow only Cloudflare Tunnel to reach Grafana (port 3000)
6. **grafana-egress**: Allow Grafana to query Prometheus and resolve DNS
7. **operator-ingress**: Allow operator metrics scraping (port 8080)
8. **operator-egress**: Allow operator to manage resources cluster-wide
9. **default-deny**: Deny all traffic not explicitly allowed

**Rationale:**
- **Lateral Movement Prevention**: Compromised monitoring component cannot pivot to other cluster resources
- **Blast Radius Reduction**: Limits scope of potential security incidents
- **Compliance**: Aligns with CIS Kubernetes Benchmark network segmentation requirements
- **Observability**: NetworkPolicies provide audit trail of intended traffic flows

#### 6.2 Pod Security Standards

**Decision:** Enforce `restricted` Pod Security Standard on `monitoring` namespace.

**Restrictions Applied:**
- No privileged containers
- No host namespaces (network, PID, IPC)
- No host path mounts
- Capabilities limited to minimal set
- Read-only root filesystems where possible
- Non-root user execution (UID > 1000)

**Rationale:**
- **Least Privilege**: Containers run with minimal permissions required for functionality
- **Container Breakout Prevention**: Restricted host access limits impact of container escape vulnerabilities
- **Standardization**: Enforces consistent security baseline across monitoring components

#### 6.3 Grafana Application Security

**Implemented Controls:**
- **Content Security Policy (CSP)**: Restricts resource loading to prevent XSS attacks
- **HTTP Strict Transport Security (HSTS)**: Forces HTTPS, prevents protocol downgrade attacks
- **Rate Limiting**: 100 requests/minute per IP to mitigate brute force and DoS
- **Session Security**: 24-hour timeout, secure cookies, SameSite strict
- **Read-only Filesystem**: Immutable container filesystem prevents runtime tampering
- **Disable Features**: Anonymous access disabled, user signup disabled, embedding restrictions

**Configuration:**
```yaml
grafana.ini:
  server:
    enforce_domain: true
    enable_gzip: true
  security:
    admin_user: ${GF_SECURITY_ADMIN_USER}
    admin_password: ${GF_SECURITY_ADMIN_PASSWORD}
    disable_gravatar: true
    cookie_secure: true
    cookie_samesite: strict
    strict_transport_security: true
    content_security_policy: true
  auth:
    disable_login_form: false
    oauth_auto_login: false
  auth.anonymous:
    enabled: false
```

**Rationale:**
- **Public Exposure**: Grafana is internet-accessible, requiring hardened security posture
- **Sensitive Data**: Dashboards may reveal infrastructure topology and metrics
- **Authentication Gateway**: First line of defense before cluster access

#### 6.4 ServiceMonitor Label Restrictions

**Decision:** Configure Prometheus to discover only ServiceMonitors with specific label selectors.

**Configuration:**
```yaml
prometheus:
  prometheusSpec:
    serviceMonitorSelector:
      matchLabels:
        prometheus: kube-prometheus-stack
```

**Rationale:**
- **Unauthorized Scraping Prevention**: Prevents rogue ServiceMonitors from causing Prometheus to scrape sensitive endpoints
- **Resource Control**: Limits scrape targets to approved services, preventing resource exhaustion
- **Multi-tenancy**: Enables future scenarios where multiple Prometheus instances coexist with isolated targets

**Trade-offs:**
- **Label Management**: Requires consistent labeling of all ServiceMonitors
- **Discoverability**: Non-labeled ServiceMonitors silently ignored, requires documentation

**Overall Security Philosophy:**
Defense-in-depth with overlapping controls ensures no single security failure compromises the monitoring stack. Each layer (network, pod, application) provides independent mitigation.

### 7. GitOps Management: FluxCD HelmRelease

**Decision:** Deploy via FluxCD HelmRelease with declarative configuration.

**Rationale:**
- **Infrastructure as Code**: All monitoring configuration versioned in Git, enabling change tracking and rollback
- **Git as Source of Truth**: Cluster state automatically reconciles with Git, preventing configuration drift
- **Automated Reconciliation**: FluxCD detects and applies changes within reconciliation interval (default 1m)
- **Consistency**: Identical deployment process across all infrastructure components
- **Audit Trail**: Git commits provide complete history of monitoring configuration changes

**HelmRelease Configuration:**
```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: 79.8.2
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    # ... configuration ...
```

**Alternatives Considered:**
- **Manual Helm Install**: Rejected due to configuration drift, no rollback capability, manual reconciliation required
- **ArgoCD**: Functional alternative but introduces additional tool; FluxCD already standardized in homelab
- **Kubernetes Manifests**: Possible but loses Helm templating benefits, complex upgrade path

**Trade-offs:**
- **Learning Curve**: Requires understanding FluxCD HelmRelease CRD and reconciliation behavior
- **Debugging Complexity**: Issues may occur in multiple layers (Git, FluxCD, Helm, Kubernetes)
- **Bootstrap Dependency**: Monitoring stack requires FluxCD operational, circular dependency in bootstrapping scenario

### 8. Component Configuration: Selective Monitoring

**Decision:** Disable monitoring for control plane components not accessible in typical cluster environments; enable comprehensive data plane monitoring.

#### Disabled Components:
- **etcd**: Not exposed in managed Kubernetes or k3s default configurations
- **kube-controller-manager**: Metrics endpoint not accessible without control plane access
- **kube-scheduler**: Metrics endpoint not accessible without control plane access

#### Enabled Components:
- **kube-apiserver**: Core cluster API monitoring
- **kubelet**: Node-level container metrics (critical for resource monitoring)
- **CoreDNS**: DNS query performance and error rates
- **kube-proxy**: Network proxy metrics
- **node-exporter**: Hardware and OS metrics (CPU, memory, disk, network)
- **kube-state-metrics**: Kubernetes object state (deployments, pods, services)

**Rationale:**
- **Pragmatic Approach**: Focus monitoring on accessible and actionable components
- **Reduced Alert Noise**: Disabling inaccessible components prevents persistent scrape failures
- **Resource Efficiency**: Avoids wasted CPU/memory on failing scrape attempts
- **Coverage**: Enabled components provide comprehensive data plane observability


**Trade-offs:**
- **Incomplete Control Plane Visibility**: Cannot monitor control plane health in managed environments (acceptable for homelab)
- **Resource Overhead**: node-exporter DaemonSet runs on every node (~50Mi memory per node)

## Consequences

### Positive

1. **Comprehensive Observability**: Full visibility into cluster health, performance, and resource utilization across all layers
2. **Production-Grade Monitoring**: Enterprise-quality monitoring stack suitable for critical homelab workloads
3. **Security Hardening**: Defense-in-depth approach significantly reduces attack surface and blast radius
4. **Operational Efficiency**: Declarative GitOps management reduces manual intervention, enables self-healing
5. **Cost-Effective External Access**: Cloudflare Tunnel eliminates need for static IP or VPN while providing DDoS protection
6. **Scalability**: Prometheus Operator pattern scales seamlessly as new services are added via ServiceMonitors
7. **Integration**: Native integration with existing infrastructure (Longhorn, 1Password, FluxCD)

### Negative

1. **Resource Consumption**: Full stack consumes ~3Gi memory and ~1 CPU core under typical load
2. **Storage Costs**: 150Gi total storage (50Gi × 3 replicas) for Prometheus data
3. **Complexity**: Multiple operators, CRDs, and networking policies increase system complexity
4. **External Dependencies**: Relies on Cloudflare (Grafana access) and 1Password (secrets) availability
5. **Learning Curve**: Team members must understand Prometheus PromQL, Grafana dashboards, and operator patterns

### Neutral

1. **Maintenance Overhead**: Regular updates required for chart, operators, and component versions
2. **Backup Requirements**: Grafana dashboards and Prometheus data should be backed up (Longhorn snapshots)
3. **Alert Tuning**: Initial alert rules require tuning to reduce false positives
4. **Dashboard Customization**: Default dashboards may need customization for specific homelab use cases

## Implementation Details

### Deployment Process

1. **FluxCD applies HelmRepository**: Configures OCI registry connection
2. **FluxCD reconciles HelmRelease**: Downloads chart v79.8.2, renders templates with values
3. **Prometheus Operator deploys**: Creates CRDs (ServiceMonitor, PrometheusRule, Alertmanager, etc.)
4. **Core components start**: Prometheus, Alertmanager, Grafana pods created with PVCs
5. **ServiceMonitors discovered**: Operator configures Prometheus scrape targets based on label selectors
6. **NetworkPolicies enforced**: Zero-trust network segmentation activated
7. **1Password ESO syncs**: Grafana admin credentials populated from 1Password vault
8. **Cloudflare Tunnel connects**: Grafana accessible at grafana.from-gondor.com

### Monitoring Coverage

**Cluster-Level Metrics:**
- Node CPU, memory, disk, network utilization
- Cluster capacity and allocation rates
- Pod resource consumption and limits
- Persistent volume usage

**Application Metrics:**
- HTTP request rates and latencies (via ServiceMonitors)
- Application-specific business metrics (custom exporters)
- Job and CronJob execution status

**Networking Metrics:**
- CoreDNS query rates and error rates
- Service mesh traffic (if applicable)
- Ingress/Gateway request patterns

### Pre-configured Dashboards

kube-prometheus-stack includes 20+ Grafana dashboards:
- **Kubernetes / Compute Resources / Cluster**: Cluster-wide CPU, memory, network
- **Kubernetes / Compute Resources / Namespace**: Per-namespace resource usage
- **Kubernetes / Compute Resources / Pod**: Per-pod resource usage
- **Kubernetes / Networking / Cluster**: Network bandwidth and packet rates
- **Node Exporter / Nodes**: Hardware-level metrics (CPU, disk I/O, filesystem)
- **Prometheus / Overview**: Prometheus server health and performance

### Alert Rules

Default alert rules cover:
- **Availability**: Pod/deployment down, node not ready
- **Resource Exhaustion**: High CPU/memory, disk full
- **Kubernetes Objects**: CrashLoopBackOff, ImagePullBackOff
- **Prometheus Health**: Scrape failures, rule evaluation failures

### Upgrade Strategy

1. **Monitor Release Notes**: Review kube-prometheus-stack and component changelogs
2. **Update Chart Version**: Modify HelmRelease chart version in Git
3. **Commit and Push**: FluxCD automatically reconciles within 30m
4. **Validate**: Check Prometheus, Grafana, Alertmanager pods healthy
5. **Test Queries**: Verify dashboards and alerts functional
6. **Rollback if Needed**: Git revert triggers automatic rollback

### Disaster Recovery

**Backup Strategy:**
- **Prometheus Data**: Longhorn snapshots every 6 hours, retained 7 days
- **Grafana Dashboards**: Exported as JSON, stored in Git repository
- **Alert Rules**: PrometheusRule CRDs in Git (source of truth)

**Recovery Process:**
1. FluxCD redeploys HelmRelease from Git
2. Longhorn restores PVCs from snapshots
3. 1Password ESO re-syncs Grafana credentials
4. Cloudflare Tunnel auto-reconnects

**RTO/RPO:**
- Recovery Time Objective (RTO): ~15 minutes (Kubernetes pod restart time)
- Recovery Point Objective (RPO): ~6 hours (snapshot interval)

## References

- [kube-prometheus-stack Chart Documentation](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Prometheus Operator Documentation](https://prometheus-operator.dev/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Grafana Security Guide](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/)
- [FluxCD Helm Controller Documentation](https://fluxcd.io/flux/components/helm/)
