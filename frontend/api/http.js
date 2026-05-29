/**
 * Cliente HTTP (fetch) para a API; usa window.appApiConfig.resolveApiBaseUrl().
 */
(function () {
  function baseUrl() {
    return window.appApiConfig.resolveApiBaseUrl();
  }

  async function request(path, options) {
    options = options || {};
    var headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    var token = localStorage.getItem("token");
    if (token) headers.Authorization = "Bearer " + token;

    var response = await fetch(baseUrl() + path, {
      ...options,
      headers: headers,
    });

    if (response.status === 204) return null;

    var contentType = response.headers.get("content-type") || "";
    var data = null;
    if (contentType.includes("application/json")) {
      try {
        var text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error("Resposta invalida do servidor (JSON).");
      }
    } else {
      throw new Error("Servidor retornou resposta nao JSON. Verifique se a API esta rodando em http://localhost:3000.");
    }

    if (!response.ok) {
      throw new Error((data && data.error) || "Erro na requisicao.");
    }
    return data;
  }

  window.appHttp = { request: request };
})();
