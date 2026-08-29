# Blue-green workspace strategy: GREEN workspace variables.
# Select this workspace to promote the GREEN slot as the active traffic target.

environment       = "production"
active_workspace  = "green"
stage_suffix      = "green"
app_version       = "1.5.0"
traffic_weight    = 100
# When active_workspace = green, traffic is forwarded to the green target group
# and the blue slot is marked for cleanup after promotion.
listener_forward  = "green"
