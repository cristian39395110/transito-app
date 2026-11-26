const express =
  require("express");

const {
  registrarSegundaVisita,
  obtenerSegundaVisita,
  editarSegundaVisita,
  cambiarAccionVehiculo,
} = require(
  "../controllers/verificacionController"
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
| CAMBIAR QUÉ PASA CON EL VEHÍCULO
|--------------------------------------------------------------------------
|
| Retiro inmediato -> grúa, grúa <-> orden del juez,
| mientras el vehículo siga en la calle.
|
*/

router.patch(
  "/infraccion/:infraccionId/accion-vehiculo",
  permitirRoles(
    "administrador",
    "inspector"
  ),
  cambiarAccionVehiculo
);


/*
|--------------------------------------------------------------------------
| REGISTRAR NUEVO CONTROL
|--------------------------------------------------------------------------
*/

router.post(
  "/segunda-visita/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector",
    "grua"
  ),
  registrarSegundaVisita
);


/*
|--------------------------------------------------------------------------
| VER CONTROL REGISTRADO
|--------------------------------------------------------------------------
*/

router.get(
  "/segunda-visita/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector",
    "grua"
  ),
  obtenerSegundaVisita
);


/*
|--------------------------------------------------------------------------
| CORREGIR CONTROL REGISTRADO
|--------------------------------------------------------------------------
*/

router.put(
  "/segunda-visita/:reclamoId",
  permitirRoles(
    "administrador",
    "inspector",
    "grua"
  ),
  editarSegundaVisita
);


module.exports =
  router;