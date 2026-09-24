const sequelize = require(
  "../config/database"
);

const Rol = require("./Rol");
const Usuario = require("./Usuario");
const TipoReclamo = require("./TipoReclamo");
const Reclamo = require("./Reclamo");
const Asignacion = require("./Asignacion");
const Historial = require("./Historial");
const Vehiculo = require("./Vehiculo");
const Constatacion = require("./Constatacion");
const Acta = require("./Acta");
const Emplazamiento = require("./Emplazamiento");
const Verificacion = require("./Verificacion");
const Infraccion = require("./Infraccion");

const InventarioVehiculo = require(
  "./InventarioVehiculo"
);

const Remocion = require("./Remocion");

const Predio = require("./Predio");

const IngresoPredio = require(
  "./IngresoPredio"
);

const EgresoPredio = require(
  "./EgresoPredio"
);

const Foto = require("./Foto");

/*
|--------------------------------------------------------------------------
| ROL / USUARIO
|--------------------------------------------------------------------------
*/

Rol.hasMany(Usuario, {
  foreignKey: "rolId",
  as: "usuarios",
});

Usuario.belongsTo(Rol, {
  foreignKey: "rolId",
  as: "rol",
});

/*
|--------------------------------------------------------------------------
| TIPO RECLAMO
|--------------------------------------------------------------------------
*/

TipoReclamo.hasMany(Reclamo, {
  foreignKey: "tipoReclamoId",
  as: "reclamos",
});

Reclamo.belongsTo(TipoReclamo, {
  foreignKey: "tipoReclamoId",
  as: "tipoReclamo",
});

/*
|--------------------------------------------------------------------------
| RESPONSABLES DEL RECLAMO
|--------------------------------------------------------------------------
*/

Usuario.hasMany(Reclamo, {
  foreignKey: "jefeGuardiaId",
  as: "reclamosComoJefe",
});

Reclamo.belongsTo(Usuario, {
  foreignKey: "jefeGuardiaId",
  as: "jefeGuardia",
});

Usuario.hasMany(Reclamo, {
  foreignKey: "inspectorId",
  as: "reclamosComoInspector",
});

Reclamo.belongsTo(Usuario, {
  foreignKey: "inspectorId",
  as: "inspector",
});

Usuario.hasMany(Reclamo, {
  foreignKey: "creadoPorId",
  as: "reclamosCreados",
});

Reclamo.belongsTo(Usuario, {
  foreignKey: "creadoPorId",
  as: "creadoPor",
});

Usuario.hasMany(Reclamo, {
  foreignKey: "cerradoExternoPorId",
  as: "reclamosCerradosExternamente",
});

Reclamo.belongsTo(Usuario, {
  foreignKey: "cerradoExternoPorId",
  as: "cerradoExternoPor",
});

