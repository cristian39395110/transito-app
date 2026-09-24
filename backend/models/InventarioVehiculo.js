const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const InventarioVehiculo =
  sequelize.define(
    "InventarioVehiculo",
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
        allowNull: false,
      },

    inspectorId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

      fechaHora: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue:
          DataTypes.NOW,
      },

      /*
      Ejemplo:

      {
        "parabrisas": "PRESENTE",
        "espejoDerecho": "FALTANTE",
        "ruedaDelantera": "DAÑADO"
      }
      */
      detalle: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName:
        "inventarios_vehiculos",

      timestamps: true,

      indexes: [
        {
          fields: [
            "vehiculoId",
          ],
        },
        {
          fields: [
            "reclamoId",
          ],
        },
      ],
    }
  );

module.exports =
  InventarioVehiculo;