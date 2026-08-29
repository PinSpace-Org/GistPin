# Blue-green workspace strategy: BLUE workspace variables.
# Select this workspace to promote the BLUE slot as the active traffic target.

environment       = "production"
active_workspace  = "blue"
stage_suffix      = "blue"
app_version       = "1.4.2"
traffic_weight    = 0
# Destination-rules / ALB listener switch: when active_workspace = blue, traffic
# is forwarded to the blue target group.
listener_forward  = "blue"
