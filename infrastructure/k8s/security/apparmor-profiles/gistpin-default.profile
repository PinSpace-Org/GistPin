[complain]
  # Default: complain on all denials (audit mode)
  deny_ptrace (attach,read) peer=gistpin-*,
  deny mount fstype=debugfs,
  deny mount fstype=tracefs,
  deny mount fstype=proc,
  deny mount fstype=sysfs,
  deny mount fstype=securityfs,
  deny unix_stream_connect,
  deny unix_dgram_connect,
  deny network inet stream,
  deny network inet dgram,
  deny network inet6 stream,
  deny network inet6 dgram,

  # Allow necessary network access for application
  allow network inet stream,
  allow network inet6 stream,
  allow network inet dgram peer=(label=gistpin-*),
  allow network inet6 dgram peer=(label=gistpin-*),

  # Allow necessary socket operations
  allow unix_stream_connect peer=(label=gistpin-*),
  allow unix_dgram_connect peer=(label=gistpin-*),

  # Deny raw socket access
  deny network raw,
  deny network packet,

  # Allow bind to high ports only
  allow inet_socket_connect peer=(name=@/proc/net/tcp6),
  deny inet_socket_bind addr=10.0.0.0/8,
  deny inet_socket_bind addr=172.16.0.0/12,
  deny inet_socket_bind addr=192.168.0.0/16,
  allow inet_socket_bind addr=0.0.0.0/0,
