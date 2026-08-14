const { WebSocketServer } = require("ws");
const url = require("node:url");
const db = require("./db");

// driverId -> WebSocket
const driverSockets = new Map();
// rideId -> Set<WebSocket>
const rideSubscribers = new Map();

function attach(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const { query } = url.parse(req.url, true);

    if (query.role === "driver") {
      const driverId = Number(query.driverId);
      const driver = driverId
        ? db.prepare("SELECT id FROM drivers WHERE id = ?").get(driverId)
        : null;
      if (!driver) {
        ws.close(4004, "unknown driver");
        return;
      }

      driverSockets.set(driverId, ws);

      ws.on("message", (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (msg.type === "location") {
          const { lat, lng } = msg;
          db.prepare(
            "UPDATE drivers SET lat = ?, lng = ?, last_seen = datetime('now') WHERE id = ?"
          ).run(lat, lng, driverId);

          const activeRide = db
            .prepare(
              "SELECT id FROM rides WHERE driver_id = ? AND status IN ('aceptado', 'en_camino')"
            )
            .get(driverId);
          if (activeRide) {
            notifyRide(activeRide.id, "driver_location", { lat, lng });
          }
        } else if (msg.type === "status") {
          db.prepare("UPDATE drivers SET status = ? WHERE id = ?").run(
            msg.status,
            driverId
          );
        }
      });

      ws.on("close", () => {
        if (driverSockets.get(driverId) === ws) {
          driverSockets.delete(driverId);
          db.prepare(
            "UPDATE drivers SET status = 'offline' WHERE id = ?"
          ).run(driverId);
        }
      });
      return;
    }

    if (query.role === "rider") {
      const rideId = Number(query.rideId);
      const ride = rideId
        ? db.prepare("SELECT id FROM rides WHERE id = ?").get(rideId)
        : null;
      if (!ride) {
        ws.close(4004, "unknown ride");
        return;
      }

      if (!rideSubscribers.has(rideId)) rideSubscribers.set(rideId, new Set());
      rideSubscribers.get(rideId).add(ws);

      ws.on("close", () => {
        rideSubscribers.get(rideId)?.delete(ws);
      });
      return;
    }

    ws.close(4000, "missing role");
  });

  return wss;
}

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function notifyRide(rideId, type, payload) {
  const clients = rideSubscribers.get(rideId);
  if (!clients) return;
  for (const ws of clients) send(ws, type, payload);
}

function broadcastNewRide(ride) {
  const available = db
    .prepare("SELECT id FROM drivers WHERE status = 'disponible'")
    .all();
  for (const { id } of available) {
    const ws = driverSockets.get(id);
    if (ws) send(ws, "new_ride", ride);
  }
}

function broadcastRideTaken(rideId, winningDriverId) {
  for (const [driverId, ws] of driverSockets) {
    if (driverId !== winningDriverId) send(ws, "ride_taken", { rideId });
  }
}

function broadcastRideRemoved(rideId) {
  for (const ws of driverSockets.values()) send(ws, "ride_taken", { rideId });
}

function notifyDriver(driverId, type, payload) {
  const ws = driverSockets.get(driverId);
  if (ws) send(ws, type, payload);
}

module.exports = {
  attach,
  notifyRide,
  broadcastNewRide,
  broadcastRideTaken,
  broadcastRideRemoved,
  notifyDriver,
};
