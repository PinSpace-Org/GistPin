# Cross-Cluster Service Communication

Architecture, setup, DNS, failover, and troubleshooting for GistPin's
cross-cluster networking layer, built on Submariner + MCS API.

---

## Architecture Overview

    Cluster A (primary)                  Cluster B (secondary)
    +---------------------------+        +---------------------------+
    | gistpin namespace         |        | gistpin namespace         |
    |  gistpin-api   :8080      |        |  gistpin-api   :8080      |
    |  gistpin-auth  :8080      |        |  gistpin-auth  :8080      |
    |  gistpin-storage :8080    |        |  gistpin-storage :8080    |
    +---------------------------+        +---------------------------+
    | submariner-gateway (NAT-T)|<------>| submariner-gateway (NAT-T)|
    | submariner-routeagent     |        | submariner-routeagent     |
    +---------------------------+        +---------------------------+
               |                                      |
               +----------[ Broker Cluster ]-----------+
                       submariner-k8s-broker NS
                       (endpoint + cluster registry)

Traffic between clusters travels through encrypted IPsec tunnels
(libreswan by default). Lighthouse provides DNS-based service
discovery under the .clusterset.local domain.

---

## Components

| Component            | Role                                              |
|----------------------|---------------------------------------------------|
| Submariner Broker    | Central registry for cluster endpoints            |
| Submariner Gateway   | IPsec tunnel termination, one node per cluster    |
| RouteAgent           | Programs pod routes on every node                 |
| Lighthouse (DNS)     | Resolves *.svc.clusterset.local across clusters   |
| MCS ServiceExport    | Marks a service for cross-cluster advertisement   |
| MCS ServiceImport    | Consumed service representation on remote cluster |

---

## Prerequisites

- Kubernetes 1.27+ on all clusters
- Non-overlapping pod and service CIDRs across clusters (or globalnet enabled)
- UDP 4500, 500, and 4800 open between gateway nodes
- OLM installed on all clusters (operator-framework/operator-lifecycle-manager)
- subctl CLI installed locally (brew install submariner-io/submariner/subctl)

---

## Setup

### 1. Deploy the Broker

Run once on the designated broker cluster:

    subctl deploy-broker \
      --kubeconfig ~/.kube/broker-cluster.yaml \
      --service-discovery

This creates the submariner-k8s-broker namespace and outputs
a broker-info.subm file used in the next step.

### 2. Label gateway nodes on each member cluster

    kubectl label node <gateway-node-name> submariner.io/gateway=true

### 3. Join each member cluster to the broker

    subctl join broker-info.subm \
      --kubeconfig ~/.kube/cluster-a.yaml \
      --clusterid gistpin-cluster-a \
      --cable-driver libreswan \
      --natt

    subctl join broker-info.subm \
      --kubeconfig ~/.kube/cluster-b.yaml \
      --clusterid gistpin-cluster-b \
      --cable-driver libreswan \
      --natt

### 4. Apply the Submariner CR and service exports

    kubectl apply -f infrastructure/k8s/cross-cluster/submariner.yaml
    kubectl apply -f infrastructure/k8s/cross-cluster/service-export.yaml

### 5. Patch CoreDNS

The submariner.yaml ConfigMap patch forwards .clusterset.local
queries to the Lighthouse agent. After applying, restart CoreDNS:

    kubectl rollout restart deployment/coredns -n kube-system

---

## DNS Reference

Once a ServiceExport is created, Lighthouse registers the service
under the following pattern:

    <service>.<namespace>.svc.clusterset.local

| Service               | Cross-cluster DNS name                              |
|-----------------------|-----------------------------------------------------|
| gistpin-api           | gistpin-api.gistpin.svc.clusterset.local            |
| gistpin-auth          | gistpin-auth.gistpin.svc.clusterset.local           |
| gistpin-storage       | gistpin-storage.gistpin.svc.clusterset.local        |
| gistpin-notifications | gistpin-notifications.gistpin.svc.clusterset.local  |
| gistpin-db (headless) | gistpin-db.gistpin.svc.clusterset.local             |

DNS queries are load-balanced across all healthy endpoints in the
clusterset using round-robin by default.

---

## Secure Tunnels

Tunnels use IPsec (libreswan) with a pre-shared key stored in the
submariner-ipsec-psk Secret, managed by sealed-secrets. To rotate:

    NEW_PSK=$(openssl rand -base64 64 | tr -d '\n')

    kubectl create secret generic submariner-ipsec-psk \
      --from-literal=psk="$NEW_PSK" \
      --dry-run=client -o yaml | kubeseal | \
      kubectl apply -f -

    kubectl rollout restart daemonset/submariner-gateway -n submariner-operator

---

## Failover Routing

Lighthouse performs automatic failover at the DNS layer:

1. Each exported service endpoint is health-checked by the
   Lighthouse agent every 30 seconds.
2. If a cluster's endpoint fails the health check, Lighthouse
   removes it from DNS responses within one TTL cycle (30s default).
3. Traffic naturally shifts to remaining healthy endpoints on the
   next DNS resolution.

To test failover manually:

    kubectl cordon <gateway-node-cluster-b>
    kubectl delete pod -n submariner-operator -l app=submariner-gateway

    kubectl run -it dns-test --image=busybox --restart=Never -- \
      nslookup gistpin-api.gistpin.svc.clusterset.local

---

## Service Mirroring

Submariner Lighthouse mirrors exported services as local ServiceImport
objects. To inspect what is mirrored on a cluster:

    kubectl get serviceimport -n gistpin
    kubectl describe serviceimport gistpin-api -n gistpin

The mirrored VIP is stable within a cluster and can be used directly
in service-to-service calls as an alternative to DNS:

    kubectl get serviceimport gistpin-api -n gistpin \
      -o jsonpath='{.spec.ips[0]}'

---

## Verification

    subctl show connections
    subctl show endpoints

    kubectl run -it --rm dns-test --image=busybox --restart=Never -- \
      nslookup gistpin-api.gistpin.svc.clusterset.local

    subctl diagnose all

---

## Troubleshooting

### Tunnel is not establishing

    kubectl logs -n submariner-operator -l app=submariner-gateway --tail=100
    nc -vzu <remote-gateway-ip> 4500

Common causes: NAT hairpin not enabled (natEnabled: false when NAT
is present), security group rules blocking UDP 4500/500, or mismatched
PSK between clusters.

### DNS not resolving .clusterset.local

    kubectl get pods -n submariner-operator -l app=submariner-lighthouse-agent
    kubectl get configmap coredns -n kube-system -o yaml | grep clusterset

If the forward stanza is missing, re-apply submariner.yaml and
restart CoreDNS.

### ServiceExport not propagating

    kubectl describe serviceexport gistpin-api -n gistpin
    subctl show brokers

---

## Related Docs

- service-mesh.md -- Istio config; mTLS between pods
- network-monitoring.md -- tunnel latency dashboards
- egress-policy.md -- outbound traffic rules
- disaster-recovery.md -- full cluster failover runbook
