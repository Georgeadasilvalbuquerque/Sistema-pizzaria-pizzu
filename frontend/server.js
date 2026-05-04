const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 5173;
const root = __dirname;

app.use(express.static(root));

app.listen(PORT, () => {
  console.log(`Frontend estatico em http://localhost:${PORT}`);
});
