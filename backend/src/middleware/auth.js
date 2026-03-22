const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing bearer token" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "missing bearer token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    if (!payload || payload.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    req.admin = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "invalid token" });
  }
}

module.exports = { requireAdmin };
