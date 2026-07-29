# Linkerd Service Mesh

## Installation
Linkerd is installed via Helm using Flux CD.

## Features
- Automatic mTLS between meshed services
- Traffic metrics via Linkerd-Viz
- Dashboard accessible via `linkerd dashboard`

## Proxy Injection
Add `linkerd.io/inject: enabled` annotation to namespaces or pods.
