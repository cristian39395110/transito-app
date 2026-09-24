const express = require("express");

const {
  asignarJefeGuardia,
  asignarInspector,
  cambiarInspector,
  devolverGuardia,
  cambiarJefeGuardia,
  listarAsignaciones,
} = require(
  "../controllers/asignacionController"
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
| DIRECTOR -> JEFE
|--------------------------------------------------------------------------
*/

router.patch(
  "/reclamos/:id/jefe",
  permitirRoles(
    "administrador",
    "director"
  ),
  asignarJefeGuardia
);

/*
|--------------------------------------------------------------------------
| DIRECTOR -> CAMBIAR JEFE
|--------------------------------------------------------------------------
|
| Si el Director eligió un jefe equivocado,
| puede reemplazarlo mientras no haya un
| inspector trabajando en el reclamo.
|
*/

router.patch(
  "/reclamos/:id/cambiar-jefe",
  permitirRoles(
    "administrador",
    "director"
  ),
  cambiarJefeGuardia
);

/*
|--------------------------------------------------------------------------
| JEFE -> INSPECTOR
|--------------------------------------------------------------------------
*/

router.patch(
  "/reclamos/:id/inspector",
  permitirRoles(
    "administrador",
    "jefe_guardia"
  ),
  asignarInspector
);

/*
|--------------------------------------------------------------------------
| JEFE -> CAMBIAR INSPECTOR
|--------------------------------------------------------------------------
|
| Permite corregir una asignación equivocada.
| La asignación anterior NO se elimina:
| queda CANCELADA en el historial.
|
*/

router.patch(
  "/reclamos/:id/cambiar-inspector",
  permitirRoles(
    "administrador",
    "jefe_guardia"
  ),
  cambiarInspector
);

/*
|--------------------------------------------------------------------------
| JEFE -> DEJAR DISPONIBLE PARA OTRA GUARDIA
|--------------------------------------------------------------------------
|
| El jefe actual devuelve el trabajo.
| El reclamo queda nuevamente disponible
| para que otra guardia pueda tomarlo.
|
*/

router.patch(
  "/reclamos/:id/devolver-guardia",
  permitirRoles(
    "administrador",
    "jefe_guardia"
  ),
  devolverGuardia
);

/*
|--------------------------------------------------------------------------
| HISTORIAL DE ASIGNACIONES
|--------------------------------------------------------------------------
*/

router.get(
  "/reclamos/:id",
  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "secretaria_reclamos"
  ),
  listarAsignaciones
);

module.exports = router;