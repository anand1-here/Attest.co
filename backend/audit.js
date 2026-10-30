const pool = require("./db");
module.exports = function audit(userId, action, status = 200) {
  pool.query("INSERT INTO audit_log (user_id, action, status) VALUES ($1, $2, $3)", [userId || null, action, status])
    .catch((e) => console.error("audit failed:", e.message));
};
