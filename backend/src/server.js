require("dotenv/config");
const path = require("path");
const express = require("express");
const routes = require("./routes/routes");
const bcrypt = require("bcryptjs");
const prisma = require("./config/prisma");
const model = require("./models/model");
const { PORT } = require("./config/env");
const { corsMiddleware } = require("./middleware/cors");

const app = express();
let httpServer = null;

/** Pasta do site (index.html, css/, js/, api/, HTML/, admin/) — irma do diretorio backend/ */
const FRONTEND_DIR = path.join(__dirname, "..", "..", "frontend");

function logDatabaseEnvHint() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !String(raw).trim()) {
    console.error("[DB] DATABASE_URL nao esta definida em backend/.env");
    return;
  }
  try {
    const normalized = String(raw).replace(/^postgresql:\/\//i, "http://");
    const u = new URL(normalized);
    const hasSsl =
      /sslmode=require/i.test(raw) || /ssl=true/i.test(raw) || /channel_binding=require/i.test(raw);
    console.log(`[DB] Host (DATABASE_URL): ${u.hostname}${u.port ? `:${u.port}` : ""}`);
    if (!hasSsl) {
      console.warn('[DB] Sugestao: inclua ?sslmode=require no final da URL (Neon exige SSL).');
    }
  } catch {
    console.warn("[DB] DATABASE_URL nao parece uma URL valida. Confira aspas e quebras de linha no .env");
  }
}

async function connectDatabaseWithRetry(client, { maxAttempts = 10 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.$connect();
      if (attempt > 1) {
        console.log("[DB] Conexao com o PostgreSQL estabelecida apos novas tentativas.");
      }
      return;
    } catch (err) {
      lastError = err;
      const delayMs = Math.min(2000 * attempt, 12000);
      const code = err && err.errorCode ? err.errorCode : err && err.code;
      console.warn(
        `[DB] Tentativa ${attempt}/${maxAttempts} falhou${code ? ` (${code})` : ""}. Nova tentativa em ${delayMs}ms...`
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

function printDatabaseConnectionHelp(err) {
  const msg = err && err.message ? err.message : String(err);
  console.error(`
------------------------------------------------------------------
Nao foi possivel conectar ao banco (Neon / PostgreSQL).

Confira no https://console.neon.tech :
  - O projeto e o branch estao ativos (compute nao suspenso ha muito tempo).
  - Connection string: use a opcao com pooling em DATABASE_URL se o Neon oferecer.
  - DIRECT_URL: use a conexao "direta" (host sem "-pooler") ou repita a mesma URL.

No arquivo backend/.env :
  - DATABASE_URL e DIRECT_URL sem aspas extras e sem espacos no comeco/fim da linha.
  - Salve o .env como UTF-8 (evite UTF-16 no Bloco de Notas do Windows).
  - A URL deve acessar a internet na porta 5432 (firewall/VPN corporativa bloqueia).

Erro retornado: ${msg}
------------------------------------------------------------------
`);
}

app.use(express.json());
app.use(corsMiddleware);

app.get("/api", (_req, res) => {
  res.json({
    message: "API da Pizzaria online.",
    docs: {
      auth: ["/api/auth/register", "/api/auth/login"],
      products: ["/api/products"],
      cart: ["/api/cart", "/api/cart/add", "/api/cart/remove/:productId", "/api/cart/checkout"],
      orders: ["/api/orders"],
    },
    site: "A interface web esta em GET / (index.html).",
  });
});

app.use("/api", routes);

app.use(express.static(FRONTEND_DIR, { index: "index.html" }));

async function startServer() {
  logDatabaseEnvHint();
  await connectDatabaseWithRetry(prisma);
  const testPasswordHash = await bcrypt.hash("123456", 10);
  await model.bootstrapInitialData({ testPasswordHash });

  httpServer = app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`  Site (index.html): http://localhost:${PORT}/`);
    console.log(`  API JSON (docs):   http://localhost:${PORT}/api`);
  });

  // Mantem o processo ativo no ambiente local/terminal.
  process.stdin.resume();
}

startServer().catch((error) => {
  const name = error && error.name;
  const msg = error && error.message ? error.message : String(error);
  if (name === "PrismaClientInitializationError" || /Can't reach database server|P1001/i.test(msg)) {
    printDatabaseConnectionHelp(error);
  } else {
    console.error("Falha ao iniciar backend:", error);
  }
  process.exit(1);
});
