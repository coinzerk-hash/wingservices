const express = require('express');
const db = require('../db/init');

const router = express.Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

function buildCatalogContext() {
  const rows = db.prepare(`
    SELECT c.name AS category, s.name, s.price_from, s.eta
    FROM services s JOIN categories c ON c.id = s.category_id
    WHERE s.active = 1
    ORDER BY c.id, s.price_from
  `).all();

  const byCategory = {};
  for (const r of rows) {
    byCategory[r.category] = byCategory[r.category] || [];
    byCategory[r.category].push(`${r.name} — from ${r.price_from} USD, ETA ${r.eta}`);
  }

  return Object.entries(byCategory)
    .map(([cat, items]) => `${cat}:\n- ${items.join('\n- ')}`)
    .join('\n\n');
}

function systemPrompt() {
  return `You are the support assistant for WingServices, a website that sells Old School RuneScape (OSRS) account services: boss kill services, skill training, quests, minigames, ironman support, and gold farming.

Answer in the same language the customer writes in (Arabic or English). Be concise, friendly, and helpful, like a knowledgeable support agent, not overly formal.

Here is the current live service catalog you can quote prices and ETAs from:

${buildCatalogContext()}

Guidelines:
- If asked about a service, price, or ETA, use only the catalog above. If something isn't listed, say a team member will provide a custom quote.
- Accepted payment methods: crypto, PayPal, Cash App, Venmo, OSRS gold, and bank transfer.
- Orders are placed by adding services to the cart and checking out with an RSN (RuneScape username) and Discord tag.
- Never ask for account passwords in chat — real order coordination for account access happens after checkout through the order/Discord process, never through this chat.
- If a customer seems upset about an order issue, acknowledge it and tell them a human agent will follow up, since you can't access order records directly.
- Keep answers under ~120 words unless the customer asks for detail.`;
}

router.post('/', async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'الرسالة فارغة' });
  }

  const sessionId = req.cartSessionId;

  db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
    .run(sessionId, 'user', message.trim());

  if (!ANTHROPIC_API_KEY) {
    const fallback = 'الشات بوت غير مفعل حاليًا لأن مفتاح Anthropic API غير مضبوط على السيرفر. الرجاء إضافة ANTHROPIC_API_KEY في ملف .env لتفعيل الردود الذكية.';
    db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
      .run(sessionId, 'assistant', fallback);
    return res.json({ reply: fallback, ai_enabled: false });
  }

  const history = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE session_id = ? ORDER BY id DESC LIMIT 12
  `).all(sessionId).reverse();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: systemPrompt(),
        messages: history.map((h) => ({ role: h.role, content: h.content })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      const fallback = 'حصلت مشكلة مؤقتة في الشات بوت، جرب تاني بعد شوية أو تواصل معانا على ديسكورد.';
      return res.json({ reply: fallback, ai_enabled: true, error: true });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim() || 'ممكن توضح سؤالك أكتر؟';

    db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
      .run(sessionId, 'assistant', reply);

    res.json({ reply, ai_enabled: true });
  } catch (err) {
    console.error('Chat route failure:', err);
    res.json({
      reply: 'حصلت مشكلة في الاتصال بالشات بوت، جرب تاني كمان شوية.',
      ai_enabled: true,
      error: true,
    });
  }
});

router.get('/history', (req, res) => {
  const messages = db.prepare(`
    SELECT role, content, created_at FROM chat_messages
    WHERE session_id = ? ORDER BY id ASC
  `).all(req.cartSessionId);
  res.json(messages);
});

module.exports = router;
