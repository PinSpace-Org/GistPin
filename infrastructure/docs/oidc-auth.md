# OIDC Authentication with Dex

## Overview

GistPin uses [Dex](https://dexidp.io/) as an OpenID Connect (OIDC) identity provider for Kubernetes API server authentication. Dex acts as a bridge between upstream identity providers (GitHub) and Kubernetes, issuing ID tokens that the API server validates against RBAC policies.

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────────┐
│  kubectl │────>│   Dex    │────>│  GitHub  │     │ K8s API Server   │
│ (OIDC)   │     │ (OIDC)   │     │  (OAuth) │     │ (OIDC token      │
└──────────┘     └──────────┘     └──────────┘     │  validation)     │
                      │                              └──────────────────┘
                      │  ┌──────────────────┐               │
                      └─>| Static Passwords  │     ┌──────────────────┘
                        │ (fallback)        │     │ RBAC ClusterRoles
                        └──────────────────┘     │ ClusterRoleBindings
```

## Components

| Resource | File | Purpose |
|----------|------|---------|
| ConfigMap | `k8s/dex/config.yaml` | Dex server configuration |
| Deployment | `k8s/dex/deployment.yaml` | Dex pods, Service, RBAC, Ingress |

## Prerequisites

1. **TLS certificate** for `dex.gistpin.app` stored in Secret `dex-tls`
2. **GitHub OAuth App** credentials stored in Secret `dex-github-secrets`
3. **Client secrets** stored in Secret `dex-client-secrets`

### Creating Secrets

```bash
# GitHub OAuth credentials
kubectl create secret generic dex-github-secrets \
  --from-literal=client-id=<GITHUB_CLIENT_ID> \
  --from-literal=client-secret=<GITHUB_CLIENT_SECRET> \
  -n gistpin

# Client secrets for kubectl and API
kubectl create secret generic dex-client-secrets \
  --from-literal=kubectl-secret=<RANDOM_SECRET> \
  --from-literal=api-secret=<RANDOM_SECRET> \
  -n gistpin

# TLS certificates (if using cert-manager, skip this step)
kubectl create secret tls dex-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n gistpin
```

## GitHub Connector Setup

1. Create a GitHub OAuth App at https://github.com/settings/applications/new
2. Set the **Authorization callback URL** to `https://dex.gistpin.app/callback`
3. Store the Client ID and Client Secret in the `dex-github-secrets` Secret
4. Update `config.yaml` with the correct organization name

### Team-Based Access Control

To restrict access to specific GitHub teams:

```yaml
connectors:
  - type: github
    id: github
    name: GitHub
    config:
      clientID: $GITHUB_CLIENT_ID
      clientSecret: $GITHUB_CLIENT_SECRET
      redirectURI: https://dex.gistpin.app/callback
      orgs:
        - name: PinSpace-Org
          teams:
            - platform-admins
            - developers
```

## Configuring kubectl for OIDC

### Option 1: kubelogin (recommended)

```bash
# Install kubelogin
brew install int128/kubelogin/kubelogin

# Set up kubectl credentials
kubectl config set-credentials oidc-user \
  --exec-api-version=client.authentication.k8s.io/v1beta1 \
  --exec-command=kubelogin \
  --exec-arg=get-token \
  --exec-arg=--oidc-issuer-url=https://dex.gistpin.app \
  --exec-arg=--oidc-client-id=kubectl \
  --exec-arg=--oidc-client-secret=<KUBECTL_CLIENT_SECRET> \
  --exec-arg=--oidc-extra-scope=openid \
  --exec-arg=--oidc-extra-scope=profile \
  --exec-arg=--oidc-extra-scope=email

# Bind the user to a context
kubectl config set-context gistpin-oidc \
  --cluster=gistpin \
  --user=oidc-user
```

### Option 2: kubeconfig with token

```bash
# Authenticate through Dex (browser will open)
curl -k "https://dex.gistpin.app/auth?client_id=kubectl&response_type=code&scope=openid+profile+email&redirect_uri=http://localhost:8000/callback"

# Exchange the code for tokens
# kubectl config set-credentials oidc-user \
#   --token=<ID_TOKEN> \
#   --auth-provider=oidc \
#   --auth-provider-arg=idp-issuer-url=https://dex.gistpin.app \
#   --auth-provider-arg=client-id=kubectl \
#   --auth-provider-arg=client-secret=<SECRET>
```

## API Server Configuration

The Kubernetes API server must be configured with OIDC flags. For EKS:

```bash
# In eksctl or Terraform, add to API server args:
--oidc-issuer-url=https://dex.gistpin.app
--oidc-client-id=kubectl
--oidc-username-claim=email
--oidc-groups-claim=groups
```

For self-managed clusters, add to `/etc/kubernetes/manifests/kube-apiserver.yaml`:

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  extraArgs:
    oidc-issuer-url: https://dex.gistpin.app
    oidc-client-id: kubectl
    oidc-username-claim: email
    oidc-groups-claim: groups
```

## RBAC Integration

Once OIDC is configured, bind Dex claims to Kubernetes RBAC:

### Admin Access (GitHub team: platform-admins)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: gistpin-admins
subjects:
  - kind: Group
    name: gistpin:platform-admins
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
```

### Developer Access (GitHub team: developers)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gistpin-developers
  namespace: gistpin
subjects:
  - kind: Group
    name: gistpin:developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: gistpin-developer-role
```

### Read-Only Access (static user: readonly)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gistpin-readonly
  namespace: gistpin
subjects:
  - kind: User
    name: readonly@gistpin.app
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: gistpin-viewer-role
```

## Static Password Fallback

When GitHub OAuth is unavailable (e.g., network issues or initial setup), the static password accounts provide emergency access:

| Email | Username | Role |
|-------|----------|------|
| `admin@gistpin.app` | `admin` | Full cluster access |
| `readonly@gistpin.app` | `readonly` | Read-only access |

**Important**: Rotate the static password hashes after the first successful GitHub login. Generate new bcrypt hashes:

```python
import bcrypt
password = b"your-new-password"
hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode()
print(hashed)
```

## Token Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| ID Token expiry | 1 hour | Short-lived for security |
| Signing key rotation | 24 hours | Key rollover window |
| Refresh token reuse interval | 30 minutes | Prevents refresh token theft |
| Refresh token validity | 30 days | Balances security and UX |

## Health Checks

Dex exposes two health endpoints:

```bash
# Liveness check
curl -k https://dex.gistpin.app/healthz/live

# Readiness check
curl -k https://dex.gistpin.app/healthz/ready

# Telemetry (Prometheus metrics)
curl https://dex.gistpin.app:5558/metrics
```

## Troubleshooting

### "token not found" error

Dex tokens are stored in Kubernetes Secrets. Ensure the Dex ServiceAccount has permissions to read/write Secrets in the `gistpin` namespace.

### kubectl returns "Unauthorized"

1. Verify the API server has OIDC flags configured
2. Check that the token hasn't expired: `kubelogin get-token --oidc-issuer-url=https://dex.gistpin.app`
3. Re-authenticate if needed: `kubectl config unset users.oidc-user`

### GitHub connector fails

1. Verify the OAuth App callback URL matches exactly: `https://dex.gistpin.app/callback`
2. Ensure the client secret hasn't been revoked
3. Check Dex logs: `kubectl logs -n gistpin deployment/dex -f`

### Cannot reach dex.gistpin.app

1. Verify the Ingress is configured and the DNS record points to the cluster
2. Check TLS certificate validity
3. Ensure the `dex-tls` Secret exists and contains valid certificate/key pairs
