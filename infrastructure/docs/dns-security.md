# DNS Security

DNS traffic is restricted via NetworkPolicy to allow queries only to CoreDNS.

## Policies
- `dns-allow-coredns`: Allows DNS only to CoreDNS pods
- `dns-deny-external`: Blocks DNS to external resolvers

## Logging
CoreDNS is configured to log all queries for audit purposes.
