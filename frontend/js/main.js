function showMessage(message, type = "info") {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
}

function formatPrice(value) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function renderProducts(products, targetId, onAdd) {
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
      <button data-id="${product.id}">Adicionar ao carrinho</button>
    `;
    card.querySelector("button").addEventListener("click", () => onAdd(product.id));
    container.appendChild(card);
  });
}

async function setupIndexPage() {
  const user = window.authStorage.getCurrentUser();
  const loginBtn = document.getElementById("login-btn");
  const dashboardBtn = document.getElementById("dashboard-btn");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (user) {
    loginBtn.textContent = "Sair";
    loginBtn.addEventListener("click", () => {
      window.authStorage.clearAuth();
      window.location.reload();
    });
    dashboardBtn.classList.remove("hidden");
    dashboardBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  } else {
    loginBtn.addEventListener("click", () => (window.location.href = "login.html"));
  }

  try {
    const products = await window.appApi.getProducts();
    renderProducts(products, "products-list", async (productId) => {
      if (!window.authStorage.getToken()) {
        showMessage("Faca login para adicionar itens ao carrinho.", "error");
        return;
      }
      await window.appApi.addToCart({ productId, quantity: 1 });
      showMessage("Produto adicionado ao carrinho.", "success");
    });
  } catch (error) {
    showMessage(error.message, "error");
  }

  checkoutBtn.addEventListener("click", () => {
    if (!window.authStorage.getToken()) {
      showMessage("Nao e possivel finalizar sem login.", "error");
      return;
    }
    window.location.href = "dashboard.html";
  });
}

function setupLoginPage() {
  const form = document.getElementById("login-form");
  const registerBtn = document.getElementById("go-register-btn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const data = await window.appApi.login({ email, password });
      window.authStorage.saveAuth(data);
      window.location.href = "dashboard.html";
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  registerBtn.addEventListener("click", () => {
    window.location.href = "cadastro.html";
  });
}

function setupRegisterPage() {
  const form = document.getElementById("register-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await window.appApi.register({ name, email, password });
      showMessage("Cadastro realizado! Faca login para continuar.", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

function renderCart(cart) {
  const list = document.getElementById("cart-list");
  const total = document.getElementById("cart-total");
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
  list.innerHTML = "";
  if (!orders.length) {
    list.innerHTML = "<li>Nenhum pedido encontrado.</li>";
    return;
  }
  orders.forEach((order) => {
    const li = document.createElement("li");
    li.innerHTML = `Pedido #${order.id} - ${formatPrice(order.total)} - ${new Date(order.createdAt).toLocaleString("pt-BR")}`;
    list.appendChild(li);
  });
}

async function refreshDashboardData() {
  const user = window.authStorage.getCurrentUser();
  const products = await window.appApi.getProducts();
  renderProducts(products, "dashboard-products-list", async (productId) => {
    await window.appApi.addToCart({ productId, quantity: 1 });
    showMessage("Produto adicionado ao carrinho.", "success");
    await refreshDashboardData();
  });

  if (user.role === "CLIENTE") {
    const cart = await window.appApi.getCart();
    renderCart(cart);
  }

  const orders = await window.appApi.getOrders();
  renderOrders(orders);

  if (user.role === "ADMIN") {
    renderAdminProductList(products);
  }
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

  document.getElementById("user-info").textContent = `${user.name} (${user.role})`;
  document.getElementById("logout-btn").addEventListener("click", () => {
    window.authStorage.clearAuth();
    window.location.href = "index.html";
  });

  const adminSection = document.getElementById("admin-section");
  const clientSection = document.getElementById("client-section");
  if (user.role === "ADMIN") {
    adminSection.classList.remove("hidden");
    clientSection.classList.add("hidden");
  } else {
    clientSection.classList.remove("hidden");
    adminSection.classList.add("hidden");
  }

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      try {
        await window.appApi.checkout();
        showMessage("Pedido finalizado com sucesso.", "success");
        await refreshDashboardData();
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  }

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
