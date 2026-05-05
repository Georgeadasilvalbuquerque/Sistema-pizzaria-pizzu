const { FRONTEND_ORIGIN } = require("../config/env");

function corsMiddleware(req, res, next) {
  const allowOrigin = FRONTEND_ORIGIN || "*";
  res.header("Access-Control-Allow-Origin", allowOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

module.exports = { corsMiddleware };
