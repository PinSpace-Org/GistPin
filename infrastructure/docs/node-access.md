# Node Access via SSM Session Manager

Interactive access to Kubernetes worker nodes is provided exclusively through
**AWS Systems Manager Session Manager**. SSH is not used and no node exposes an
inbound SSH port.

## Why Session Manager instead of SSH

| SSH bastion                          | SSM Session Manager                      |
| ------------------------------------ | ---------------------------------------- |
| Inbound port 22 must be opened       | No inbound ports; agent dials out        |
| Key distribution and rotation burden | Access authorized by IAM policy          |
| Session logging is bolt-on           | Sessions logged to S3 + CloudWatch natively |
| Bastion host to patch and defend     | No bastion to maintain                   |

## Components

| File                                            | Purpose                                              |
| ----------------------------------------------- | ---------------------------------------------------- |
| `infrastructure/terraform/ssm-access.tf`        | IAM access, session log bucket/log group, session preferences document, no-SSH node SG. |
| `infrastructure/k8s/ssm/ssm-daemonset.yaml`     | Ensures the SSM agent runs on every node.            |
| `infrastructure/docs/node-access.md`            | This document.                                       |

## How to open a session

```bash
# List managed nodes
aws ssm describe-instance-information \
  --query 'InstanceInformationList[].{Id:InstanceId,Ping:PingStatus}'

# Start a shell on a node
aws ssm start-session --target i-0123456789abcdef0
```

Access is gated by the IAM policy attached to your principal — only users whose
policy allows `ssm:StartSession` against the node can connect.

## Logging and audit trail

Every session is recorded twice for defense in depth:

- **S3** — full session transcripts land in the
  `${project}-${env}-ssm-session-logs` bucket (KMS-encrypted, one-year lifecycle).
- **CloudWatch Logs** — streamed live to `/${project}/${env}/ssm/sessions` for
  real-time monitoring and alerting.

The session preferences document also enforces a 15-minute idle timeout and
records shell history, so the audit trail captures what was run, by whom, and
when.

## Removing SSH ingress

`ssm-access.tf` defines `aws_security_group.nodes_no_ssh`, a node security group
with **no** inbound tcp/22 rule. Node groups reference this security group, so
even if a key leaked there is no open SSH path to a node. Egress is allowed so
the SSM agent can reach the AWS endpoints it dials out to.

## Verifying a node is reachable

```bash
# Agent should be Online
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=i-0123456789abcdef0" \
  --query 'InstanceInformationList[0].PingStatus'
```

If a node shows `ConnectionLost`, check that the `ssm-agent` DaemonSet pod is
running on it and that the node role has `AmazonSSMManagedInstanceCore` attached.
