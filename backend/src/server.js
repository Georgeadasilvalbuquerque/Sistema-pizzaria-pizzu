const express = require("express");
const routes = require("./routes/routes");

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});
