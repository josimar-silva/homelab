# metallb

- [Docs](https://metallb.io/)
- [Repo](https://github.com/metallb/metallb) 

## Installation

```shell
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb
```

```shell
kubectl apply -f namespace.yaml
```

```shell
helm install metallb metallb/metallb -f values.yaml
```

## Configuration

```shell
kubectl apply -n "metallb" -f homelab-local-pool.yaml
```


```shell
kubectl apply -n "metallb" -f homelab-layer2-advertisement.yaml
```