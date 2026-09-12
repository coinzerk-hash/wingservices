const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'wingservices-dev-secret-change-me';

function attachUser(req, res, next) {
  const token = req.cookies && req.cookies.ws_token;
  req.user = null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
    } catch (e) {
      // invalid/expired token — ignore, treat as guest
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  }
  next();
}

module.exports = { attachUser, requireAuth, JWT_SECRET };
