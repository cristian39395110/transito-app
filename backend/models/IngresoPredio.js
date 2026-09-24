const {
  DataTypes,
} = require("sequelize");

const sequelize = require(
  "../config/database"
);

const IngresoPredio =
  sequelize.define(
    "IngresoPredio",
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

      /*
      Puede ser null para permitir
      carga histórica de vehículos
      que ya estaban en La Granja
      antes de comenzar a usar
      el sistema.
      */
      remocionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      predioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      registradoPorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

 fechaHora: {
  type: DataTypes.DATE,
  allowNull: true,
  defaultValue:
    DataTypes.NOW,
},

      sector: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      posicion: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName:
        "ingresos_predio",

      timestamps: true,

      indexes: [
        {
          fields: [
            "reclamoId",
          ],
        },
        {
          fields: [
            "vehiculoId",
          ],
        },
        {
          fields: [
            "predioId",
          ],
        },
        {
          fields: [
            "remocionId",
          ],
        },
        {
          fields: [
            "fechaHora",
          ],
        },
      ],
    }
  );

module.exports =
  IngresoPredio;