/**
 * Helpers de UI usados por main.js (mensagens, moeda, HTML seguro).
 */
(function () {
  window.escapeHtml = function (str) {
    if (str == null || str === undefined) return "";
    var div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  };

  window.showMessage = function (message, type) {
    type = type || "info";
    var el = document.getElementById("message");
    if (!el) return;
    el.textContent = message;
    if (el.classList.contains("alert")) {
      var map = { info: "info", success: "success", error: "danger" };
      var bs = map[type] || "info";
      el.className = "alert border-0 shadow-sm alert-" + bs;
      el.setAttribute("role", "alert");
      el.classList.remove("d-none");
    } else {
      el.className = "message " + type;
    }
  };

  window.formatPrice = function (value) {
    return "R$ " + Number(value).toFixed(2).replace(".", ",");
  };
})();
