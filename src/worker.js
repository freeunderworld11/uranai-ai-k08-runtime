// SPDX-License-Identifier: AGPL-3.0-only
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
      return reply({
        service,
        k08_version: k08Version,
        runtime_status: "RUNTIME_NOT_READY",
        calculation_performed: false,
        reason: "Swiss Ephemeris runtime has not yet been deployed."
      }, 503);
    }
    return reply({
      service,
      knowledge: "K08",
      k08_version: k08Version,
      status: "OK",
      runtime_status: "SHELL_ACTIVE",
      ephemeris: "SWISS_EPHEMERIS",
      calculation_ready: false,
      license: "AGPL-3.0-only",
      source_url: sourceUrl
    });
  }
};
