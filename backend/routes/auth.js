const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const pool = require("../db");
const config = require("../config");
const audit = require("../audit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again in a few minutes." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const sign = (u) =>
  jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Public registration always creates a normal user. Admins are created with `npm run create-admin`.
router.post("/register", limiter, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || name.length > 200) return res.status(400).json({ success: false, message: "Name is required" });
  if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ success: false, message: "Enter a valid email" });
  if (password.length < 8 || password.length > 72)
    return res.status(400).json({ success: false, message: "Password must be 8 to 72 characters" });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role",
      [name, email, hash]
    );
    audit(rows[0].id, "User registered");
    res.status(201).json({ success: true, token: sign(rows[0]), user: publicUser(rows[0]) });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ success: false, message: "An account with this email already exists" });
    console.error("register:", e.message);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

router.post("/login", limiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const wantRole = req.body.role === "admin" ? "admin" : "user";
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const u = rows[0];
    // Same message for unknown email and wrong password
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      audit(u?.id, "Failed login attempt", 401);
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (wantRole === "admin" && u.role !== "admin") {
      audit(u.id, "Admin login refused", 403);
      return res.status(403).json({ success: false, message: "This account is not an administrator" });
    }
    audit(u.id, "User logged in");
    res.json({ success: true, token: sign(u), user: publicUser(u) });
  } catch (e) {
    console.error("login:", e.message);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

module.exports = router;
