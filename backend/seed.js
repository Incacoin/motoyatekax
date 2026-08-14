const db = require("./db");

const drivers = [
  { name: "Chofer 1", phone: "9990000001", vehicle: "Mototaxi rojo", pin: "1111" },
  { name: "Chofer 2", phone: "9990000002", vehicle: "Mototaxi azul", pin: "2222" },
  { name: "Chofer 3", phone: "9990000003", vehicle: "Mototaxi verde", pin: "3333" },
];

const insert = db.prepare(
  "INSERT OR IGNORE INTO drivers (name, phone, vehicle, pin) VALUES (?, ?, ?, ?)"
);

for (const d of drivers) {
  insert.run(d.name, d.phone, d.vehicle, d.pin);
}

console.log("Choferes de prueba listos. PINs: 1111, 2222, 3333");
