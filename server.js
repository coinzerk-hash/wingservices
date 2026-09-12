require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');

const { attachUser } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

// Anonymous cart-session cookie, independent of login, so guests can shop too
app.use((req, res, next) => {
  let sid = req.cookies.ws_cart;
  if (!sid) {
    sid = crypto.randomBytes(16).toString('hex');
    res.cookie('ws_cart', sid, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
  }
  req.cartSessionId = sid;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api', serviceRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`WingServices running on http://localhost:${PORT}`);
});
