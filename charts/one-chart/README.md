# one-chart

![Version: 0.7.0](https://img.shields.io/badge/Version-0.7.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 1.16.0](https://img.shields.io/badge/AppVersion-1.16.0-informational?style=flat-square)

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
| cloudflared | object | `{"enabled":false,"image":{"repository":"cloudflare/cloudflared","tag":"2025.7.0"},"onepassword":{"item":"","vault":"Homelab"},"podAnnotations":{},"podLabels":{},"prometheus":{"enabled":false,"interval":"30s","path":"/metrics","port":2000,"scrapeTimeout":"10s"},"replicaCount":2,"tunnel":{"localHostname":"","name":"","publicHostname":""}}` | Cloudflared settings |
| cloudflared.enabled | bool | `false` | Enable Cloudflared deployment |
| cloudflared.image | object | `{"repository":"cloudflare/cloudflared","tag":"2025.7.0"}` | Cloudflared image repository |
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
| cloudflared.tunnel | object | `{"localHostname":"","name":"","publicHostname":""}` | Tunnel configuration |
| cloudflared.tunnel.localHostname | string | `""` | Local service hostname to expose through the tunnel |
| cloudflared.tunnel.name | string | `""` | Name of the Cloudflare tunnel |
| cloudflared.tunnel.publicHostname | string | `""` | Public hostname for the tunnel |
| dns | object | `{"enabled":false}` | DNS configuration for the application |
| environmentVariables | object | `{"container":{"enabled":false},"fromConfigMap":{"enabled":false},"fromSecret":{"enabled":false}}` | Environment variables for the deployment |
| fullnameOverride | string | `""` | Override the full resource name |
| homelab | object | `{"category":"apps","realm":"playground"}` | Homelab settings |
| homelab.category | string | `"apps"` | Homelab category label. Defaults to "apps". |
| homelab.realm | string | `"playground"` | Homelab realm label. Defaults to "playground". |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| image.repository | string | `"nginx"` | Container image repository |
| image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion |
| imagePullSecrets | list | `[]` | Image pull secrets for private registries |
| internalIngress.annotations | object | `{}` | Annotations for the ingress |
| internalIngress.className | string | `"internal-ingress"` | Ingress class name. Defaults to "internal-ingress" |
| internalIngress.enabled | bool | `false` | Enable internal ingress |
| internalIngress.hosts | list | `[{"host":"chart-example.local","paths":[{"path":"/","pathType":"ImplementationSpecific","port":"http"}]}]` | Ingress hosts and paths |
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
| service.type | string | `"ClusterIP"` | Kubernetes service type. Defaults to ClusterIP. |
| strategy | object | `{}` | Deployment strategy |
| tolerations | list | `[]` | Tolerations for pod scheduling |
| volumeMounts | list | `[]` | Additional volume mounts for the container |
| volumes | list | `[]` | Additional volumes for the pod |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.13.1](https://github.com/norwoodj/helm-docs/releases/v1.13.1)
