/**
 * Endpoints da API e armazenamento de sessao (compativel com js/main.js).
 */
(function () {
  var req = function (path, options) {
    return window.appHttp.request(path, options);
  };

  function getToken() {
    return localStorage.getItem("token");
  }

  function getCurrentUser() {
    var raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  }

  function saveAuth(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  var api = {
    getProducts: function () {
      return req("/products");
    },
    register: function (payload) {
      return req("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    },
    login: function (payload) {
      return req("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    },
    getCart: function () {
      return req("/cart");
    },
    addToCart: function (payload) {
      return req("/cart/add", { method: "POST", body: JSON.stringify(payload) });
    },
    removeFromCart: function (productId) {
      return req("/cart/remove/" + productId, { method: "DELETE" });
    },
    checkout: function () {
      return req("/cart/checkout", { method: "POST" });
    },
    getOrders: function () {
      return req("/orders");
    },
    createProduct: function (payload) {
      return req("/products", { method: "POST", body: JSON.stringify(payload) });
    },
    updateProduct: function (id, payload) {
      return req("/products/" + id, { method: "PUT", body: JSON.stringify(payload) });
    },
    deleteProduct: function (id) {
      return req("/products/" + id, { method: "DELETE" });
    },
  };

  window.appApi = api;
  window.authStorage = {
    getToken: getToken,
    getCurrentUser: getCurrentUser,
    saveAuth: saveAuth,
    clearAuth: clearAuth,
  };
})();
