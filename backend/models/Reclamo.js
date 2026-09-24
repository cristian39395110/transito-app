const {
  DataTypes,
} = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Reclamo =
  sequelize.define(
    "Reclamo",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      numeroReclamo: {
        type: DataTypes.STRING(
          50
        ),
        allowNull: false,
        unique: true,
      },

      direccion: {
        type: DataTypes.STRING(
          255
        ),
        allowNull: false,
      },

      barrio: {
        type: DataTypes.STRING(
          150
        ),
        allowNull: true,
      },

      referencia: {
        type: DataTypes.STRING(
          255
        ),
        allowNull: true,
      },

      latitudDenunciada: {
        type: DataTypes.DECIMAL(
          10,
          7
        ),
        allowNull: true,
      },

      longitudDenunciada: {
        type: DataTypes.DECIMAL(
          10,
          7
        ),
        allowNull: true,
      },

      tipoReclamoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      /*
      |--------------------------------------------------------------------------
      | ESTADO GENERAL
      |--------------------------------------------------------------------------
      |
      | Este estado responde:
      |
      | ¿En qué situación general está
      | el reclamo?
      |
      | NO guardamos acá estados propios
      | de vehículos.
      |
      */

      estado: {
        type: DataTypes.ENUM(
          "NUEVO",
          "ASIGNADO_GUARDIA",
          "ASIGNADO_INSPECTOR",
          "EN_INSPECCION",
          "EN_SEGUIMIENTO",
          "PENDIENTE_ACTUACION",
          "RESUELTO",
          "ANULADO"
        ),

        allowNull: false,

        defaultValue:
          "NUEVO",
      },

      /*
      |--------------------------------------------------------------------------
      | ETAPA OPERATIVA ACTUAL
      |--------------------------------------------------------------------------
      |
      | Esto responde:
      |
      | ¿Qué está esperando el expediente?
      |
      */

etapaActual: {
  type: DataTypes.ENUM(
    "PENDIENTE_ASIGNACION_GUARDIA",

    "PENDIENTE_PRIMERA_VISITA",
    "PRIMERA_VISITA",

    "ESPERANDO_PLAZO",

    "PENDIENTE_SEGUNDA_VISITA",
    "SEGUNDA_VISITA",

    "PENDIENTE_DECISION_JEFE",

    "PENDIENTE_ENVIO_JUZGADO",

    // Problema sigue físicamente en el lugar,
    // aunque la infracción pueda estar o no
    // enviada al Juzgado.
   "ESPERANDO_RESOLUCION",

    "EN_JUZGADO",

    "PENDIENTE_ASIGNACION_POST_JUZGADO",
    "POST_JUZGADO_ASIGNADO_GUARDIA",
    "POST_JUZGADO_EN_ACTUACION",

    "PENDIENTE_BUSQUEDA_REMOCION",
    "PENDIENTE_REMOCION",
    "REMOCION_EN_CURSO",
    "PENDIENTE_INGRESO_PREDIO",
    "EN_PREDIO",
    "EGRESADO",

    "FINALIZADO",
    "ANULADO"
  ),

  allowNull: false,

  defaultValue:
    "PENDIENTE_ASIGNACION_GUARDIA",
},

      estadoExterno: {
        type: DataTypes.ENUM(
          "PENDIENTE",
          "LISTO_PARA_CERRAR",
          "CERRADO"
        ),

        allowNull: false,

        defaultValue:
          "PENDIENTE",
      },

      /*
      |--------------------------------------------------------------------------
      | RESPONSABLES ACTUALES
      |--------------------------------------------------------------------------
      |
      | inspectorId representa solamente
      | quién tiene una tarea AHORA.
      |
      | Cuando termina su tarea:
      |
      | inspectorId = null
      |
      | Su participación NO se pierde porque
      | queda registrada en Asignacion.
      |
      */

      jefeGuardiaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      inspectorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      creadoPorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      resueltoPor: {
  type: DataTypes.ENUM(
    "RESPONSABLE",
    "MUNICIPALIDAD"
  ),
  allowNull: true,
},

detalleResolucion: {
  type: DataTypes.TEXT,
  allowNull: true,
},

costoMunicipalEstado: {
  type: DataTypes.ENUM(
    "NO_INFORMADO",
    "SIN_COSTO",
    "INFORMADO"
  ),
  allowNull: true,
},

costoMunicipal: {
  type: DataTypes.DECIMAL(
    12,
    2
  ),
  allowNull: true,
},

novedadJuzgadoPendiente: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
},

novedadJuzgadoInformadaAt: {
  type: DataTypes.DATE,
  allowNull: true,
},

novedadJuzgadoInformadaPorId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

fechaResolucion: {
  type: DataTypes.DATE,
  allowNull: true,
},

    

      fechaCierreExterno: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      cerradoExternoPorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName:
        "reclamos",

      timestamps: true,

      indexes: [
        {
          fields: [
            "numeroReclamo",
          ],
        },
        {
          fields: [
            "estado",
          ],
        },
        {
          fields: [
            "etapaActual",
          ],
        },
        {
          fields: [
            "estadoExterno",
          ],
        },
        {
          fields: [
            "jefeGuardiaId",
          ],
        },
        {
          fields: [
            "inspectorId",
          ],
        },
      ],
    }
  );

module.exports =
  Reclamo;