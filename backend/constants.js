module.exports = {
  AVISO_LEGAL_VERSION: "2026-09-01",
  LAUNCH_DATE: "2026-08-14",
  // Cuota mensual por chofer, igual que en Ticul.
  MONTHLY_FEE: 100,
  // Cuota de la app por viaje, la misma en todos los pueblos: es el cobro de
  // la plataforma, no la tarifa del gremio (esa sí cambia de pueblo a pueblo).
  SERVICE_FEE: 2,
  // Desde cuándo aplica esa cuota en Tekax. Los viajes anteriores a esta
  // fecha se marcan como ya liquidados: no se le puede cobrar a un chofer
  // por viajes que hizo cuando la cuota todavía no existía aquí.
  SERVICE_FEE_START_DATE: "2026-08-27",
  // null = prueba gratis indefinida, sin fecha de corte automática.
  TRIAL_END_DATE: null,
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
