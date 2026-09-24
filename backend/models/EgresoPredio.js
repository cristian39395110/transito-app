  const { DataTypes } = require("sequelize");

  const sequelize = require(
    "../config/database"
  );

  const EgresoPredio =
    sequelize.define(
      "EgresoPredio",
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

        ingresoPredioId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
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

        tipoEgreso: {
          type: DataTypes.ENUM(
            "ENTREGADO",
            "TRASLADADO",
            "COMPACTADO",
            "OTRO"
          ),
          allowNull: false,
        },

        predioDestinoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

        /*
        Si se entrega:
        nombre de la persona.

        Si se traslada:
        nombre del nuevo depósito.

        Si se compacta:
        destino/chacarita.
        */
        destinoPersona: {
          type: DataTypes.STRING(200),
          allowNull: true,
        },

        dniPersona: {
          type: DataTypes.STRING(30),
          allowNull: true,
        },

        observaciones: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        tableName:
          "egresos_predio",

        timestamps: true,

        indexes: [
          {
            fields: ["vehiculoId"],
          },
          {
            fields: ["reclamoId"],
          },
          {
            fields: ["tipoEgreso"],
          },
        ],
      }
    );

  module.exports = EgresoPredio;