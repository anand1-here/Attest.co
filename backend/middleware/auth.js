const jwt = require("jsonwebtoken");
const config = require("../config");

function tokenFrom(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  // <video src> cannot send headers, so the file route also accepts ?token=
  if (req.allowQueryToken && req.query.token) return String(req.query.token);
  return null;
}

function requireAuth(req, res, next) {
  const token = tokenFrom(req);
  if (!token) return res.status(401).json({ success: false, message: "Login required" });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" });
  next();
}

module.exports = { requireAuth, requireAdmin };
