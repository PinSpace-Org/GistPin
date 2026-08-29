# Serving Workload SVIDs to Istio (SPIRE + Istio)

Istio can use SPIRE as its certificate provider, giving every sidecar a
**SPIFFE workload identity** issued by SPIRE instead of Istio's built-in
SelfSigned CA. This unifies mTLS identity with cluster-wide SPIFFE IDs.

## Prerequisites

- SPIRE deployed (`infrastructure/k8s/spire/server.yaml`,
  `agent-daemonset.yaml`, `cluster-spiffe-id.yaml`).
- Istio installed (`infrastructure/k8s/istio/istio-install.yaml`).

## Configure Istio to use SPIRE

Install Istio with the SPIRE integration enabled:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: gistpin-istio
  namespace: istio-system
spec:
  profile: default
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_SPIFFE_TRUST_DOMAIN: "gistpin.local"
        CA_PROVIDER: spire
        SPIFFE_BUNDLE: gistpin.local
  values:
    global:
      trustDomain: gistpin.local
      istiod:
        enableProtocolSniffingForOutbound: true
    pilot:
      env:
        # Disable Istio's built-in CA; envoy uses the SPIFFE Workload API.
        DISABLE_ENVOY_NODE_LB: "false"
        # Trust the root CA from the SPIRE trust bundle.
        CA_TRUST_DOMAIN: gistpin.local
```

## Workload Integration

Workloads in namespaces with `istio-injection: enabled` receive a sidecar that
requests its SVID from the SPIRE agent Workload API. Because the ClusterSPIFFEID
in `cluster-spiffe-id.yaml` registers the `gistpin` namespace, the sidecar's
service account automatically resolves to a SPIFFE ID like:

```
spiffe://gistpin.local/ns/gistpin/sa/backend
```

## Rotation

Istio-envoy SVIDs rotate automatically via the SPIRE Workload API (agent default
`12h`), so no manual certificate rotation is needed for the mesh. The SPIRE
server trust bundle rotates at the interval set in `server.yaml`; run
`infrastructure/scripts/rotate-spire-roots.sh` to rotate the root trust bundle
server-side (see `docs/spire-spiffe.md`).
