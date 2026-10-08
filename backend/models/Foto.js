const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Foto = sequelize.define(
  "Foto",
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

    subidoPorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    /*
    Nos indica a qué parte
    del procedimiento pertenece
    la fotografía.

    Ejemplos:
    CONSTATACION
    VEHICULO
    VERIFICACION
    REMOCION
    */
    tipoReferencia: {
      type: DataTypes.ENUM(
        "RECLAMO",
        "CONSTATACION",
        "ACTA",
        "EMPLAZAMIENTO",
        "VERIFICACION",
        "VEHICULO",
        "REMOCION",
        "ORDEN_JUDICIAL_REMOCION",
        "INFRACCION",
        "INGRESO_PREDIO",
        "EGRESO_PREDIO",
        "OTRO"
      ),
      allowNull: false,
      defaultValue:
        "RECLAMO",
    },

    /*
    Ejemplo:

    tipoReferencia:
    "CONSTATACION"

    referenciaId:
    15

    significa:
    foto perteneciente a
    constatación ID 15.
    */
    referenciaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    /*
Clave temporal utilizada antes de que
exista el registro definitivo.

Ejemplo:

vehiculo_1_1728000000000

Permite relacionar las fotos tomadas
durante la inspección con cada vehículo
antes de crear Vehiculo, Acta y
Emplazamiento.
*/
referenciaTemporal: {
  type: DataTypes.STRING(100),
  allowNull: true,
},

    nombreArchivo: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    ruta: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    tamanoBytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    fechaAnulacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    motivoAnulacion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    anuladoPorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "fotos",
    timestamps: true,

 indexes: [
  {
    fields: ["reclamoId"],
  },
  {
    fields: [
      "tipoReferencia",
      "referenciaId",
    ],
  },
  {
    fields: ["referenciaTemporal"],
  },
  {
    fields: ["activo"],
  },
],
  }
);

module.exports = Foto;