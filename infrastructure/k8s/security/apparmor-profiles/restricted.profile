[complain]
  # Strict profile: deny all unnecessary capabilities
  deny ptrace (attach,read) peer=*,
  deny mount,
  deny umount,
  deny pivot_root,
  deny sys_module,
  deny sys_rawio,
  deny sys_time,
  deny sys_tty_config,

  # Deny all network except established connections
  deny network raw,
  deny network packet,
  deny unix_stream_connect peer=(label=unconfined),
  deny unix_dgram_connect peer=(label=unconfined),

  # Allow application network access
  allow network inet stream,
  allow network inet6 stream,
  allow unix_stream_connect peer=(label=gistpin-*),
  allow unix_dgram_connect peer=(label=gistpin-*),

  # Allow bind to non-privileged ports
  allow inet_socket_bind addr=0.0.0.0/0,

  # Deny access to sensitive filesystem paths
  deny /proc/** w,
  deny /sys/** w,
  deny /dev/mem rw,
  deny /dev/kmem rw,
  deny /dev/port rw,
