// Usage: npm run create-admin -- "Name" email@example.com 'password'
const bcrypt = require("bcryptjs");
const pool = require("../db");

(async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- "Name" email password(min 8 chars)');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash`,
    [name, email.toLowerCase(), hash]
  );
  console.log("Admin ready:", email);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
