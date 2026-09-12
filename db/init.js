const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'wingservices.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rsn TEXT,
  discord TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_from REAL NOT NULL,
  eta TEXT,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  rsn TEXT NOT NULL,
  discord TEXT,
  payment_method TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// --- Seed categories & services only if empty ---
const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;

if (catCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)');
  const cats = [
    ['Boss Services', 'bosses', 'Guaranteed kill counts at Inferno, ToA, ToB, CoX and more.'],
    ['Skilling', 'skilling', '1-99 training for any skill using the fastest safe methods.'],
    ['Quests & Diaries', 'quests', 'Full quest cape, achievement diaries and unlock bundles.'],
    ['Minigames', 'minigames', 'Minigame completions, outfits and reward unlocks.'],
    ['Ironman Support', 'ironman', 'Resource gathering and progression bundles for Ironman accounts.'],
    ['GP Farming', 'gp-farming', 'Consistent gold-per-hour farming at high value bosses and skills.'],
  ];
  for (const c of cats) insertCat.run(...c);

  const insertSvc = db.prepare(`
    INSERT INTO services (category_id, name, slug, description, price_from, eta)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const services = [
    [1, 'Inferno Cape', 'inferno-cape', 'Full Inferno completion, all waves, cape delivered to your account.', 320, '1-2 hours'],
    [1, 'Theatre of Blood (Hard Mode)', 'tob-hardmode', 'HM ToB raid completion with full loot handed over.', 280, '45-90 min'],
    [1, 'Tombs of Amascut (500 Invocation)', 'toa-500', '500 invocation raid, purple room chances included.', 250, '30-60 min'],
    [1, 'Chambers of Xeric CM', 'cox-cm', 'Challenge Mode raid completion, private or group.', 260, '40-70 min'],
    [1, 'Vorkath 500 KC', 'vorkath-500', 'Bulk Vorkath kill count with drop tracking.', 300, '2-4 days'],
    [1, 'Zulrah 300 KC', 'zulrah-300', 'Bulk Zulrah kills with full rotation coverage.', 220, '1-3 days'],
    [2, '1-99 Herblore', 'herblore-99', 'Fastest safe methods, potions supplied.', 90, '2-3 days'],
    [2, '1-99 Prayer', 'prayer-99', 'Bone/ash flicking or standard training, your choice.', 60, '1-2 days'],
    [2, '1-99 Agility', 'agility-99', 'Rooftop course training with pet chance.', 45, '3-5 days'],
    [2, '1-99 Farming', 'farming-99', 'Herb runs and tree patches, contracts included.', 55, '4-6 days'],
    [2, 'Max Combat Stats', 'max-combat', '99 Attack, Strength, Defence, Hitpoints, Ranged, Magic.', 240, '5-8 days'],
    [3, 'Full Quest Cape', 'quest-cape', 'Every quest completed, cape and points unlocked.', 180, '5-7 days'],
    [3, 'Achievement Diaries (All Elite)', 'diaries-elite', 'All regional diaries up to Elite tier.', 150, '4-6 days'],
    [3, 'Recipe for Disaster', 'rfd', 'Full RFD questline including all subquests.', 40, '4-8 hours'],
    [4, 'Barbarian Assault (High Gambles)', 'barb-assault', 'Levels trained for high level gambles and rewards.', 70, '2-3 days'],
    [4, 'Fight Caves Cape', 'fight-caves', 'TzTok-Jad kill and Fire Cape delivery.', 45, '30-60 min'],
    [5, 'Ironman Starter Pack', 'iron-starter', 'Early resource and gear gathering bundle.', 30, '1-2 days'],
    [5, 'Ironman Zulrah Unlock', 'iron-zulrah', 'Requirements completed and first kills secured.', 50, '1 day'],
    [6, 'Vorkath GP Farming (per day)', 'gp-vorkath', 'Consistent daily gold farming rate at Vorkath.', 25, 'per day'],
    [6, 'Blast Furnace GP Farming (per day)', 'gp-blast-furnace', 'Steady smithing profit farming.', 20, 'per day'],
  ];
  for (const s of services) insertSvc.run(...s);
}

// --- Seed a demo user so login can be tested immediately ---
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('demo1234', 10);
  db.prepare('INSERT INTO users (email, password_hash, rsn, discord) VALUES (?, ?, ?, ?)')
    .run('demo@wingservices.gg', hash, 'DemoScaper', 'demo#0001');
}

module.exports = db;
