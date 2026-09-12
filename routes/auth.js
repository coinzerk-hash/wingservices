const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/init');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/register', (req, res) => {
  const { email, password, rsn, discord } = req.body || {};

  if (!email || !password || !rsn) {
    return res.status(400).json({ error: 'الإيميل، كلمة المرور واسم الحساب في اللعبة مطلوبة' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'هذا الإيميل مسجل بالفعل' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email, password_hash, rsn, discord) VALUES (?, ?, ?, ?)')
    .run(email.toLowerCase().trim(), hash, rsn.trim(), (discord || '').trim());

  const token = jwt.sign({ id: Number(info.lastInsertRowid), email, rsn }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('ws_token', token, COOKIE_OPTS);
  res.json({ ok: true, user: { id: Number(info.lastInsertRowid), email, rsn } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'الإيميل وكلمة المرور مطلوبان' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, rsn: user.rsn }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('ws_token', token, COOKIE_OPTS);
  res.json({ ok: true, user: { id: user.id, email: user.email, rsn: user.rsn } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('ws_token');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
