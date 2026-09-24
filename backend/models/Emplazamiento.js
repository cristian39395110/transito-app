const {
  DataTypes,
} = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Emplazamiento =
  sequelize.define(
    "Emplazamiento",
    {
      id: {
        type:
          DataTypes.INTEGER,

        primaryKey: true,
        autoIncrement: true,
      },

      reclamoId: {
        type:
          DataTypes.INTEGER,

        allowNull: true,
      },

      actaId: {
        type:
          DataTypes.INTEGER,

        allowNull: true,
      },

      /*
      Opcional.

      Para basura, áridos,
      escombros, cartelería,
      etc., queda NULL.
      */
      vehiculoId: {
        type:
          DataTypes.INTEGER,

        allowNull: true,
      },

      inspectorId: {
        type:
          DataTypes.INTEGER,

        allowNull: true,
      },

      fechaHora: {
        type:
          DataTypes.DATE,

        allowNull: true,

        defaultValue:
          DataTypes.NOW,
      },

      /*
      Guardamos lo que escribió
      realmente el inspector.

      Ej:
      24 HORAS
      3 DIAS
      */
    plazoCantidad: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

plazoUnidad: {
  type: DataTypes.ENUM(
    "HORAS",
    "DIAS"
  ),
  allowNull: true,
},

plazoHoras: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

fechaVencimiento: {
  type: DataTypes.DATE,
  allowNull: true,
},

/*
|--------------------------------------------------------------------------
| PRÓRROGAS
|--------------------------------------------------------------------------
|
| Cuando este emplazamiento nace de un control
| posterior, queda relacionado con el
| emplazamiento anterior.
|
*/

esProrroga: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
},

emplazamientoAnteriorId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},
      estado: {
        type:
          DataTypes.ENUM(
            "VIGENTE",
            "VENCIDO",
            "CUMPLIDO",
            "CANCELADO"
          ),

        allowNull: false,

        defaultValue:
          "VIGENTE",
      },

      fechaCumplimiento: {
        type:
          DataTypes.DATE,

        allowNull: true,
      },

      observaciones: {
        type:
          DataTypes.TEXT,

        allowNull: true,
      },
    },
    {
      tableName:
        "emplazamientos",

      timestamps: true,

      indexes: [
        {
          fields: [
            "reclamoId",
          ],
        },

        {
          fields: [
            "actaId",
          ],
        },

        {
          fields: [
            "fechaVencimiento",
          ],
        },

        {
          fields: [
            "estado",
          ],
        },
      ],
    }
  );

module.exports =
  Emplazamiento;