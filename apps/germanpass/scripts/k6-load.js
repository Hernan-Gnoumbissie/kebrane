/**
 * Test de charge léger (k6) — parcours lecture publique + health.
 * Exécution : k6 run scripts/k6-load.js -e BASE_URL=https://example.com
 * Objectif : p95 < 500 ms à 50 VUs sur les routes non authentifiées.
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function loadTest() {
  check(http.get(`${BASE}/`), { "landing 200": (r) => r.status === 200 });
  check(http.get(`${BASE}/api/health`), { "health 200": (r) => r.status === 200 });
  check(http.get(`${BASE}/login`), { "login 200": (r) => r.status === 200 });
  sleep(1);
}
