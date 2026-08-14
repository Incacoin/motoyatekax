const express = require("express");
const db = require("../db");
const realtime = require("../realtime");

const router = express.Router();

router.post("/rides", (req, res) => {
  const {
    rider_name,
    rider_phone,
    pickup_lat,
    pickup_lng,
    pickup_label,
    dest_lat,
    dest_lng,
    dest_label,
  } = req.body;

  if (!rider_name || !rider_phone || pickup_lat == null || pickup_lng == null) {
    return res.status(400).json({ error: "Faltan datos del viaje" });
  }

  const result = db
    .prepare(
      `INSERT INTO rides (rider_name, rider_phone, pickup_lat, pickup_lng, pickup_label, dest_lat, dest_lng, dest_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      rider_name,
      rider_phone,
      pickup_lat,
      pickup_lng,
      pickup_label || null,
      dest_lat ?? null,
      dest_lng ?? null,
      dest_label || null
    );

  const ride = db
    .prepare("SELECT * FROM rides WHERE id = ?")
    .get(result.lastInsertRowid);

  realtime.broadcastNewRide(ride);
  res.status(201).json(ride);
});

router.get("/rides/:id", (req, res) => {
  const ride = db
    .prepare("SELECT * FROM rides WHERE id = ?")
    .get(req.params.id);
  if (!ride) return res.status(404).json({ error: "Viaje no encontrado" });

  if (ride.driver_id) {
    ride.driver = db
      .prepare(
        "SELECT id, name, phone, vehicle, lat, lng FROM drivers WHERE id = ?"
      )
      .get(ride.driver_id);
  }
  res.json(ride);
});

router.post("/rides/:id/accept", (req, res) => {
  const rideId = Number(req.params.id);
  const { driverId } = req.body;
  if (!driverId) return res.status(400).json({ error: "Falta driverId" });

  const result = db
    .prepare(
      "UPDATE rides SET driver_id = ?, status = 'aceptado', updated_at = datetime('now') WHERE id = ? AND status = 'buscando'"
    )
    .run(driverId, rideId);

  if (result.changes === 0) {
    return res.status(409).json({ error: "El viaje ya fue tomado" });
  }

  db.prepare("UPDATE drivers SET status = 'en_viaje' WHERE id = ?").run(
    driverId
  );

  const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
  const driver = db
    .prepare(
      "SELECT id, name, phone, vehicle, lat, lng FROM drivers WHERE id = ?"
    )
    .get(driverId);

  realtime.notifyRide(rideId, "ride_accepted", driver);
  realtime.broadcastRideTaken(rideId, driverId);
  res.json(ride);
});

router.post("/rides/:id/complete", (req, res) => {
  const rideId = Number(req.params.id);
  const { driverId } = req.body;

  const result = db
    .prepare(
      "UPDATE rides SET status = 'completado', updated_at = datetime('now') WHERE id = ? AND driver_id = ?"
    )
    .run(rideId, driverId);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Viaje no encontrado" });
  }

  db.prepare("UPDATE drivers SET status = 'disponible' WHERE id = ?").run(
    driverId
  );

  realtime.notifyRide(rideId, "status_change", { status: "completado" });
  res.json({ ok: true });
});

router.post("/rides/:id/cancel", (req, res) => {
  const rideId = Number(req.params.id);
  const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
  if (!ride) return res.status(404).json({ error: "Viaje no encontrado" });

  db.prepare(
    "UPDATE rides SET status = 'cancelado', updated_at = datetime('now') WHERE id = ?"
  ).run(rideId);

  if (ride.driver_id) {
    db.prepare("UPDATE drivers SET status = 'disponible' WHERE id = ?").run(
      ride.driver_id
    );
    realtime.notifyDriver(ride.driver_id, "ride_cancelled", { rideId });
  } else {
    realtime.broadcastRideRemoved(rideId);
  }

  realtime.notifyRide(rideId, "status_change", { status: "cancelado" });
  res.json({ ok: true });
});

module.exports = router;
