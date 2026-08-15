const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dbPath = path.join(__dirname, "data", "motoya.db");
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle TEXT,
    pin TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'offline',
    lat REAL,
    lng REAL,
    last_seen TEXT,
    paid_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_name TEXT NOT NULL,
    rider_phone TEXT NOT NULL,
    pickup_lat REAL NOT NULL,
    pickup_lng REAL NOT NULL,
    pickup_label TEXT,
    dest_lat REAL,
    dest_lng REAL,
    dest_label TEXT,
    passengers INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'buscando',
    driver_id INTEGER REFERENCES drivers(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

try {
  db.exec("ALTER TABLE drivers ADD COLUMN paid_until TEXT");
} catch {
  // la columna ya existe
}

try {
  db.exec("ALTER TABLE drivers ADD COLUMN vouched_by TEXT");
} catch {
  // la columna ya existe
}

try {
  db.exec("ALTER TABLE drivers ADD COLUMN vouched_at TEXT");
} catch {
  // la columna ya existe
}

try {
  db.exec("ALTER TABLE rides ADD COLUMN passengers INTEGER NOT NULL DEFAULT 1");
} catch {
  // la columna ya existe
}

try {
  db.exec("ALTER TABLE rides ADD COLUMN driver_disconnected_at TEXT");
} catch {
  // la columna ya existe
}

try {
  db.exec("ALTER TABLE drivers ADD COLUMN deleted_at TEXT");
} catch {
  // la columna ya existe
}

module.exports = db;
