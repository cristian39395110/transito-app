const express =
  require("express");

const {
  crearReclamo,
  listarReclamos,
  listarParaCerrar,
  listarMiGuardia,
  listarMisTrabajos,
  obtenerReclamo,
  cerrarReclamoExterno,
  actualizarReclamo,
  resolverProblemaFisico,
} = require(
  "../controllers/reclamoController"
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
| MI GUARDIA
|--------------------------------------------------------------------------
*/

router.get(
  "/mi-guardia",

  permitirRoles(
    "administrador",
    "jefe_guardia"
  ),

  listarMiGuardia
);


/*
|--------------------------------------------------------------------------
| MIS TRABAJOS
|--------------------------------------------------------------------------
*/

router.get(
  "/mis-trabajos",

  permitirRoles(
    "administrador",
    "inspector"
  ),

  listarMisTrabajos
);


/*
|--------------------------------------------------------------------------
| PARA CERRAR
|--------------------------------------------------------------------------
|
| Reclamos que ya se resolvieron
| operativamente pero Secretaría
| todavía debe dar de baja
| en el sistema externo.
|
*/

router.get(
  "/para-cerrar",

  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),

  listarParaCerrar
);


/*
|--------------------------------------------------------------------------
| RECLAMOS OPERATIVOS
|--------------------------------------------------------------------------
|
| Inspector NO usa esta página.
|
*/

router.get(
  "/",

  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "secretaria_reclamos"
  ),

  listarReclamos
);


/*
|--------------------------------------------------------------------------
| SECRETARÍA - ALTA RÁPIDA
|--------------------------------------------------------------------------
*/

router.post(
  "/",

  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),

  crearReclamo
);


router.patch(
  "/:id/resolver-problema",
  permitirRoles(
    "administrador",
    "director"
  ),
  resolverProblemaFisico
);

/*
|--------------------------------------------------------------------------
| CIERRE EN SISTEMA EXTERNO
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/cierre-externo",

  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),

  cerrarReclamoExterno
);


/*
|--------------------------------------------------------------------------
| OBTENER UNO
|--------------------------------------------------------------------------
|
| Siempre al final porque
| /:id es una ruta dinámica.
|
*/

router.get(
  "/:id",

  permitirRoles(
    "administrador",
    "director",
    "jefe_guardia",
    "inspector",
    "secretaria_reclamos",
    "secretaria_predio"
  ),

  obtenerReclamo
);

/*
|--------------------------------------------------------------------------
| EDITAR RECLAMO
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",

  permitirRoles(
    "administrador",
    "secretaria_reclamos"
  ),

  actualizarReclamo
);
module.exports =
  router;