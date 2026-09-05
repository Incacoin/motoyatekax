const { haversineKm } = require("./geo");

// Cada ciudad de la red. lat/lng es el centro aproximado del pueblo, usado
// solo para saber en qué ciudad está alguien según su GPS — el emparejamiento
// de viajes sigue siendo por distancia real (ver MAX_MATCH_DISTANCE_KM), esto
// es nada más para la marca/etiqueta que ve la persona en pantalla.
const CITIES = [
  { id: "tekax", label: "Tekax", lat: 20.2071, lng: -89.2809 },
  { id: "ticul", label: "Ticul", lat: 20.39528, lng: -89.53389 },
];

const DEFAULT_CITY_ID = "tekax";

// Si nadie está a menos de esto de ningún centro conocido, no forzamos una
// ciudad — mejor mostrar la de casa (perfil) que adivinar mal.
const CITY_RADIUS_KM = 12;

function resolveCity(lat, lng) {
  if (lat == null || lng == null) return null;
  let closest = null;
  let closestDist = Infinity;
  for (const city of CITIES) {
    const d = haversineKm(lat, lng, city.lat, city.lng);
    if (d < closestDist) {
      closestDist = d;
      closest = city;
    }
  }
  if (!closest || closestDist > CITY_RADIUS_KM) return null;
  return closest;
}

function getCityById(id) {
  return CITIES.find((c) => c.id === id) || null;
}

module.exports = { CITIES, DEFAULT_CITY_ID, CITY_RADIUS_KM, resolveCity, getCityById };
