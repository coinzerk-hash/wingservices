const express = require('express');
const db = require('../db/init');

const router = express.Router();

router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY id').all();
  res.json(cats);
});

router.get('/services', (req, res) => {
  const { category } = req.query;
  let rows;
  if (category) {
    rows = db.prepare(`
      SELECT s.*, c.name AS category_name, c.slug AS category_slug
      FROM services s JOIN categories c ON c.id = s.category_id
      WHERE s.active = 1 AND c.slug = ?
      ORDER BY s.price_from ASC
    `).all(category);
  } else {
    rows = db.prepare(`
      SELECT s.*, c.name AS category_name, c.slug AS category_slug
      FROM services s JOIN categories c ON c.id = s.category_id
      WHERE s.active = 1
      ORDER BY c.id, s.price_from ASC
    `).all();
  }
  res.json(rows);
});

router.get('/services/:slug', (req, res) => {
  const row = db.prepare(`
    SELECT s.*, c.name AS category_name, c.slug AS category_slug
    FROM services s JOIN categories c ON c.id = s.category_id
    WHERE s.slug = ? AND s.active = 1
  `).get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'الخدمة غير موجودة' });
  res.json(row);
});

module.exports = router;
