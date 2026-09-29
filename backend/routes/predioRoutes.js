const express = require("express");
const {
  listarPredios,
  crearPredio,
  actualizarPredio,
  registrarIngreso,
  registrarEgreso,
  listarVehiculosEnPredio,
  listarPendientesIngreso,
  listarHistorialPredio,
  listarPrediosDestino,
  listarTrasladosPendientes,
  recibirTraslado,
} = require(
  "../controllers/predioController"
);

const {
  verificarToken,
  permitirRoles,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

router.use(
  verificarToken
);

/*
|--------------------------------------------------------------------------
| CATÁLOGO DE PREDIOS
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos",
    "secretaria_predio"
  ),
  listarPredios
);

router.post(
  "/",
  permitirRoles(
    "administrador"
  ),
  crearPredio
);

/*
|--------------------------------------------------------------------------
| VEHÍCULOS PENDIENTES DE INGRESO
|--------------------------------------------------------------------------
*/

router.get(
  "/vehiculos/pendientes-ingreso",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "secretaria_reclamos",
    "secretaria_predio"
  ),
  listarPendientesIngreso
);

/*
|--------------------------------------------------------------------------
| VEHÍCULOS ACTUALMENTE EN PREDIO
|--------------------------------------------------------------------------
*/

router.get(
  "/vehiculos/en-predio",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "secretaria_reclamos",
    "secretaria_predio"
  ),
  listarVehiculosEnPredio
);

/*
|--------------------------------------------------------------------------
| HISTORIAL DE VEHÍCULOS DEL PREDIO
|--------------------------------------------------------------------------
*/

router.get(
  "/vehiculos/historial",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "secretaria_reclamos",
    "secretaria_predio"
  ),
  listarHistorialPredio
);
/*
|--------------------------------------------------------------------------
| RUTA ANTERIOR
| Se deja por compatibilidad con otras pantallas que todavía puedan usarla
|--------------------------------------------------------------------------
*/

router.get(
  "/vehiculos",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "secretaria_reclamos",
    "secretaria_predio"
  ),
  listarVehiculosEnPredio
);

/*
|--------------------------------------------------------------------------
| INGRESO AL PREDIO
|--------------------------------------------------------------------------
*/

router.post(
  "/ingresos",
  permitirRoles(
    "administrador",
    "secretaria_predio"
  ),
  registrarIngreso
);

/*
|--------------------------------------------------------------------------
| EGRESO DEL PREDIO
|--------------------------------------------------------------------------
*/

router.post(
  "/egresos",
  permitirRoles(
    "administrador",
    "secretaria_predio"
  ),
  registrarEgreso
);
/*
|--------------------------------------------------------------------------
| PREDIOS DISPONIBLES COMO DESTINO DE TRASLADO
|--------------------------------------------------------------------------
*/

router.get(
  "/destinos",
  permitirRoles(
    "administrador",
    "secretaria_predio"
  ),
  listarPrediosDestino
);


/*
|--------------------------------------------------------------------------
| TRASLADOS PENDIENTES DE RECEPCIÓN
|--------------------------------------------------------------------------
*/

router.get(   
  "/traslados/pendientes",
  permitirRoles(
    "administrador",
    "secretaria_predio"
  ),
  listarTrasladosPendientes
);


/*
|--------------------------------------------------------------------------
| RECIBIR TRASLADO EN PREDIO DESTINO
|--------------------------------------------------------------------------
*/

router.post(
  "/traslados/:egresoId/recibir",
  permitirRoles(
    "administrador",
    "secretaria_predio"
  ),
  recibirTraslado
);


/*
|--------------------------------------------------------------------------
| EDITAR PREDIO
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  permitirRoles(
    "administrador"
  ),
  actualizarPredio
);


module.exports = router;