/*
|--------------------------------------------------------------------------
| ASIGNACIONES
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Asignacion, {
  foreignKey: "reclamoId",
  as: "asignaciones",
});

Asignacion.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Usuario.hasMany(Asignacion, {
  foreignKey: "asignadoAId",
  as: "asignacionesRecibidas",
});

Asignacion.belongsTo(Usuario, {
  foreignKey: "asignadoAId",
  as: "asignadoA",
});

Usuario.hasMany(Asignacion, {
  foreignKey: "asignadoPorId",
  as: "asignacionesRealizadas",
});

Asignacion.belongsTo(Usuario, {
  foreignKey: "asignadoPorId",
  as: "asignadoPor",
});

/*
|--------------------------------------------------------------------------
| HISTORIAL
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Historial, {
  foreignKey: "reclamoId",
  as: "historial",
});

Historial.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Usuario.hasMany(Historial, {
  foreignKey: "usuarioId",
  as: "accionesHistorial",
});

Historial.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  as: "usuario",
});

/*
|--------------------------------------------------------------------------
| VEHÍCULO
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Vehiculo, {
  foreignKey: "reclamoId",
  as: "vehiculos",
});

Vehiculo.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

/*
|--------------------------------------------------------------------------
| CONSTATACIÓN
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Constatacion, {
  foreignKey: "reclamoId",
  as: "constataciones",
});

Constatacion.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Usuario.hasMany(Constatacion, {
  foreignKey: "inspectorId",
  as: "constatacionesRealizadas",
});

Constatacion.belongsTo(Usuario, {
  foreignKey: "inspectorId",
  as: "inspector",
});

Vehiculo.hasMany(Constatacion, {
  foreignKey: "vehiculoId",
  as: "constataciones",
});

Constatacion.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

/*
|--------------------------------------------------------------------------
| ACTAS
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Acta, {
  foreignKey: "reclamoId",
  as: "actas",
});

Acta.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Vehiculo.hasMany(Acta, {
  foreignKey: "vehiculoId",
  as: "actas",
});

Acta.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

Constatacion.hasMany(Acta, {
  foreignKey: "constatacionId",
  as: "actas",
});

Acta.belongsTo(Constatacion, {
  foreignKey: "constatacionId",
  as: "constatacion",
});

Usuario.hasMany(Acta, {
  foreignKey: "inspectorId",
  as: "actasRealizadas",
});

Acta.belongsTo(Usuario, {
  foreignKey: "inspectorId",
  as: "inspector",
});

/*
|--------------------------------------------------------------------------
| EMPLAZAMIENTOS
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Emplazamiento, {
  foreignKey: "reclamoId",
  as: "emplazamientos",
});

Emplazamiento.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Acta.hasMany(Emplazamiento, {
  foreignKey: "actaId",
  as: "emplazamientos",
});

Emplazamiento.belongsTo(Acta, {
  foreignKey: "actaId",
  as: "acta",
});

Vehiculo.hasMany(Emplazamiento, {
  foreignKey: "vehiculoId",
  as: "emplazamientos",
});

Emplazamiento.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

Usuario.hasMany(Emplazamiento, {
  foreignKey: "inspectorId",
  as: "emplazamientosRealizados",
});

Emplazamiento.belongsTo(Usuario, {
  foreignKey: "inspectorId",
  as: "inspector",
});

/*
|--------------------------------------------------------------------------
| VERIFICACIONES
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Verificacion, {
  foreignKey: "reclamoId",
  as: "verificaciones",
});

Verificacion.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Emplazamiento.hasMany(Verificacion, {
  foreignKey: "emplazamientoId",
  as: "verificaciones",
});

Verificacion.belongsTo(Emplazamiento, {
  foreignKey: "emplazamientoId",
  as: "emplazamiento",
});

Usuario.hasMany(Verificacion, {
  foreignKey: "inspectorId",
  as: "verificacionesRealizadas",
});

Verificacion.belongsTo(Usuario, {
  foreignKey: "inspectorId",
  as: "inspector",
});

Vehiculo.hasMany(Verificacion, {
  foreignKey: "vehiculoId",
  as: "verificaciones",
});

Verificacion.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

/*
|--------------------------------------------------------------------------
| INFRACCIONES
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Infraccion, {
  foreignKey: "reclamoId",
  as: "infracciones",
});

Infraccion.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Vehiculo.hasMany(Infraccion, {
  foreignKey: "vehiculoId",
  as: "infracciones",
});

Infraccion.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

Usuario.hasMany(Infraccion, {
  foreignKey: "inspectorId",
  as: "infraccionesRealizadas",
});

Infraccion.belongsTo(Usuario, {
  foreignKey: "inspectorId",
  as: "inspector",
});

Verificacion.hasMany(Infraccion, {
  foreignKey: "verificacionId",
  as: "infracciones",
});

Infraccion.belongsTo(Verificacion, {
  foreignKey: "verificacionId",
  as: "verificacion",
});

/*
|--------------------------------------------------------------------------
| INVENTARIOS
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(
  InventarioVehiculo,
  {
    foreignKey: "reclamoId",
    as: "inventariosVehiculos",
  }
);

InventarioVehiculo.belongsTo(
  Reclamo,
  {
    foreignKey: "reclamoId",
    as: "reclamo",
  }
);

Vehiculo.hasMany(
  InventarioVehiculo,
  {
    foreignKey: "vehiculoId",
    as: "inventarios",
  }
);

InventarioVehiculo.belongsTo(
  Vehiculo,
  {
    foreignKey: "vehiculoId",
    as: "vehiculo",
  }
);

Usuario.hasMany(
  InventarioVehiculo,
  {
    foreignKey: "inspectorId",
    as: "inventariosRealizados",
  }
);

InventarioVehiculo.belongsTo(
  Usuario,
  {
    foreignKey: "inspectorId",
    as: "inspector",
  }
);

/*
|--------------------------------------------------------------------------
| REMOCIONES
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Remocion, {
  foreignKey: "reclamoId",
  as: "remociones",
});

Remocion.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Vehiculo.hasMany(Remocion, {
  foreignKey: "vehiculoId",
  as: "remociones",
});

Remocion.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

Usuario.hasMany(Remocion, {
  foreignKey: "inspectorId",
  as: "remocionesRealizadas",
});

Remocion.belongsTo(Usuario, {
  foreignKey: "inspectorId",
  as: "inspector",
});

Infraccion.hasMany(Remocion, {
  foreignKey: "infraccionId",
  as: "remociones",
});

Remocion.belongsTo(Infraccion, {
  foreignKey: "infraccionId",
  as: "infraccion",
});

InventarioVehiculo.hasMany(
  Remocion,
  {
    foreignKey: "inventarioId",
    as: "remociones",
  }
);

Remocion.belongsTo(
  InventarioVehiculo,
  {
    foreignKey: "inventarioId",
    as: "inventario",
  }
);


/*
|--------------------------------------------------------------------------
| PREDIOS
|--------------------------------------------------------------------------
*/

