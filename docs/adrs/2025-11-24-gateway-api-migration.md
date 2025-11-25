# ADR: Migration from Ingress to Gateway API

**Date:** 2025-11-24
**Status:** Accepted
**Deciders:** josimar-silva

## Context

The homelab infrastructure uses ingress-nginx for routing external traffic to services. Gateway API is the successor to Ingress, offering improved extensibility, role-oriented design, and better separation of concerns.

## Decision

Migrate from ingress-nginx to Gateway API with NGINX Gateway Fabric as the implementation.

## Architecture

### Component Overview

```mermaid
flowchart TB
    subgraph External["External Traffic"]
        Client[Client Request]
    end

    subgraph MetalLB["MetalLB Load Balancer"]
        LB[LoadBalancer Service<br/>homelab-local-pool]
    end

    subgraph GatewayAPI["Gateway API Layer"]
        GC[GatewayClass<br/>nginx]
        GW[Gateway<br/>internal-gateway]

        subgraph Listeners["Listeners"]
            L1[HTTP :80]
            L2[HTTPS :443<br/>*.from-gondor.com]
            L3[HTTPS :443<br/>*.internal.from-gondor.com]
        end
    end

    subgraph Routes["HTTPRoutes"]
        HR1[hello-from-gondor]
        HR2[speedtest-tracker]
        HR3[pgadmin]
        HR4[pihole]
        HR5[kubernetes-dashboard]
    end

    subgraph Services["Backend Services"]
        S1[hello-svc]
        S2[speedtest-svc]
        S3[pgadmin-svc]
        S4[pihole-svc]
        S5[dashboard-svc]
    end

    subgraph TLS["TLS Management"]
        CM[cert-manager]
        CI[ClusterIssuer<br/>letsencrypt-production]

        subgraph Certs["Certificates"]
            C1[wildcard-from-gondor-tls]
            C2[wildcard-internal-from-gondor-tls]
        end
    end

    subgraph Controller["NGINX Gateway Fabric"]
        NGF[nginx-gateway-fabric<br/>2 replicas]
    end

    Client --> LB
    LB --> NGF
    NGF --> GW
    GC --> GW
    GW --> L1 & L2 & L3
    L2 & L3 --> Routes
    HR1 & HR2 & HR3 & HR4 & HR5 --> Services

    CM --> CI
    CI --> C1 & C2
    C1 --> L2
    C2 --> L3
```

### Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant M as MetalLB
    participant N as NGINX Gateway Fabric
    participant G as Gateway
    participant R as HTTPRoute
    participant S as Service
    participant P as Pod

    C->>M: HTTPS request to app.from-gondor.com
    M->>N: Forward to LoadBalancer IP
    N->>G: Match Gateway listener (*.from-gondor.com)
    G->>G: TLS termination with wildcard cert
    G->>R: Match HTTPRoute by hostname
    R->>S: Route to backend service
    S->>P: Load balance to pod
    P-->>C: Response
```

### Resource Relationships

```mermaid
erDiagram
    GatewayClass ||--o{ Gateway : "defines"
    Gateway ||--|{ Listener : "has"
    Listener ||--o{ HTTPRoute : "accepts"
    HTTPRoute }|--|| Service : "routes to"
    Service ||--|{ Pod : "selects"

    Certificate ||--|| Secret : "creates"
    Listener ||--o| Secret : "references"
    ClusterIssuer ||--o{ Certificate : "issues"
```

## File Structure

```
infrastructure/
├── base/
│   ├── gateway-api/
│   │   └── kustomization.yaml      # Gateway API CRDs (v1.4.0)
│   └── nginx-gateway-fabric/
│       ├── kustomization.yaml
│       ├── repository.yaml          # Helm repository
│       ├── release.yaml             # HelmRelease (v2.2.1)
│       ├── gateway-class.yaml       # GatewayClass: nginx
│       └── gateway.yaml             # Gateway: internal-gateway
└── configs/
    └── gateway-certificates/
        ├── kustomization.yaml
        └── certificates.yaml        # Wildcard certificates
```

## Key Differences from Ingress

| Aspect | Ingress | Gateway API |
|--------|---------|-------------|
| TLS Certificates | Annotation-driven | Explicit Certificate CRs |
| Routing | Single Ingress resource | Separate Gateway + HTTPRoute |
| Role separation | None | Infra (Gateway) vs App (HTTPRoute) |
| Extensibility | Limited | Highly extensible |
| Multi-tenancy | Difficult | Native support |

## Consequences

### Positive
- Better separation of infrastructure and application concerns
- More expressive routing capabilities
- Future-proof (Gateway API is the Kubernetes standard)
- Easier multi-team workflows

### Negative
- More resources to manage (Gateway + HTTPRoute vs single Ingress)
- Learning curve for Gateway API concepts
- Migration effort for existing services

### Neutral
- Similar performance characteristics
- Same underlying NGINX data plane

## Migration Strategy

1. **Parallel running**: Deploy Gateway API alongside existing Ingress
2. **Incremental migration**: Migrate apps one by one
3. **Validation**: Verify each app works via Gateway
4. **Cleanup**: Remove Ingress resources after full validation

## Related Documents

- [Gateway API Migration Plan](https://github.com/josimar-silva/homelab/issues/225)
- [NGINX Gateway Fabric Documentation](https://docs.nginx.com/nginx-gateway-fabric/)
