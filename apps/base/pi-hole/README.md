# pi-hole

- [Docs](https://pi-hole.net/)
- [Helm Chart Docs](https://mojo2600.github.io/pihole-kubernetes/)
- [Helm Chart Repo](https://github.com/MoJo2600/pihole-kubernetes) 
- [Example Installation by Jeff Geerling](https://www.youtube.com/watch?v=IafVCHkJbtI&t=2655s)

## Installation

```sh
helm repo add mojo2600 https://mojo2600.github.io/pihole-kubernetes/
```

```sh
helm upgrade -i pihole mojo2600/pihole -f values.yaml
```