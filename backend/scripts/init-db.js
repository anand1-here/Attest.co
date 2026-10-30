// Creates the database (if missing) and applies schema.sql.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("../config");

(async () => {
  const base = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
  };
  const dbName = process.env.DB_NAME || "attest";
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error("DB_NAME may only contain letters, digits and _");

  const admin = new Client({ ...base, database: "postgres" });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database ${dbName}`);
  }
  await admin.end();

  const db = new Client({ ...base, database: dbName });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8"));
  await db.end();
  console.log("Schema applied.");
})().catch((e) => { console.error("init-db failed:", e.message); process.exit(1); });
