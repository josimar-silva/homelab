# one-chart

![Version: 0.14.0](https://img.shields.io/badge/Version-0.14.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 1.16.0](https://img.shields.io/badge/AppVersion-1.16.0-informational?style=flat-square)

One chart to rule them all. One chart to pack them. One chart to bring them all and in the YAMLness bind them.

**Homepage:** <https://github.com/josimar-silva/homelab/tree/main/charts/one-chart>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| Josimar Silva | <josimar-silva@from-gondor.com> |  |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity rules for pod scheduling |
| automountServiceAccountToken | bool | `false` | Automatically mount service account token. Set to true for applications that need Kubernetes API access. Default is false for security (secure by default). |
| cloudflared | object | `{"enabled":false,"image":{"repository":"cloudflare/cloudflared","tag":"2025.11.1"},"onepassword":{"item":"","vault":"Homelab"},"podAnnotations":{},"podLabels":{},"prometheus":{"enabled":false,"interval":"30s","path":"/metrics","port":2000,"scrapeTimeout":"10s"},"replicaCount":2,"strategy":{"type":"Recreate"},"tunnel":{"localHostname":"","name":"","publicHostname":""}}` | Cloudflared settings |
| cloudflared.enabled | bool | `false` | Enable Cloudflared deployment |
| cloudflared.image | object | `{"repository":"cloudflare/cloudflared","tag":"2025.11.1"}` | Cloudflared image repository |
| cloudflared.onepassword | object | `{"item":"","vault":"Homelab"}` | 1Password integration settings for Cloudflared credentials |
| cloudflared.onepassword.item | string | `""` | The name of the item within the vault containing Cloudflared credentials |
| cloudflared.onepassword.vault | string | `"Homelab"` | The name of the 1Password vault where Cloudflared credentials are stored |
| cloudflared.podAnnotations | object | `{}` | Annotations for the Cloudflared pod |
| cloudflared.podLabels | object | `{}` | Additional labels for the Cloudflared pod |
| cloudflared.prometheus | object | `{"enabled":false,"interval":"30s","path":"/metrics","port":2000,"scrapeTimeout":"10s"}` | Prometheus settings for Cloudflared |
| cloudflared.prometheus.enabled | bool | `false` | Enable Prometheus scraping for Cloudflared |
| cloudflared.prometheus.interval | string | `"30s"` | Interval at which to scrape metrics for Cloudflared |
| cloudflared.prometheus.path | string | `"/metrics"` | Path to scrape metrics from for Cloudflared |
| cloudflared.prometheus.port | int | `2000` | Port to scrape metrics from for Cloudflared |
| cloudflared.prometheus.scrapeTimeout | string | `"10s"` | Scrape timeout for Cloudflared |
| cloudflared.replicaCount | int | `2` | Number of replicas for the Cloudflared deployment |
| cloudflared.strategy | object | `{"type":"Recreate"}` | Deployment strategy |
| cloudflared.tunnel | object | `{"localHostname":"","name":"","publicHostname":""}` | Tunnel configuration |
| cloudflared.tunnel.localHostname | string | `""` | Local service hostname to expose through the tunnel |
| cloudflared.tunnel.name | string | `""` | Name of the Cloudflare tunnel |
| cloudflared.tunnel.publicHostname | string | `""` | Public hostname for the tunnel |
| dns | object | `{"enabled":false}` | DNS configuration for the application |
| environmentVariables | object | `{"container":{"enabled":false},"fromConfigMap":{"enabled":false},"fromSecret":{"enabled":false}}` | Environment variables for the deployment |
| extraContainers | list | `[]` | Add additional containers |
| fullnameOverride | string | `""` | Override the full resource name |
| homelab | object | `{"category":"apps","realm":"playground"}` | Homelab settings |
| homelab.category | string | `"apps"` | Homelab category label. Defaults to "apps". |
| homelab.realm | string | `"playground"` | Homelab realm label. Defaults to "playground". |
| httpRoute | object | `{"annotations":{},"enabled":false,"hostnames":["chart-example.local"],"parentRef":{"name":"internal-gateway","namespace":"ingress-nginx"},"rules":[{"matches":[{"path":"/","pathType":"PathPrefix"}],"port":80}]}` | HTTPRoute configuration for Gateway API |
| httpRoute.annotations | object | `{}` | Annotations for the HTTPRoute |
| httpRoute.enabled | bool | `false` | Enable HTTPRoute (Gateway API) |
| httpRoute.hostnames | list | `["chart-example.local"]` | Hostnames for the HTTPRoute |
| httpRoute.parentRef | object | `{"name":"internal-gateway","namespace":"ingress-nginx"}` | Parent Gateway reference |
| httpRoute.parentRef.name | string | `"internal-gateway"` | Name of the parent Gateway. Defaults to "internal-gateway" |
| httpRoute.parentRef.namespace | string | `"ingress-nginx"` | Namespace of the parent Gateway. Defaults to "ingress-nginx" |
| httpRoute.rules | list | `[{"matches":[{"path":"/","pathType":"PathPrefix"}],"port":80}]` | Routing rules |
| httpRoute.rules[0].port | int | `80` | Port to route traffic to. Defaults to 80 |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| image.repository | string | `"nginx"` | Container image repository |
| image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion |
| imagePullSecrets | list | `[]` | Image pull secrets for private registries |
| initContainers | list | `[]` | Init containers to run before the main container |
| nameOverride | string | `""` | Override the chart name |
| nodeSelector | object | `{}` | Node selector for pod scheduling |
| onepassword | object | `{"enabled":false,"item":"","secretName":"","vault":"Homelab"}` | 1Password integration settings |
| onepassword.enabled | bool | `false` | Enable creating a OnePasswordItem to generate a Kubernetes Secret. |
| onepassword.item | string | `""` | The name of the item within the vault. |
| onepassword.secretName | string | `""` | The name of the Kubernetes Secret to be created by the operator. Defaults to <Release Name>-onepassword. |
| onepassword.vault | string | `"Homelab"` | The name of the 1Password vault. |
| persistentVolume.accessModes | list | `["ReadWriteOnce"]` | Access modes for PVC. Defaults to ReadWriteOnce |
| persistentVolume.enabled | bool | `false` | Enable persistent volume claim |
| persistentVolume.mountPath | string | `"/data"` | Mount path for the persistent volume. Defaults to /data |
| persistentVolume.size | string | `"1Gi"` | Size of the persistent volume. Defaults to 1Gi |
| persistentVolume.storageClass | string | `"longhorn-default-sc"` | Storage class for PVC. Defaults to "longhorn-default-sc" |
| persistentVolumes | list | `[]` | List of persistent volumes for the deployment. Takes precedence over `persistentVolume` (single volume) for backward compatibility. |
| podAnnotations | object | `{}` | Annotations for the pod |
| podLabels | object | `{}` | Additional labels for the pod |
| podSecurityContext | object | `{}` | Pod-level security context |
| prometheus.enabled | bool | `false` | Enable Prometheus scraping |
| prometheus.interval | string | `"30s"` | Interval at which to scrape metrics |
| prometheus.path | string | `"/metrics"` | Path to scrape metrics from |
| prometheus.port | int | `80` | Port to scrape metrics from |
| prometheus.scrapeTimeout | string | `"10s"` | Scrape timeout |
| replicaCount | int | `1` | Number of replicas for the deployment |
| resources | object | `{}` | Resource requests and limits |
| securityContext | object | `{}` | Container-level security context |
| service.annotations | object | `{}` | Annotations for the service |
| service.port | int | `80` | Service port. Defaults to 80. Kept for backward compatibility. Use `ports` for multiple ports. |
| service.ports | list | `[]` | Service ports. Takes precedence over `service.port`. |
| service.sharedIpEnabled | bool | `false` | Enable shared IP feature for LoadBalancer services |
| service.type | string | `"ClusterIP"` | Kubernetes service type. Defaults to ClusterIP. |
| serviceAccountName | string | `""` | Service account name for the pod. Leave empty to use the default service account. WARNING: Using the default service account is not recommended for applications that require Kubernetes API access. Create a dedicated ServiceAccount with minimal RBAC. |
| strategy | object | `{}` | Deployment strategy |
| tolerations | list | `[]` | Tolerations for pod scheduling |
| volumeMounts | list | `[]` | Additional volume mounts for the container |
| volumes | list | `[]` | Additional volumes for the pod |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.13.1](https://github.com/norwoodj/helm-docs/releases/v1.13.1)
