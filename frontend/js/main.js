function renderProducts(products, targetId, onAdd, options = {}) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = "";

  products.forEach((product) => {
    const basePrice = Number(product.price);
    const finalPrice = options.discountRate
      ? Number((basePrice * (1 - options.discountRate)).toFixed(2))
      : basePrice;

    const name = window.escapeHtml(product.name);
    const desc = window.escapeHtml(product.description || "Sem descricao.");
    const promoBadge = options.isPromotion
      ? `<span class="badge bg-warning-subtle text-dark border border-warning"><i class="bi bi-lightning-charge-fill me-1"></i>Promo</span>`
      : `<span class="badge bg-secondary-subtle text-secondary border"><i class="bi bi-pizza me-1"></i>Cardapio</span>`;
    const promoLine = options.isPromotion
      ? `<p class="small text-muted mb-2 mb-md-3">De <s>${formatPrice(product.price)}</s></p>`
      : "";

    const imgSrc = product.imageUrl ? window.escapeHtml(String(product.imageUrl)) : "";
    const heroImg = imgSrc
      ? `<div class="pizzu-card-img-wrap"><img class="pizzu-product-img" src="${imgSrc}" alt="${name}" loading="lazy" decoding="async" /></div>`
      : `<div class="pizzu-card-img-wrap pizzu-card-img-placeholder d-flex align-items-center justify-content-center" aria-hidden="true"><span class="display-6 user-select-none">🍕</span></div>`;

    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-xl-4";
    col.innerHTML = `
      <div class="card h-100 border-0 shadow-sm pizzu-product-card overflow-hidden ${options.isPromotion ? "pizzu-product-card--promo" : ""}">
        ${heroImg}
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            ${promoBadge}
            <i class="bi bi-star-fill text-warning" aria-hidden="true"></i>
          </div>
          <h3 class="card-title h5">${name}</h3>
          <p class="card-text text-muted small flex-grow-1">${desc}</p>
          ${promoLine}
          <p class="price-tag mb-3">${formatPrice(finalPrice)}</p>
          <button type="button" class="btn btn-primary w-100 rounded-pill mt-auto" data-id="${product.id}">
            <i class="bi bi-cart-plus me-2"></i>Adicionar ao carrinho
          </button>
        </div>
      </div>
    `;
    col.querySelector("button[data-id]").addEventListener("click", () => onAdd(product.id, finalPrice, product));
    container.appendChild(col);
  });
}

function renderProductsReadOnly(products, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    const title = window.escapeHtml(product.name);
    const text = window.escapeHtml(product.description || "Sem descricao.");
    const thumb = product.imageUrl
      ? `<div class="dashboard-product-thumb"><img src="${window.escapeHtml(String(product.imageUrl))}" alt="" loading="lazy" /></div>`
      : `<div class="dashboard-product-thumb dashboard-product-thumb--empty" aria-hidden="true">🍕</div>`;
    card.innerHTML = `
      ${thumb}
      <div class="dashboard-product-body">
        <h3>${title}</h3>
        <p>${text}</p>
        <strong>${formatPrice(product.price)}</strong>
      </div>
    `;
    container.appendChild(card);
  });
}

function getPostLoginRedirect() {
  var allowed = ["/index.html", "/HTML/carrinho.html", "/HTML/cadastro.html"];
  var params = new URLSearchParams(window.location.search);
  var next = params.get("next");
  if (next && allowed.indexOf(next) !== -1) return next;
  var stored = sessionStorage.getItem("pizzu_post_login_redirect");
  if (stored && allowed.indexOf(stored) !== -1) {
    sessionStorage.removeItem("pizzu_post_login_redirect");
    return stored;
  }
  return "/index.html";
}

async function refreshCartBadges() {
  var ids = ["cart-badge", "cart-badge-nav"];
  for (var b = 0; b < ids.length; b++) {
    var badge = document.getElementById(ids[b]);
    if (!badge) continue;
    var count = 0;
    var token = window.authStorage.getToken();
    var user = window.authStorage.getCurrentUser();
    try {
      if (token && user && user.role === "CLIENTE") {
        var cart = await window.appApi.getCart();
        count = cart.items.reduce(function (s, i) {
          return s + (Number(i.quantity) || 0);
        }, 0);
      } else {
        count = window.pizzuGuestCart.countItems();
      }
    } catch (e) {
      count = window.pizzuGuestCart.countItems();
    }
    var label = count > 99 ? "99+" : String(count);
    badge.textContent = label;
    badge.classList.toggle("d-none", count === 0);
  }
}

