const express = require('express');
const db = require('../db/init');

const router = express.Router();

function getCartWithTotals(sessionId) {
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, ci.notes, s.id AS service_id, s.name, s.price_from, s.eta, c.name AS category_name
    FROM cart_items ci
    JOIN services s ON s.id = ci.service_id
    JOIN categories c ON c.id = s.category_id
    WHERE ci.session_id = ?
    ORDER BY ci.id ASC
  `).all(sessionId);

  const total = items.reduce((sum, i) => sum + i.price_from * i.quantity, 0);
  return { items, total };
}

router.get('/', (req, res) => {
  res.json(getCartWithTotals(req.cartSessionId));
});

router.post('/add', (req, res) => {
  const { service_id, quantity, notes } = req.body || {};
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const service = db.prepare('SELECT id FROM services WHERE id = ? AND active = 1').get(service_id);
  if (!service) return res.status(404).json({ error: 'الخدمة غير موجودة' });

  const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE session_id = ? AND service_id = ?')
    .get(req.cartSessionId, service_id);

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(existing.quantity + qty, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (session_id, service_id, quantity, notes) VALUES (?, ?, ?, ?)')
      .run(req.cartSessionId, service_id, qty, notes || null);
  }

  res.json(getCartWithTotals(req.cartSessionId));
});

router.post('/update', (req, res) => {
  const { item_id, quantity } = req.body || {};
  const qty = parseInt(quantity, 10);

  if (!qty || qty < 1) {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(item_id, req.cartSessionId);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND session_id = ?').run(qty, item_id, req.cartSessionId);
  }
  res.json(getCartWithTotals(req.cartSessionId));
});

router.post('/remove', (req, res) => {
  const { item_id } = req.body || {};
  db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(item_id, req.cartSessionId);
  res.json(getCartWithTotals(req.cartSessionId));
});

router.post('/clear', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(req.cartSessionId);
  res.json(getCartWithTotals(req.cartSessionId));
});

module.exports = router;
