/**
 * Carrinho de visitante (localStorage) + mesclagem na API apos login.
 */
(function () {
  var KEY = "pizzu_guest_cart";

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { items: [] };
      var data = JSON.parse(raw);
      return data && Array.isArray(data.items) ? data : { items: [] };
    } catch (e) {
      return { items: [] };
    }
  }

  function write(cart) {
    localStorage.setItem(KEY, JSON.stringify({ items: cart.items || [] }));
  }

  window.pizzuGuestCart = {
    get: read,

    countItems: function () {
      return read().items.reduce(function (sum, i) {
        return sum + (Number(i.quantity) || 0);
      }, 0);
    },

    add: function (productId, name, unitPrice, quantity) {
      quantity = quantity || 1;
      var cart = read();
      var id = Number(productId);
      var found = cart.items.find(function (x) {
        return Number(x.productId) === id;
      });
      if (found) {
        found.quantity = Number(found.quantity) + quantity;
      } else {
        cart.items.push({
          productId: id,
          name: String(name || "Produto"),
          price: Number(unitPrice),
          quantity: quantity,
        });
      }
      write(cart);
    },

    remove: function (productId) {
      var id = Number(productId);
      var cart = read();
      cart.items = cart.items.filter(function (x) {
        return Number(x.productId) !== id;
      });
      write(cart);
    },

    clear: function () {
      write({ items: [] });
    },

    /** Envia itens do carrinho guest para a API (usuario CLIENTE logado). */
    mergeIntoApi: async function () {
      var cart = read();
      if (!cart.items.length) return;
      for (var i = 0; i < cart.items.length; i++) {
        var it = cart.items[i];
        await window.appApi.addToCart({
          productId: it.productId,
          quantity: Number(it.quantity) || 1,
        });
      }
      write({ items: [] });
    },

    total: function () {
      return read().items.reduce(function (acc, i) {
        return acc + Number(i.price) * (Number(i.quantity) || 1);
      }, 0);
    },
  };
})();
