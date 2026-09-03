const express = require("express");
const db = require("../db");
const { isRateLimited, recordFailedAttempt, clearAttempts, RATE_LIMIT_MESSAGE } = require("../pinRateLimit");

const router = express.Router();

function generateRiderPin() {
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (db.prepare("SELECT id FROM riders WHERE pin = ?").get(pin));
  return pin;
}

// Da de alta un teléfono nuevo (le genera PIN) o, si ese teléfono ya tiene
// cuenta, lo rechaza con 409 — el frontend entonces le pide su PIN en vez de
// dejarlo re-registrarse con un nombre distinto. Así deja de ser "cualquiera
// escribe cualquier teléfono": una vez que un número tiene PIN, hace falta
// para volver a usarlo.
router.post("/riders/register", (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone || phone.length !== 10) {
    return res.status(400).json({ error: "Falta nombre o teléfono válido" });
  }

  const existing = db.prepare("SELECT id, pin FROM riders WHERE phone = ?").get(phone);

  if (existing && existing.pin) {
    return res.status(409).json({ error: "Ese teléfono ya tiene cuenta" });
  }

  const pin = generateRiderPin();

  if (existing) {
    // Rider de antes de que existiera el PIN (dato viejo) — se lo asignamos
    // ahora, de una vez, en vez de dejarlo sin dueño para siempre.
    db.prepare("UPDATE riders SET name = ?, pin = ? WHERE id = ?").run(name, pin, existing.id);
    return res.status(200).json({ id: existing.id, name, phone, pin, isNewPin: true });
  }

  const result = db
    .prepare("INSERT INTO riders (phone, name, pin, created_at) VALUES (?, ?, ?, datetime('now'))")
    .run(phone, name, pin);
  res.status(201).json({ id: result.lastInsertRowid, name, phone, pin, isNewPin: true });
});

router.post("/riders/:id/update-name", (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: RATE_LIMIT_MESSAGE });
  }
  const { phone, pin, name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Falta nombre" });
  }
  const rider = db
    .prepare("SELECT id FROM riders WHERE id = ? AND phone = ? AND pin = ?")
    .get(req.params.id, phone, pin);
  if (!rider) {
    recordFailedAttempt(req.ip);
    return res.status(404).json({ error: "No autorizado" });
  }
  clearAttempts(req.ip);
  const trimmed = name.trim();
  db.prepare("UPDATE riders SET name = ? WHERE id = ?").run(trimmed, rider.id);
  res.json({ id: rider.id, name: trimmed, phone, pin });
});

router.post("/riders/:id/change-pin", (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: RATE_LIMIT_MESSAGE });
  }
  const { phone, pin } = req.body;
  const rider = db
    .prepare("SELECT id FROM riders WHERE id = ? AND phone = ? AND pin = ?")
    .get(req.params.id, phone, pin);
  if (!rider) {
    recordFailedAttempt(req.ip);
    return res.status(404).json({ error: "No autorizado" });
  }
  clearAttempts(req.ip);
  const newPin = generateRiderPin();
  db.prepare("UPDATE riders SET pin = ? WHERE id = ?").run(newPin, rider.id);
  res.json({ id: rider.id, pin: newPin });
});

router.post("/riders/login", (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: RATE_LIMIT_MESSAGE });
  }
  const { phone, pin } = req.body;
  const rider = db
    .prepare("SELECT id, name, phone, pin FROM riders WHERE phone = ? AND pin = ?")
    .get(phone, pin);

  if (!rider) {
    recordFailedAttempt(req.ip);
    return res.status(404).json({ error: "Teléfono o PIN incorrectos" });
  }
  clearAttempts(req.ip);
  res.json(rider);
});

module.exports = router;
module.exports.generateRiderPin = generateRiderPin;
