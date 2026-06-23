const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    // Ensure user exists in DB (handles case where DB was reset but JWT is still valid)
    db.prepare(`
      INSERT OR IGNORE INTO users (uuid, username) VALUES (?, ?)
    `).run(req.user.uuid, req.user.username);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
