const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/drivers/available", (req, res) => {
  const drivers = db
    .prepare(
      "SELECT id, name, lat, lng FROM drivers WHERE status = 'disponible' AND lat IS NOT NULL AND lng IS NOT NULL AND deleted_at IS NULL"
    )
    .all();
  res.json(drivers);
});

router.post("/drivers/login", (req, res) => {
  const { pin } = req.body;
  const driver = db
    .prepare(
      "SELECT id, name, phone, vehicle, status FROM drivers WHERE pin = ? AND deleted_at IS NULL"
    )
    .get(pin);

  if (!driver) {
    return res.status(404).json({ error: "PIN no encontrado" });
  }

  const { count: todayCount } = db
    .prepare(
      "SELECT COUNT(*) as count FROM rides WHERE driver_id = ? AND status = 'completado' AND date(updated_at) = date('now')"
    )
    .get(driver.id);

  res.json({ ...driver, todayCount });
});

module.exports = router;
