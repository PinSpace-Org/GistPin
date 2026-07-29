package gistpin.annotations

test_valid_deployment {
  result := violation with input as {"kind": "Deployment", "metadata": {"annotations": {"app.kubernetes.io/name": "test", "app.kubernetes.io/instance": "test", "app.kubernetes.io/managed-by": "flux"}}}
  count(result) == 0
}

test_missing_annotations_deployment {
  result := violation with input as {"kind": "Deployment", "metadata": {"annotations": {}}}
  count(result) > 0
}