async function setupIndexPage() {
  const user = window.authStorage.getCurrentUser();
  if (user && user.role === "ADMIN") {
    window.location.replace("/admin/dashboard.html");
    return;
  }

  const loginBtn = document.getElementById("login-btn");
  const dashboardBtn = document.getElementById("dashboard-btn");

  if (user) {
    loginBtn.innerHTML = '<i class="bi bi-person-circle me-1" aria-hidden="true"></i>Sair';
    loginBtn.addEventListener("click", () => {
      window.authStorage.clearAuth();
      window.location.reload();
    });
    if (dashboardBtn) dashboardBtn.classList.add("hidden");
  } else {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/HTML/login.html";
    });
  }

  try {
    const products = await window.appApi.getProducts();
    const addToCartHandler = async (productId, unitPrice, product) => {
      const token = window.authStorage.getToken();
      const u = window.authStorage.getCurrentUser();
      if (u && u.role === "ADMIN") {
        showMessage("Administrador usa o dashboard para gerir produtos.", "error");
        return;
      }
      if (!token) {
        window.pizzuGuestCart.add(productId, product.name, unitPrice, 1);
        showMessage("Item adicionado. Abra o carrinho para revisar e finalizar.", "success");
        await refreshCartBadges();
        return;
      }
      if (u.role !== "CLIENTE") {
        showMessage("Use a conta de cliente para comprar.", "error");
        return;
      }
      await window.appApi.addToCart({ productId, quantity: 1 });
      showMessage("Produto adicionado ao carrinho.", "success");
      await refreshCartBadges();
    };

    renderProducts(products, "products-list", addToCartHandler);
    renderProducts(products.slice(0, 6), "promotions-list", addToCartHandler, {
      isPromotion: true,
      discountRate: 0.2,
    });
  } catch (error) {
    showMessage(error.message, "error");
  }

  await refreshCartBadges();
}

