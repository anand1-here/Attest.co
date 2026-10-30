const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");
const pool = require("./db");
const chain = require("./chain");

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

app.use("/auth", require("./routes/auth"));
app.use("/deepfake", require("./routes/deepfake").router);
app.use("/", require("./routes/evidence"));

app.get("/health", async (req, res) => {
  const out = { status: "ok", backend: true, database: false, blockchain: null };
  try { await pool.query("SELECT 1"); out.database = true; } catch { out.status = "degraded"; }
  try { out.blockchain = await chain.health(); } catch { out.status = "degraded"; out.blockchain = { connected: false }; }
  res.json(out);
});

app.use((req, res) => res.status(404).json({ success: false, message: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(config.port, "0.0.0.0", () => console.log(`Backend running on http://localhost:${config.port}`));
