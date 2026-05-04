const express = require("express");
const routes = require("./routes/routes");
const bcrypt = require("bcryptjs");
const model = require("./models/model");

const app = express();
const PORT = 3000;
let httpServer = null;

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (_req, res) => {
  res.json({
    message: "API da Pizzaria online.",
    docs: {
      auth: ["/api/auth/register", "/api/auth/login"],
      products: ["/api/products"],
      cart: ["/api/cart", "/api/cart/add", "/api/cart/remove/:productId", "/api/cart/checkout"],
      orders: ["/api/orders"],
    },
  });
});

app.use("/api", routes);

async function startServer() {
  const adminPasswordHash = await bcrypt.hash("123456", 10);
  await model.bootstrapInitialData({ adminPasswordHash });

  httpServer = app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
  });

  // Mantem o processo ativo no ambiente local/terminal.
  process.stdin.resume();
}

startServer().catch((error) => {
  console.error("Falha ao iniciar backend:", error);
  process.exit(1);
});
