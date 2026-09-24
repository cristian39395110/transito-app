const {
  DataTypes,
} = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Constatacion =
  sequelize.define(
    "Constatacion",
    {
      id: {
        type:
          DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      /*
      |--------------------------------------------------------------------------
      | RECLAMO
      |--------------------------------------------------------------------------
      */

      reclamoId: {
        type:
          DataTypes.INTEGER,
        allowNull: false,
      },

      /*
      |--------------------------------------------------------------------------
      | INSPECTOR QUE REALIZÓ LA VISITA
      |--------------------------------------------------------------------------
      */

      inspectorId: {
        type:
          DataTypes.INTEGER,
        allowNull: true,
      },

      /*
      |--------------------------------------------------------------------------
      | VEHÍCULO
      |--------------------------------------------------------------------------
      |
      | Solo se utiliza si esta visita
      | corresponde a un vehículo.
      |
      | Para basura, áridos, cartelería,
      | etc. queda NULL.
      |
      */

      vehiculoId: {
        type:
          DataTypes.INTEGER,
        allowNull: true,
      },

      /*
      |--------------------------------------------------------------------------
      | RESULTADO DE LA VISITA
      |--------------------------------------------------------------------------
      |
      | CONSTATADO
      |   El problema continúa.
      |
      | NO_CONSTATADO
      |   El inspector llegó pero no
      |   encontró lo denunciado.
      |
      | RESUELTO_EN_LUGAR
      |   Cuando llegó ya estaba
      |   solucionado.
      |
      | NO_SE_PUDO_VERIFICAR
      |   No pudo realizar la inspección.
      |
      | OTRO
      |
      */

      resultado: {
        type:
          DataTypes.ENUM(
            "CONSTATADO",
            "NO_CONSTATADO",
            "RESUELTO_EN_LUGAR",
            "NO_SE_PUDO_VERIFICAR",
            "OTRO"
          ),

        allowNull: false,
      },

      /*
      |--------------------------------------------------------------------------
      | QUÉ ENCONTRÓ
      |--------------------------------------------------------------------------
      */

      situacion: {
        type:
          DataTypes.TEXT,

        allowNull: false,
      },

      /*
      |--------------------------------------------------------------------------
      | FECHA REAL DE LA VISITA
      |--------------------------------------------------------------------------
      */

      fechaHora: {
        type:
          DataTypes.DATE,

        allowNull: false,

        defaultValue:
          DataTypes.NOW,
      },

      /*
      |--------------------------------------------------------------------------
      | GPS REAL DEL INSPECTOR
      |--------------------------------------------------------------------------
      |
      | Esta ubicación NO reemplaza
      | la dirección/GPS del reclamo.
      |
      | Sirve como evidencia de dónde
      | estaba el inspector al hacer
      | la visita.
      |
      */

      latitudActual: {
        type:
          DataTypes.DECIMAL(
            10,
            7
          ),

        allowNull: true,
      },

      longitudActual: {
        type:
          DataTypes.DECIMAL(
            10,
            7
          ),

        allowNull: true,
      },

      /*
      |--------------------------------------------------------------------------
      | PRECISIÓN DEL GPS
      |--------------------------------------------------------------------------
      |
      | Ejemplo:
      | 8 = aproximadamente 8 metros.
      |
      */

      precisionGps: {
        type:
          DataTypes.INTEGER,

        allowNull: true,
      },

      /*
      |--------------------------------------------------------------------------
      | OBSERVACIONES
      |--------------------------------------------------------------------------
      */

      observaciones: {
        type:
          DataTypes.TEXT,

        allowNull: true,
      },
    },
    {
      tableName:
        "constataciones",

      timestamps: true,

      indexes: [
        {
          fields: [
            "reclamoId",
          ],
        },

        {
          fields: [
            "inspectorId",
          ],
        },

        {
          fields: [
            "vehiculoId",
          ],
        },

        {
          fields: [
            "resultado",
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
  Constatacion;