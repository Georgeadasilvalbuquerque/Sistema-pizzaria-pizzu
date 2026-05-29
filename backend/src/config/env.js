const PORT = Number(process.env.PORT) || 3000;
/** Origem do frontend (ex.: http://localhost:5173). Vazio = CORS com * (desenvolvimento). */
const FRONTEND_ORIGIN = String(process.env.FRONTEND_ORIGIN || "").trim();

module.exports = {
  PORT,
  FRONTEND_ORIGIN,
};
