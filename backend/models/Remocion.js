const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Remocion = sequelize.define(
  "Remocion",
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

    infraccionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    inventarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    Por ahora texto.

    Después hacemos catálogo
    de grúas.
    */
    grua: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    chofer: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    predioDestinoId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},

    destino: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "remociones",
    timestamps: true,

    indexes: [
      {
        fields: ["reclamoId"],
      },
      {
        fields: ["vehiculoId"],
      },
      {
        fields: ["fechaHora"],
      },
    ],
  }
);

module.exports = Remocion;