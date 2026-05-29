const model = require("../models/model");
const bcrypt = require("bcryptjs");

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Token ausente." });
  const user = await model.findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Token invalido." });
  req.user = model.sanitizeUser(user);
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Acesso permitido apenas para ADMIN." });
  }
  next();
}

async function register(_req, res) {
  return res.status(403).json({
    error:
      "Cadastro publico desativado. Use as contas de teste: usuario@pizzu.test ou admin@pizzu.test (senha 123456).",
  });
}

async function login(req, res) {
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha sao obrigatorios." });
  }
  const user = await model.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Credenciais invalidas." });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: "Credenciais invalidas." });
  }
  const token = await model.createSession(user.id);
  return res.json({
    token,
    user: model.sanitizeUser(user),
  });
}

async function getProducts(_req, res) {
  return res.json(await model.listProducts());
}

async function createProduct(req, res) {
  const { name, price, description, imageUrl } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: "Nome e preco sao obrigatorios." });
  }
  const created = await model.createProduct({ name, price, description, imageUrl });
  return res.status(201).json(created);
}

async function updateProduct(req, res) {
  const updated = await model.updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Produto nao encontrado." });
  return res.json(updated);
}

async function removeProduct(req, res) {
  const deleted = await model.deleteProduct(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Produto nao encontrado." });
  return res.json({ message: "Produto removido com sucesso." });
}

async function getCart(req, res) {
  return res.json(await model.getDetailedCart(req.user.id));
}

async function addToCart(req, res) {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ error: "productId e obrigatorio." });
  const result = await model.addProductToCart(req.user.id, productId, quantity || 1);
  if (result.error) return res.status(404).json({ error: result.error });
  return res.json(await model.getDetailedCart(req.user.id));
}

async function removeFromCart(req, res) {
  const removed = await model.removeProductFromCart(req.user.id, req.params.productId);
  if (!removed) return res.status(404).json({ error: "Item nao encontrado no carrinho." });
  return res.json(await model.getDetailedCart(req.user.id));
}

async function checkout(req, res) {
  if (req.user.role !== "CLIENTE") {
    return res.status(403).json({ error: "Apenas CLIENTE pode finalizar compra." });
  }
  const result = await model.checkout(req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  return res.json({ message: "Compra finalizada com sucesso.", order: result.order });
}

async function getOrders(req, res) {
  const orders = await model.listOrdersForUser(req.user);
  return res.json(orders);
}

module.exports = {
  requireAuth,
  requireAdmin,
  register,
  login,
  getProducts,
  createProduct,
  updateProduct,
  removeProduct,
  getCart,
  addToCart,
  removeFromCart,
  checkout,
  getOrders,
};
