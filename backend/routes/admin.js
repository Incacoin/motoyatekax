const express = require("express");
const db = require("../db");

const router = express.Router();

function checkAdminPin(req, res, next) {
  if (req.body.adminPin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: "PIN de admin incorrecto" });
  }
  next();
}

function generateDriverPin() {
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (db.prepare("SELECT id FROM drivers WHERE pin = ?").get(pin));
  return pin;
}

router.post("/admin/login", (req, res) => {
  if (req.body.adminPin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: "PIN de admin incorrecto" });
  }
  res.json({ ok: true });
});

router.post("/admin/drivers", checkAdminPin, (req, res) => {
  const { name, phone, vehicle } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "Falta nombre o teléfono" });
  }

  const pin = generateDriverPin();
  const result = db
    .prepare(
      "INSERT INTO drivers (name, phone, vehicle, pin) VALUES (?, ?, ?, ?)"
    )
    .run(name, phone, vehicle || null, pin);

  const driver = db
    .prepare("SELECT id, name, phone, vehicle, pin, status FROM drivers WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(driver);
});

router.post("/admin/drivers/list", checkAdminPin, (req, res) => {
  const drivers = db
    .prepare(
      "SELECT id, name, phone, vehicle, pin, status, last_seen, paid_until, vouched_by, vouched_at, created_at FROM drivers ORDER BY created_at DESC"
    )
    .all();
  res.json(drivers);
});

router.post("/admin/drivers/:id/paid-until", checkAdminPin, (req, res) => {
  const { paidUntil } = req.body;
  db.prepare("UPDATE drivers SET paid_until = ? WHERE id = ?").run(
    paidUntil || null,
    req.params.id
  );
  res.json({ ok: true });
});

router.post("/admin/drivers/:id/vouch", checkAdminPin, (req, res) => {
  const { vouchedBy } = req.body;
  const vouchedAt = vouchedBy ? new Date().toISOString().slice(0, 10) : null;
  db.prepare("UPDATE drivers SET vouched_by = ?, vouched_at = ? WHERE id = ?").run(
    vouchedBy || null,
    vouchedAt,
    req.params.id
  );
  res.json({ ok: true });
});

router.post("/admin/drivers/:id/update", checkAdminPin, (req, res) => {
  const { name, phone, vehicle } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "Falta nombre o teléfono" });
  }

  db.prepare(
    "UPDATE drivers SET name = ?, phone = ?, vehicle = ? WHERE id = ?"
  ).run(name, phone, vehicle || null, req.params.id);

  const driver = db
    .prepare(
      "SELECT id, name, phone, vehicle, pin, status, last_seen, paid_until, created_at FROM drivers WHERE id = ?"
    )
    .get(req.params.id);
  res.json(driver);
});

router.post("/admin/drivers/:id/delete", checkAdminPin, (req, res) => {
  db.prepare("DELETE FROM drivers WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post("/admin/rides/list", checkAdminPin, (req, res) => {
  const rides = db
    .prepare(
      `SELECT r.id, r.rider_name, r.rider_phone, r.pickup_label, r.dest_label,
              r.passengers, r.status, r.created_at, r.updated_at, r.driver_disconnected_at,
              d.name AS driver_name
       FROM rides r
       LEFT JOIN drivers d ON d.id = r.driver_id
       ORDER BY r.updated_at DESC
       LIMIT 50`
    )
    .all();
  res.json(rides);
});

router.post("/admin/stats", checkAdminPin, (req, res) => {
  const ridesToday = db
    .prepare("SELECT COUNT(*) AS n FROM rides WHERE status = 'completado' AND date(updated_at) = date('now')")
    .get().n;
  const ridesWeek = db
    .prepare("SELECT COUNT(*) AS n FROM rides WHERE status = 'completado' AND date(updated_at) >= date('now', '-6 days')")
    .get().n;
  const cancelledToday = db
    .prepare("SELECT COUNT(*) AS n FROM rides WHERE status = 'cancelado' AND date(updated_at) = date('now')")
    .get().n;
  const driversOnline = db
    .prepare("SELECT COUNT(*) AS n FROM drivers WHERE status IN ('disponible', 'en_viaje')")
    .get().n;
  const topDrivers = db
    .prepare(
      `SELECT d.name, COUNT(*) AS rides
       FROM rides r JOIN drivers d ON d.id = r.driver_id
       WHERE r.status = 'completado' AND date(r.updated_at) >= date('now', '-6 days')
       GROUP BY r.driver_id
       ORDER BY rides DESC
       LIMIT 5`
    )
    .all();

  res.json({ ridesToday, ridesWeek, cancelledToday, driversOnline, topDrivers });
});

module.exports = router;