async function setupCartPage() {
  const user = window.authStorage.getCurrentUser();
  const token = window.authStorage.getToken();

  if (user && user.role === "ADMIN") {
    window.location.replace("/admin/dashboard.html");
    return;
  }

  const loginBtn = document.getElementById("login-btn");
  if (user && token) {
    loginBtn.innerHTML = '<i class="bi bi-person-circle me-1"></i>Sair';
    loginBtn.addEventListener("click", () => {
      window.authStorage.clearAuth();
      window.location.reload();
    });
  } else {
    loginBtn.addEventListener("click", () => {
      sessionStorage.setItem("pizzu_post_login_redirect", "/HTML/carrinho.html");
      window.location.href = "/HTML/login.html?next=/HTML/carrinho.html";
    });
  }

  const subtitle = document.getElementById("cart-page-subtitle");
  const hint = document.getElementById("cart-checkout-hint");
  const emptyEl = document.getElementById("cart-page-empty");
  const filledEl = document.getElementById("cart-page-filled");
  const listEl = document.getElementById("cart-page-list");
  const totalEl = document.getElementById("cart-page-total");
  const checkoutBtn = document.getElementById("checkout-btn");

  async function renderCartView() {
    if (subtitle) {
      subtitle.textContent =
        token && user && user.role === "CLIENTE"
          ? "Revise os itens e finalize quando estiver pronto."
          : "Voce pode alterar itens aqui. Para pagar, entre com sua conta.";
    }

    if (token && user && user.role === "CLIENTE" && window.pizzuGuestCart.countItems() > 0) {
      await window.pizzuGuestCart.mergeIntoApi();
    }

    var isCliente = token && user && user.role === "CLIENTE";
    var items = [];
    var total = 0;

    if (isCliente) {
      try {
        var cart = await window.appApi.getCart();
        items = cart.items.map(function (i) {
          return {
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            subtotal: i.subtotal,
          };
        });
        total = cart.total;
      } catch (err) {
        showMessage(err.message, "error");
      }
    } else {
      var g = window.pizzuGuestCart.get().items;
      for (var i = 0; i < g.length; i++) {
        var it = g[i];
        var sub = Number(it.price) * (Number(it.quantity) || 1);
        items.push({
          productId: it.productId,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          subtotal: sub,
        });
      }
      total = window.pizzuGuestCart.total();
    }

    if (!items.length) {
      emptyEl.classList.remove("d-none");
      filledEl.classList.add("d-none");
    } else {
      emptyEl.classList.add("d-none");
      filledEl.classList.remove("d-none");
      listEl.innerHTML = "";
      items.forEach(function (item) {
        var li = document.createElement("li");
        li.className = "list-group-item py-3";
        li.innerHTML =
          '<div class="d-flex flex-column flex-sm-row justify-content-between gap-3">' +
          '<div><strong>' +
          window.escapeHtml(item.name) +
          "</strong><br/><span class=\"small text-muted\">" +
          formatPrice(item.price) +
          " x " +
          item.quantity +
          "</span></div>" +
          '<div class="text-sm-end"><span class="fw-semibold">' +
          formatPrice(item.subtotal) +
          '</span><br/><button type="button" class="btn btn-sm btn-outline-danger mt-2 mt-sm-0 btn-remove-cart-item" data-product-id="' +
          item.productId +
          '"><i class="bi bi-trash"></i> Remover</button></div></div>';
        listEl.appendChild(li);
      });
      listEl.querySelectorAll(".btn-remove-cart-item").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var pid = Number(btn.getAttribute("data-product-id"));
          if (isCliente) {
            await window.appApi.removeFromCart(pid);
          } else {
            window.pizzuGuestCart.remove(pid);
          }
          await renderCartView();
          await refreshCartBadges();
        });
      });
      totalEl.textContent = formatPrice(total);
    }

    if (hint) {
      if (!token) {
        hint.innerHTML =
          '<i class="bi bi-info-circle me-1"></i>Ao finalizar, pedimos login. Sem conta? Veja <a href="./cadastro.html">contas de demonstracao</a> para entrar.';
      } else if (user.role === "CLIENTE") {
        hint.textContent = "Ao finalizar, seu pedido sera registrado com sucesso.";
      } else {
        hint.textContent = "";
      }
    }

    await refreshCartBadges();
  }

  checkoutBtn.addEventListener("click", async function () {
    if (!token || !user || user.role !== "CLIENTE") {
      sessionStorage.setItem("pizzu_post_login_redirect", "/HTML/carrinho.html");
      window.location.href = "/HTML/login.html?next=/HTML/carrinho.html";
      return;
    }
    try {
      await window.appApi.checkout();
      showMessage("Pedido finalizado com sucesso!", "success");
      await renderCartView();
    } catch (err) {
      showMessage(err.message, "error");
    }
  });

  await renderCartView();
}

function setupLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailEl = document.getElementById("login-email");
    const passwordEl = document.getElementById("login-password");
    if (!emailEl || !passwordEl) {
      showMessage("Formulario de login incompleto.", "error");
      return;
    }

    const email = String(emailEl.value || "").trim();
    const password = String(passwordEl.value || "");

    if (!email || !password) {
      showMessage("Preencha email e senha.", "error");
      return;
    }

    try {
      const data = await window.appApi.login({ email, password });
      window.authStorage.saveAuth(data);
      if (data.user.role === "ADMIN") {
        window.location.href = "/admin/dashboard.html";
        return;
      }
      if (data.user.role === "CLIENTE") {
        try {
          await window.pizzuGuestCart.mergeIntoApi();
        } catch (mergeErr) {
          console.warn(mergeErr);
        }
      }
      window.location.href = getPostLoginRedirect();
    } catch (error) {
      showMessage(error.message || "Falha no login.", "error");
    }
  });
}

function setupRegisterPage() {
  document.querySelectorAll(".btn-copy[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy");
      const el = id ? document.getElementById(id) : null;
      const text = el ? el.textContent.trim() : "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showMessage("Email copiado.", "success");
      } catch {
        showMessage("Nao foi possivel copiar. Copie manualmente.", "error");
      }
    });
  });

  const testPwd = document.getElementById("test-password-input");
  if (testPwd) {
    testPwd.removeAttribute("readonly");
    testPwd.disabled = false;
  }
}

