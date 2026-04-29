const model = require("../models/model");

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Token ausente." });
  const user = model.findUserByToken(token);
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

function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, email e senha sao obrigatorios." });
  }
  const existing = model.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "Email ja cadastrado." });
  }
  const user = model.createUser({ name, email, password });
  return res.status(201).json({ message: "Cadastro realizado com sucesso.", user });
}

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha sao obrigatorios." });
  }
  const user = model.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Credenciais invalidas." });
  }
  const token = model.createSession(user.id);
  return res.json({
    token,
    user: model.sanitizeUser(user),
  });
}

function getProducts(_req, res) {
  return res.json(model.listProducts());
}

function createProduct(req, res) {
  const { name, price, description } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: "Nome e preco sao obrigatorios." });
  }
  const created = model.createProduct({ name, price, description });
  return res.status(201).json(created);
}

function updateProduct(req, res) {
  const updated = model.updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Produto nao encontrado." });
  return res.json(updated);
}

function removeProduct(req, res) {
  const deleted = model.deleteProduct(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Produto nao encontrado." });
  return res.json({ message: "Produto removido com sucesso." });
}

function getCart(req, res) {
  return res.json(model.getDetailedCart(req.user.id));
}

function addToCart(req, res) {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ error: "productId e obrigatorio." });
  const result = model.addProductToCart(req.user.id, productId, quantity || 1);
  if (result.error) return res.status(404).json({ error: result.error });
  return res.json(model.getDetailedCart(req.user.id));
}

function removeFromCart(req, res) {
  const removed = model.removeProductFromCart(req.user.id, req.params.productId);
  if (!removed) return res.status(404).json({ error: "Item nao encontrado no carrinho." });
  return res.json(model.getDetailedCart(req.user.id));
}

function checkout(req, res) {
  if (req.user.role !== "CLIENTE") {
    return res.status(403).json({ error: "Apenas CLIENTE pode finalizar compra." });
  }
  const result = model.checkout(req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  return res.json({ message: "Compra finalizada com sucesso.", order: result.order });
}

function getOrders(req, res) {
  const orders = model.listOrdersForUser(req.user);
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
