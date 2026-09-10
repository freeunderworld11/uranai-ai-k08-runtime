// SPDX-License-Identifier: AGPL-3.0-only
import { calculate, calculateK02, calculateK02Range, calculateSolarBoundary } from './runtime.js';
import { validateInput, CalculationError } from './calculation.js';
import {timezoneAudit} from './timezone-audit.js';
import {withK08Result} from './k08-result.js';
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
    if (!["/", "/health", "/calculate", "/calculate/k02", "/calculate/k02/range", "/calculate/solar-boundary"].includes(pathname)) {
      return reply({ error: "NOT_FOUND" }, 404);
    }
    const calculationRoute = pathname === '/calculate' || pathname === '/calculate/k02' || pathname === '/calculate/k02/range' || pathname === '/calculate/solar-boundary';
    const allow = calculationRoute ? "POST, OPTIONS" : "GET, OPTIONS";
    if (request.method === "OPTIONS") return reply(null, 204, { Allow: allow });
    if ((calculationRoute && request.method !== "POST") ||
        (!calculationRoute && request.method !== "GET")) {
      return reply({ error: "METHOD_NOT_ALLOWED" }, 405, { Allow: allow });
    }
    if (calculationRoute) {
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
        const result = pathname === '/calculate/solar-boundary' ? await calculateSolarBoundary(input) : pathname === '/calculate/k02/range' ? await calculateK02Range(input) : pathname === '/calculate/k02' ? await calculateK02(input) : await calculate(validateInput(input));
        return reply({service,k08_version:k08Version,api_contract:'K08_ENGINE_ADAPTER_v0.2',runtime_status:result.result_status==='COMPLETE'?'CALCULATED':result.result_status==='PARTIAL'?'PARTIAL_RESULT':'LOCAL_HOLD',calculation_performed:result.result_status!=='UNAVAILABLE',k08_deployment_gate:'PENDING',...(pathname==='/calculate/solar-boundary'?result:withK08Result(result))},result.result_status==='UNAVAILABLE'?422:200);
      } catch (error) {
        const known = error instanceof CalculationError;
        return reply({
        service,
        k08_version: k08Version,
        runtime_status: known && ['GLOBAL_RUNTIME_FAIL','RUNTIME_VERSION_MISMATCH','INVALID_ENGINE_OUTPUT'].includes(error.code) ? 'GLOBAL_RUNTIME_FAIL' : 'LOCAL_HOLD',
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
      timezone_audit:timezoneAudit(null),
      engine_integrated: true,
      api_contract: 'K08_ENGINE_ADAPTER_v0.2',
      k08_deployment_gate: 'PENDING',
      license: "AGPL-3.0-only",
      source_url: sourceUrl
    });
  }
};