function renderCart(cart) {
  const list = document.getElementById("cart-list");
  const total = document.getElementById("cart-total");
  if (!list || !total) return;
  list.innerHTML = "";
  if (!cart.items.length) {
    list.innerHTML = "<li>Carrinho vazio.</li>";
    total.textContent = "R$ 0,00";
    return;
  }
  cart.items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${item.name} - ${item.quantity}x (${formatPrice(item.price)}) = <strong>${formatPrice(item.subtotal)}</strong>
      <button data-id="${item.productId}" class="danger-btn">Remover</button>
    `;
    li.querySelector("button").addEventListener("click", async () => {
      await window.appApi.removeFromCart(item.productId);
      await refreshDashboardData();
    });
    list.appendChild(li);
  });
  total.textContent = formatPrice(cart.total);
}

function renderOrders(orders) {
  const list = document.getElementById("orders-list");
  if (!list) return;
  list.innerHTML = "";
  if (!orders.length) {
    list.innerHTML = "<li>Nenhum pedido encontrado.</li>";
    return;
  }
  orders.forEach((order) => {
    const li = document.createElement("li");
    const cliente =
      order.user && typeof order.user === "object"
        ? ` — ${order.user.name} (${order.user.email})`
        : "";
    li.textContent = `Pedido #${order.id}${cliente} — ${formatPrice(order.total)} — ${new Date(
      order.createdAt
    ).toLocaleString("pt-BR")}`;
    list.appendChild(li);
  });
}

async function refreshDashboardData() {
  const user = window.authStorage.getCurrentUser();
  if (!user || user.role !== "ADMIN") return;

  const products = await window.appApi.getProducts();
  renderProductsReadOnly(products, "dashboard-products-list");

  const orders = await window.appApi.getOrders();
  renderOrders(orders);

  renderAdminProductList(products);
}

function renderAdminProductList(products) {
  const container = document.getElementById("admin-products-list");
  if (!container) return;
  container.innerHTML = "";
  products.forEach((product) => {
    const item = document.createElement("div");
    item.className = "admin-product-item";
    item.innerHTML = `
      <span>${window.escapeHtml(product.name)} — ${formatPrice(product.price)}</span>
      <div>
        <button data-action="edit" data-id="${product.id}">Editar</button>
        <button data-action="delete" data-id="${product.id}" class="danger-btn">Excluir</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener("click", async () => {
      const name = prompt("Novo nome:", product.name);
      const price = prompt("Novo preco:", product.price);
      const description = prompt("Nova descricao:", product.description || "");
      const imageUrl = prompt("URL da imagem (opcional, https://...):", product.imageUrl || "");
      if (!name || !price) return;
      await window.appApi.updateProduct(product.id, {
        name,
        price: Number(price),
        description,
        imageUrl: imageUrl != null && String(imageUrl).trim() ? String(imageUrl).trim() : null,
      });
      await refreshDashboardData();
    });
    item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      await window.appApi.deleteProduct(product.id);
      await refreshDashboardData();
    });
    container.appendChild(item);
  });
}

function setupDashboardPage() {
  const user = window.authStorage.getCurrentUser();
  if (!user || !window.authStorage.getToken()) {
    window.location.href = "/HTML/login.html";
    return;
  }

  if (user.role !== "ADMIN") {
    window.location.replace("/index.html");
    return;
  }

  const clientSection = document.getElementById("client-section");
  const adminSection = document.getElementById("admin-section");
  if (clientSection) clientSection.classList.add("hidden");
  if (adminSection) adminSection.classList.remove("hidden");

  document.getElementById("user-info").textContent = `${user.name} (${user.role})`;
  document.getElementById("logout-btn").addEventListener("click", () => {
    window.authStorage.clearAuth();
    window.location.href = "/index.html";
  });

  const addProductForm = document.getElementById("add-product-form");
  if (addProductForm) {
    addProductForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = document.getElementById("product-name").value;
      const price = Number(document.getElementById("product-price").value);
      const description = document.getElementById("product-description").value;
      const imageEl = document.getElementById("product-image-url");
      const imageUrl = imageEl && imageEl.value.trim() ? imageEl.value.trim() : undefined;
      await window.appApi.createProduct({ name, price, description, imageUrl });
      addProductForm.reset();
      await refreshDashboardData();
      showMessage("Produto criado com sucesso.", "success");
    });
  }

  refreshDashboardData().catch((error) => showMessage(error.message, "error"));
}

function initPage() {
  const page = document.body.dataset.page;
  if (page === "index") return setupIndexPage();
  if (page === "login") return setupLoginPage();
  if (page === "register") return setupRegisterPage();
  if (page === "cart") return setupCartPage();
  if (page === "dashboard") return setupDashboardPage();
  return null;
}

document.addEventListener("DOMContentLoaded", initPage);
