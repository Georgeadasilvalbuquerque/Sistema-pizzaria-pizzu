function showMessage(message, type = "info") {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
}

function formatPrice(value) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function renderProducts(products, targetId, onAdd, options = {}) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = "";

  products.forEach((product) => {
    const basePrice = Number(product.price);
    const finalPrice = options.discountRate
      ? Number((basePrice * (1 - options.discountRate)).toFixed(2))
      : basePrice;

    const card = document.createElement("div");
    card.className = `product-card ${options.isPromotion ? "promotion-card" : ""}`.trim();
    card.innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.description || "Sem descricao."}</p>
      ${
        options.isPromotion
          ? `<small>De <s>${formatPrice(product.price)}</s></small>`
          : ""
      }
      <strong>${formatPrice(finalPrice)}</strong>
      <button data-id="${product.id}">Adicionar ao carrinho</button>
    `;
    card.querySelector("button").addEventListener("click", () =>
      onAdd(product.id, finalPrice)
    );
    container.appendChild(card);
  });
}

function renderProductsReadOnly(products, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.description || "Sem descricao."}</p>
      <strong>${formatPrice(product.price)}</strong>
    `;
    container.appendChild(card);
  });
}

function setupCarousels() {
  const scrollAmount = 320;
  const controls = document.querySelectorAll(".carousel-btn");
  controls.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.carouselTarget;
      const direction = button.dataset.direction;
      const target = document.getElementById(targetId);
      if (!target) return;
      const movement = direction === "left" ? -scrollAmount : scrollAmount;
      target.scrollBy({ left: movement, behavior: "smooth" });
    });
  });
}

async function refreshIndexCart() {
  const list = document.getElementById("index-cart-list");
  const totalEl = document.getElementById("sidebar-total");
  if (!list || !totalEl) return;

  const token = window.authStorage.getToken();
  const user = window.authStorage.getCurrentUser();
  if (!token || !user || user.role !== "CLIENTE") {
    list.innerHTML = "";
    totalEl.textContent = "R$ 0,00";
    return;
  }

  try {
    const cart = await window.appApi.getCart();
    list.innerHTML = "";
    if (!cart.items.length) {
      const li = document.createElement("li");
      li.className = "sidebar-cart-empty";
      li.textContent = "Carrinho vazio.";
      list.appendChild(li);
    } else {
      cart.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.name} x${item.quantity} — ${formatPrice(item.subtotal)}`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sidebar-cart-remove danger-btn";
        btn.textContent = "Remover";
        btn.addEventListener("click", async () => {
          await window.appApi.removeFromCart(item.productId);
          await refreshIndexCart();
        });
        li.appendChild(btn);
        list.appendChild(li);
      });
    }
    totalEl.textContent = formatPrice(cart.total);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function setupIndexPage() {
  const user = window.authStorage.getCurrentUser();
  if (user && user.role === "ADMIN") {
    window.location.replace("dashboard.html");
    return;
  }

  const loginBtn = document.getElementById("login-btn");
  const dashboardBtn = document.getElementById("dashboard-btn");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (user) {
    loginBtn.textContent = "Sair";
    loginBtn.addEventListener("click", () => {
      window.authStorage.clearAuth();
      window.location.reload();
    });
    if (dashboardBtn) dashboardBtn.classList.add("hidden");
  } else {
    loginBtn.addEventListener("click", () => (window.location.href = "login.html"));
  }

  try {
    const products = await window.appApi.getProducts();
    const addToCartHandler = async (productId) => {
      if (!window.authStorage.getToken()) {
        showMessage("Faca login para adicionar itens ao carrinho.", "error");
        return;
      }
      if (window.authStorage.getCurrentUser()?.role !== "CLIENTE") {
        showMessage("Somente o usuario de teste pode comprar nesta demonstracao.", "error");
        return;
      }
      await window.appApi.addToCart({ productId, quantity: 1 });
      showMessage("Produto adicionado ao carrinho.", "success");
      await refreshIndexCart();
    };

    renderProducts(products, "products-list", addToCartHandler);
    renderProducts(products.slice(0, 6), "promotions-list", addToCartHandler, {
      isPromotion: true,
      discountRate: 0.2,
    });
    setupCarousels();
  } catch (error) {
    showMessage(error.message, "error");
  }

  await refreshIndexCart();

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      if (!window.authStorage.getToken()) {
        showMessage("Nao e possivel finalizar sem login.", "error");
        return;
      }
      if (window.authStorage.getCurrentUser()?.role !== "CLIENTE") {
        showMessage("Somente o usuario de teste finaliza pedido na pagina principal.", "error");
        return;
      }
      try {
        await window.appApi.checkout();
        showMessage("Pedido finalizado com sucesso.", "success");
        await refreshIndexCart();
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  }
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
        window.location.href = "dashboard.html";
      } else {
        window.location.href = "index.html";
      }
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
      <span>${product.name} - ${formatPrice(product.price)}</span>
      <div>
        <button data-action="edit" data-id="${product.id}">Editar</button>
        <button data-action="delete" data-id="${product.id}" class="danger-btn">Excluir</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener("click", async () => {
      const name = prompt("Novo nome:", product.name);
      const price = prompt("Novo preco:", product.price);
      const description = prompt("Nova descricao:", product.description || "");
      if (!name || !price) return;
      await window.appApi.updateProduct(product.id, { name, price: Number(price), description });
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
    window.location.href = "login.html";
    return;
  }

  if (user.role !== "ADMIN") {
    window.location.replace("index.html");
    return;
  }

  const clientSection = document.getElementById("client-section");
  const adminSection = document.getElementById("admin-section");
  if (clientSection) clientSection.classList.add("hidden");
  if (adminSection) adminSection.classList.remove("hidden");

  document.getElementById("user-info").textContent = `${user.name} (${user.role})`;
  document.getElementById("logout-btn").addEventListener("click", () => {
    window.authStorage.clearAuth();
    window.location.href = "index.html";
  });

  const addProductForm = document.getElementById("add-product-form");
  if (addProductForm) {
    addProductForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = document.getElementById("product-name").value;
      const price = Number(document.getElementById("product-price").value);
      const description = document.getElementById("product-description").value;
      await window.appApi.createProduct({ name, price, description });
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
  if (page === "dashboard") return setupDashboardPage();
  return null;
}

document.addEventListener("DOMContentLoaded", initPage);
