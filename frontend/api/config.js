/**
 * Base URL da API (backend em http://localhost:3000).
 *
 * 1) <meta name="api-base" content="http://localhost:3000/api"> — URL completa forçada (CORS no backend).
 * 2) Pagina via servidor do frontend (npm start) — usa mesma origem + /api (proxy -> localhost:3000).
 * 3) Fallback — http://localhost:3000/api (ex.: arquivo local sem servidor).
 */
(function () {
  var DEFAULT_API_BASE = "http://localhost:3000/api";

  function trimEndSlash(s) {
    return String(s || "").replace(/\/+$/, "");
  }

  function resolveApiBaseUrl() {
    var meta = typeof document !== "undefined" ? document.querySelector('meta[name="api-base"]') : null;
    if (meta && meta.content && String(meta.content).trim()) {
      return trimEndSlash(String(meta.content).trim());
    }
    if (typeof window === "undefined") return DEFAULT_API_BASE;
    var origin = window.location.origin;
    if (origin && origin !== "null" && /^https?:\/\//i.test(origin)) {
      return trimEndSlash(origin) + "/api";
    }
    return DEFAULT_API_BASE;
  }

  window.appApiConfig = {
    DEFAULT_API_BASE: DEFAULT_API_BASE,
    resolveApiBaseUrl: resolveApiBaseUrl,
  };
})();
