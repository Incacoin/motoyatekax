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
  res.json(driver);
});

module.exports = router;
