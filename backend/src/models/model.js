const db = require("../config/db");

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function createUser({ name, email, password }) {
  const newUser = {
    id: db.counters.users++,
    name,
    email: email.toLowerCase(),
    password,
    role: "CLIENTE",
  };
  db.users.push(newUser);
  return sanitizeUser(newUser);
}

function findUserByEmail(email) {
  return db.users.find((user) => user.email === email.toLowerCase());
}

function findUserById(id) {
  return db.users.find((user) => user.id === id);
}

function createSession(userId) {
  const token = `token-${userId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  db.sessions[token] = userId;
  return token;
}

function findUserByToken(token) {
  const userId = db.sessions[token];
  if (!userId) return null;
  const user = findUserById(userId);
  return user || null;
}

function listProducts() {
  return db.products;
}

function createProduct({ name, price, description }) {
  const newProduct = {
    id: db.counters.products++,
    name,
    price: Number(price),
    description: description || "",
  };
  db.products.push(newProduct);
  return newProduct;
}

function updateProduct(id, payload) {
  const product = db.products.find((item) => item.id === Number(id));
  if (!product) return null;
  if (payload.name !== undefined) product.name = payload.name;
  if (payload.price !== undefined) product.price = Number(payload.price);
  if (payload.description !== undefined) product.description = payload.description;
  return product;
}

function deleteProduct(id) {
  const index = db.products.findIndex((item) => item.id === Number(id));
  if (index === -1) return false;
  db.products.splice(index, 1);
  return true;
}

function getCartByUser(userId) {
  if (!db.carts[userId]) db.carts[userId] = [];
  return db.carts[userId];
}

function addProductToCart(userId, productId, quantity = 1) {
  const cart = getCartByUser(userId);
  const product = db.products.find((item) => item.id === Number(productId));
  if (!product) return { error: "Produto nao encontrado." };
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    cart.push({ productId: product.id, quantity: Number(quantity) });
  }
  return { cart };
}

function removeProductFromCart(userId, productId) {
  const cart = getCartByUser(userId);
  const index = cart.findIndex((item) => item.productId === Number(productId));
  if (index === -1) return false;
  cart.splice(index, 1);
  return true;
}

function getDetailedCart(userId) {
  const cart = getCartByUser(userId);
  const items = cart
    .map((item) => {
      const product = db.products.find((p) => p.id === item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: Number((product.price * item.quantity).toFixed(2)),
      };
    })
    .filter(Boolean);
  const total = Number(items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
  return { items, total };
}

function checkout(userId) {
  const cartDetails = getDetailedCart(userId);
  if (!cartDetails.items.length) return { error: "Carrinho vazio." };
  const order = {
    id: db.counters.orders++,
    userId,
    createdAt: new Date().toISOString(),
    items: cartDetails.items,
    total: cartDetails.total,
    status: "FINALIZADO",
  };
  db.orders.push(order);
  db.carts[userId] = [];
  return { order };
}

function listOrdersForUser(user) {
  if (user.role === "ADMIN") return db.orders;
  return db.orders.filter((order) => order.userId === user.id);
}

module.exports = {
  sanitizeUser,
  createUser,
  findUserByEmail,
  createSession,
  findUserByToken,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCartByUser,
  addProductToCart,
  removeProductFromCart,
  getDetailedCart,
  checkout,
  listOrdersForUser,
};
