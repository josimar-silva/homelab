```shell
helm upgrade -i prometheus ./prometheus --install --wait \
--timeout=40m \
--atomic \
--create-namespace \
--namespace=monitoring
```

