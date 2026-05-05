/**
 * Servidor estatico da pasta frontend/ + proxy /api -> backend (API_URL, padrao http://localhost:3000).
 * Pastas: /api (cliente JS), /js (paginas), /css, /HTML, /admin, index.html
 */
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = Number(process.env.PORT) || 5173;
const root = __dirname;
const API_TARGET = process.env.API_URL || "http://localhost:3000";

app.use(
  "/api",
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
  })
);

app.use(express.static(root));

app.listen(PORT, () => {
  console.log(`Frontend estatico em http://localhost:${PORT}`);
  console.log(`Proxy API /api -> ${API_TARGET}`);
});
