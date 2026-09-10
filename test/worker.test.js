// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const call = (path, options) => worker.fetch(new Request(`https://example.test${path}`, options));
test("health identifies the shell without claiming calculation readiness", async () => {
  for (const path of ["/", "/health", "/health?probe=1"]) {
    const response = await call(path);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.calculation_ready, false);
    assert.equal(body.runtime_status, "SHELL_ACTIVE");
    assert.equal(body.k08_version, "K08_v2.2_PRODUCTION");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});
test("calculation always fails closed, including malformed input", async () => {
  for (const body of [undefined, "{}", "not json"]) {
    const response = await call("/calculate", { method: "POST", body });
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.equal(data.calculation_performed, false);
    assert.equal(data.runtime_status, "RUNTIME_NOT_READY");
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  }
});
test("preflight has an empty body", async () => {
  const response = await call("/calculate", { method: "OPTIONS" });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Content-Type");
});
test("known routes reject incorrect methods with Allow", async () => {
  for (const [path, method, allow] of [["/health", "POST", "GET, OPTIONS"], ["/calculate", "GET", "POST, OPTIONS"]]) {
    const response = await call(path, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), allow);
  }
});
test("unknown paths return 404", async () => {
  const response = await call("/missing");
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "NOT_FOUND" });
});
