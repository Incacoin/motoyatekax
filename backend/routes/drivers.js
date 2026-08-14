const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/drivers/login", (req, res) => {
  const { pin } = req.body;
  const driver = db
    .prepare(
      "SELECT id, name, phone, vehicle, status FROM drivers WHERE pin = ?"
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
