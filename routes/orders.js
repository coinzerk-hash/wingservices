const express = require('express');
const db = require('../db/init');

const router = express.Router();

const PAYMENT_METHODS = ['crypto', 'paypal', 'cashapp', 'venmo', 'osrs_gp', 'bank_transfer'];

router.post('/checkout', (req, res) => {
  const { rsn, discord, payment_method } = req.body || {};

  if (!rsn || !payment_method) {
    return res.status(400).json({ error: 'اسم الحساب في اللعبة وطريقة الدفع مطلوبة' });
  }
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ error: 'طريقة دفع غير مدعومة' });
  }

  const cartItems = db.prepare(`
    SELECT ci.quantity, s.id AS service_id, s.name, s.price_from
    FROM cart_items ci JOIN services s ON s.id = ci.service_id
    WHERE ci.session_id = ?
  `).all(req.cartSessionId);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'السلة فارغة' });
  }

  const total = cartItems.reduce((sum, i) => sum + i.price_from * i.quantity, 0);
  const userId = req.user ? req.user.id : null;

  const orderInfo = db.prepare(`
    INSERT INTO orders (user_id, rsn, discord, payment_method, total, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(userId, rsn.trim(), (discord || '').trim(), payment_method, total);

  const orderId = Number(orderInfo.lastInsertRowid);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, service_id, service_name, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const item of cartItems) {
    insertItem.run(orderId, item.service_id, item.name, item.quantity, item.price_from);
  }

  // Simulate payment gateway confirmation (demo only — no real payment processor connected)
  db.prepare("UPDATE orders SET status = 'awaiting_payment' WHERE id = ?").run(orderId);

  // Clear the cart now that the order has been placed
  db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(req.cartSessionId);

  res.json({
    ok: true,
    order: {
      id: orderId,
      total,
      status: 'awaiting_payment',
      payment_method,
      items: cartItems,
    },
  });
});

router.get('/my', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول' });

  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const withItems = orders.map((o) => ({ ...o, items: itemsStmt.all(o.id) }));

  res.json(withItems);
});

router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

module.exports = router;
