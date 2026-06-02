// k6 load test for GistPin API
// Run: k6 run infrastructure/scripts/load-tests/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '1m',  target: 50 },   // sustained load
    { duration: '30s', target: 100 },  // peak
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.01'],             // error rate under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health status 200': (r) => r.status === 200 });
  errorRate.add(health.status !== 200);

  // List gists
  const gists = http.get(`${BASE_URL}/gists?lat=0&lng=0&radius=1000`);
  check(gists, {
    'gists status 200': (r) => r.status === 200,
    'gists response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(gists.status !== 200);

  sleep(1);
}
