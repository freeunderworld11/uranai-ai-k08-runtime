// SPDX-License-Identifier: AGPL-3.0-only
import { calculate } from './runtime.js';
import { validateInput, CalculationError } from './calculation.js';
const service = "uranai-ai-k08-runtime";
const k08Version = "K08_v2.2_PRODUCTION";
const sourceUrl = "https://github.com/freeunderworld11/uranai-ai-k08-runtime";

function reply(body, status = 200, extraHeaders = {}) {
  return new Response(body === null ? null : JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (!["/", "/health", "/calculate"].includes(pathname)) {
      return reply({ error: "NOT_FOUND" }, 404);
    }
    const allow = pathname === "/calculate" ? "POST, OPTIONS" : "GET, OPTIONS";
    if (request.method === "OPTIONS") return reply(null, 204, { Allow: allow });
    if ((pathname === "/calculate" && request.method !== "POST") ||
        (pathname !== "/calculate" && request.method !== "GET")) {
      return reply({ error: "METHOD_NOT_ALLOWED" }, 405, { Allow: allow });
    }
    if (pathname === "/calculate") {
      try {
        if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new CalculationError('UNSUPPORTED_MEDIA_TYPE',415);
        const reader = request.body?.getReader();
        if (!reader) throw new CalculationError('INVALID_JSON',400);
        let bytes = 0;
        const chunks = [];
        try {
          while (true) {
            const {done,value} = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > 4096) { await reader.cancel(); throw new CalculationError('PAYLOAD_TOO_LARGE',413); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const buffer = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) { buffer.set(chunk,offset); offset += chunk.byteLength; }
        let input;
        try { input = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer)); }
        catch { throw new CalculationError('INVALID_JSON',400); }
        const validated = validateInput(input);
        const result = await calculate(validated);
        return reply({service,k08_version:k08Version,api_contract:'K08_ENGINE_ADAPTER_v0.1',runtime_status:'CALCULATED',calculation_performed:true,k08_deployment_gate:'PENDING',...result});
      } catch (error) {
        const known = error instanceof CalculationError;
        return reply({
        service,
        k08_version: k08Version,
        runtime_status: "LOCAL_HOLD",
        calculation_performed: false,
        error: known ? error.code : 'RUNTIME_UNAVAILABLE',
        k08_deployment_gate: 'PENDING'
      }, known ? error.status : 503);
      }
    }
    return reply({
      service,
      knowledge: "K08",
      k08_version: k08Version,
      status: "OK",
      runtime_status: "ENGINE_INTEGRATED",
      ephemeris: "SWISS_EPHEMERIS",
      calculation_ready: false,
      engine_integrated: true,
      api_contract: 'K08_ENGINE_ADAPTER_v0.1',
      k08_deployment_gate: 'PENDING',
      license: "AGPL-3.0-only",
      source_url: sourceUrl
    });
  }
};
