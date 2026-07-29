package gistpin.images

test_allowed_image {
  result := violation with input as {"spec": {"template": {"spec": {"containers": [{"name": "app", "image": "docker.io/gistpin/app:latest"}]}}}}
  count(result) == 0
}

test_disallowed_image {
  result := violation with input as {"spec": {"template": {"spec": {"containers": [{"name": "app", "image": "docker.io/evil/malware:latest"}]}}}}
  count(result) > 0
}
