# Terraform Resource Dependency Locking

Terraform's built-in state lock serializes operations on a single state file.
It does **not** stop two operations on *interdependent* resource groups — living
in different states or workspaces — from running at the same time and racing
(e.g. a networking change applied while a database that depends on it is being
modified). This mechanism adds a finer-grained, cross-state dependency lock.

## Model

Resources are organized into **groups** with a dependency graph
(`resource-locks.tf`):

```
networking → security → database ┐
                        compute  ┴→ app
```

Before operating on a group, you must hold the lock for that group **and all of
its transitive dependencies**. Operating on `database` therefore locks
`networking`, `security`, and `database`.

## Deadlock prevention

Locks are always acquired in a single **global order**
(`networking, security, database, compute, app`), regardless of which group you
are operating on. A total order over lockable resources is the standard
guarantee against deadlock — no two processes can each hold a lock the other is
waiting for.

If a lock can't be acquired within `LOCK_TIMEOUT`, acquisition fails and any
partially-acquired locks are rolled back, so a process never sits holding a
partial set.

## Components

| File                                             | Purpose                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| `infrastructure/terraform/resource-locks.tf`     | DynamoDB lock table + dependency graph outputs.|
| `infrastructure/scripts/acquire-resource-lock.sh`| Acquire/release/inspect locks.                 |
| `infrastructure/docs/resource-locking.md`        | This document.                                 |

## Usage

```bash
# Before a terraform apply on the database group:
./infrastructure/scripts/acquire-resource-lock.sh --group database
terraform apply -target=module.database
./infrastructure/scripts/acquire-resource-lock.sh --group database --release

# See what's currently locked
./infrastructure/scripts/acquire-resource-lock.sh --status
```

## Lock timeout / stale locks

Each lock carries an `ExpiresAt` TTL (default 15 min). DynamoDB's TTL sweeps
expired items, and the conditional acquire also treats an expired lock as free —
so a crashed process that never released its lock cannot block others forever.
Tune with `LOCK_TTL`.

## Lock status visibility

`--status` scans the lock table and lists every held lock with its holder and
expiry, so an operator can see exactly what is blocking a contended operation.

## Configuration

| Variable       | Default                          | Meaning                              |
| -------------- | -------------------------------- | ------------------------------------ |
| `LOCK_TABLE`   | `terraform output` value         | DynamoDB lock table.                 |
| `LOCK_TTL`     | `900`                            | Lock lifetime (seconds).             |
| `LOCK_TIMEOUT` | `300`                            | Max wait to acquire a contended lock.|
| `HOLDER`       | `user@host`                      | Identity recorded on the lock.       |

## CI integration

Wrap `plan`/`apply` steps for a group with an acquire/release pair. Because
acquisition is ordered and time-bounded, concurrent pipeline runs on overlapping
groups serialize safely instead of racing.