Predio.hasMany(Remocion, {
  foreignKey: "predioDestinoId",
  as: "remocionesDestino",
});

Remocion.belongsTo(Predio, {
  foreignKey: "predioDestinoId",
  as: "predioDestino",
});

Predio.hasMany(EgresoPredio, {
  foreignKey: "predioDestinoId",
  as: "egresosDestino",
});

EgresoPredio.belongsTo(Predio, {
  foreignKey: "predioDestinoId",
  as: "predioDestino",
});

Predio.hasMany(IngresoPredio, {
  foreignKey: "predioId",
  as: "ingresos",
});

IngresoPredio.belongsTo(Predio, {
  foreignKey: "predioId",
  as: "predio",
});

/*
|--------------------------------------------------------------------------
| INGRESOS AL PREDIO
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(IngresoPredio, {
  foreignKey: "reclamoId",
  as: "ingresosPredio",
});

IngresoPredio.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Vehiculo.hasMany(IngresoPredio, {
  foreignKey: "vehiculoId",
  as: "ingresosPredio",
});

IngresoPredio.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

Remocion.hasOne(IngresoPredio, {
  foreignKey: "remocionId",
  as: "ingresoPredio",
});

IngresoPredio.belongsTo(Remocion, {
  foreignKey: "remocionId",
  as: "remocion",
});

Usuario.hasMany(IngresoPredio, {
  foreignKey: "registradoPorId",
  as: "ingresosPredioRegistrados",
});

IngresoPredio.belongsTo(Usuario, {
  foreignKey: "registradoPorId",
  as: "registradoPor",
});

/*
|--------------------------------------------------------------------------
| EGRESOS DEL PREDIO
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(EgresoPredio, {
  foreignKey: "reclamoId",
  as: "egresosPredio",
});

EgresoPredio.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Vehiculo.hasMany(EgresoPredio, {
  foreignKey: "vehiculoId",
  as: "egresosPredio",
});

EgresoPredio.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  as: "vehiculo",
});

IngresoPredio.hasOne(EgresoPredio, {
  foreignKey: "ingresoPredioId",
  as: "egreso",
});

EgresoPredio.belongsTo(IngresoPredio, {
  foreignKey: "ingresoPredioId",
  as: "ingresoPredio",
});

Usuario.hasMany(EgresoPredio, {
  foreignKey: "registradoPorId",
  as: "egresosPredioRegistrados",
});

EgresoPredio.belongsTo(Usuario, {
  foreignKey: "registradoPorId",
  as: "registradoPor",
});

/*
|--------------------------------------------------------------------------
| FOTOS
|--------------------------------------------------------------------------
*/

Reclamo.hasMany(Foto, {
  foreignKey: "reclamoId",
  as: "fotos",
});

Foto.belongsTo(Reclamo, {
  foreignKey: "reclamoId",
  as: "reclamo",
});

Usuario.hasMany(Foto, {
  foreignKey: "subidoPorId",
  as: "fotosSubidas",
});

Foto.belongsTo(Usuario, {
  foreignKey: "subidoPorId",
  as: "subidoPor",
});

Usuario.hasMany(Foto, {
  foreignKey: "anuladoPorId",
  as: "fotosAnuladas",
});

Foto.belongsTo(Usuario, {
  foreignKey: "anuladoPorId",
  as: "anuladoPor",
});

/*
|--------------------------------------------------------------------------
| EXPORTACIONES
|--------------------------------------------------------------------------
*/



module.exports = {
  sequelize,
  Rol,
  Usuario,
  TipoReclamo,
  Foto,
  Reclamo,
  Asignacion,
  Historial,
  Vehiculo,
  Constatacion,
  Acta,
  Emplazamiento,
  Verificacion,
  Infraccion,
  InventarioVehiculo,
  Remocion,
  Predio,
  IngresoPredio,
  EgresoPredio,
};