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
      "SELECT id, name, phone, vehicle, pin, status, last_seen, paid_until, created_at FROM drivers ORDER BY created_at DESC"
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

module.exports = router;
