const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Infraccion = sequelize.define(
  "Infraccion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    reclamoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    inspectorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    verificacionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    numeroActa: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    fechaHora: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    lugar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    personaEncontrada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    apellidoInfractor: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    nombreInfractor: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    dniInfractor: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    domicilioInfractor: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    motivo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /*
    Qué se decidió operativamente
    después de labrar la infracción.

    Esto NO significa que la acción
    ya haya sido realizada.
    */
    accionPosterior: {
      type: DataTypes.ENUM(
        "ESPERAR_RESPONSABLE",
        "MUNICIPALIDAD",
        "OTRA_ACTUACION",
        "RETIRO_INMEDIATO",
        "BUSQUEDA_REMOCION"
      ),

      allowNull: true,
    },

    detalleAccionPosterior: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    estadoJuzgado: {
      type: DataTypes.ENUM(
        "PENDIENTE_ENVIO",
        "ENVIADO",
        "AUTORIZADO",
        "NO_AUTORIZADO",
        "OTRO"
      ),

      allowNull: false,
      defaultValue: "PENDIENTE_ENVIO",
    },

    fechaEnvioJuzgado: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    enviadoJuzgadoPorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    /*
|--------------------------------------------------------------------------
| ORDEN JUDICIAL PARA REMOCIÓN
|--------------------------------------------------------------------------
|
| Esto es independiente del trámite normal
| del Acta de Infracción / multa.
|
| Solo se utiliza cuando un vehículo no pudo
| ser retirado porque hubo oposición de personas
| presentes y se necesita orden del Juzgado.
|
*/

requiereOrdenRemocion: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
},

estadoOrdenRemocion: {
  type: DataTypes.ENUM(
    "NO_REQUIERE",
    "PENDIENTE_SOLICITUD",
    "ESPERANDO_RESPUESTA",
    "AUTORIZADA",
    "NO_AUTORIZADA"
  ),
  allowNull: false,
  defaultValue: "NO_REQUIERE",
},

fechaSolicitudOrdenRemocion: {
  type: DataTypes.DATE,
  allowNull: true,
},

ordenRemocionSolicitadaPorId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

fechaRespuestaOrdenRemocion: {
  type: DataTypes.DATE,
  allowNull: true,
},

respuestaOrdenRemocionPorId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

observacionOrdenRemocion: {
  type: DataTypes.TEXT,
  allowNull: true,
},

    fechaRespuestaJuzgado: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    respuestaJuzgadoRegistradaPorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    numeroExpedienteJuzgado: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    observacionJuzgado: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    anulada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    motivoAnulacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "infracciones",

    timestamps: true,

    indexes: [
      {
        fields: ["reclamoId"],
      },

      {
        fields: ["inspectorId"],
      },

      {
        fields: ["verificacionId"],
      },

      {
        fields: ["estadoJuzgado"],
      },
    ],
  }
);

module.exports = Infraccion;