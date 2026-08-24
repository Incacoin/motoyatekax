module.exports = {
  AVISO_LEGAL_VERSION: "2026-08-18",
  LAUNCH_DATE: "2026-08-14",
  // Un chofer "disponible" a más de esto de quien está mirando el mapa no es
  // realista que llegue por él, ya sea un pasajero viendo el mapa o un chofer
  // viendo a sus compañeros. Mismo radio que usa el matcheo de viajes nuevos.
  MAX_MATCH_DISTANCE_KM: 8,
  // Centro aproximado de Tekax, usado como referencia cuando todavía no
  // sabemos dónde está parado quien pide la lista de choferes disponibles.
  SERVICE_CENTER: { lat: 20.2098, lng: -89.462 },
  // Si un chofer no manda su ubicación en este tiempo probablemente cerró la
  // app o se quedó sin señal — no debería seguir apareciendo como disponible.
  DRIVER_STALE_SECONDS: 90,
};
