"""Locust load test for GistPin API.
Run: locust -f infrastructure/scripts/load-tests/locustfile.py --host=http://localhost:3000
"""
from locust import HttpUser, task, between


class GistPinUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def list_gists(self):
        self.client.get("/gists?lat=0&lng=0&radius=1000", name="/gists")

    @task(1)
    def health_check(self):
        self.client.get("/health", name="/health")
