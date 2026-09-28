require("dotenv").config();

console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_HOST:", process.env.DB_HOST);

const bcrypt = require("bcryptjs");

const {
  sequelize,
  Usuario,
  Rol,
} = require("../models");

const crearSuperadmin = async () => {
  try {
    await sequelize.authenticate();

    console.log(
      "Conectado a la base de datos."
    );

    const rol =
      await Rol.findOne({
        where: {
          nombre: "superadmin",
          activo: true,
        },
      });

    if (!rol) {
      console.error(
        "No existe el rol superadmin."
      );

      process.exitCode = 1;
      return;
    }

    const existente =
      await Usuario.findOne({
        where: {
          rolId: rol.id,
        },
      });

    if (existente) {
      console.error(
        "Ya existe un usuario superadmin."
      );

      console.log(
        `Usuario: ${existente.usuario}`
      );

      process.exitCode = 1;
      return;
    }

    const usuario =
      process.env.SUPERADMIN_USUARIO;

    const password =
      process.env.SUPERADMIN_PASSWORD;

    const nombre =
      process.env.SUPERADMIN_NOMBRE ||
      "Super Administrador";

    if (
      !usuario ||
      !password
    ) {
      console.error(
        "Faltan SUPERADMIN_USUARIO o SUPERADMIN_PASSWORD en el .env"
      );

      process.exitCode = 1;
      return;
    }

    if (
      password.length < 10
    ) {
      console.error(
        "La contraseña del superadmin debe tener al menos 10 caracteres."
      );

      process.exitCode = 1;
      return;
    }

    const usuarioDuplicado =
      await Usuario.findOne({
        where: {
          usuario,
        },
      });

    if (usuarioDuplicado) {
      console.error(
        "Ya existe un usuario con ese nombre."
      );

      process.exitCode = 1;
      return;
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const nuevo =
      await Usuario.create({
        nombre,
        usuario,
        password:
          passwordHash,
        rolId:
          rol.id,
        activo: true,
      });

    console.log(
      "SUPERADMIN creado correctamente."
    );

    console.log(
      `ID: ${nuevo.id}`
    );

    console.log(
      `Usuario: ${nuevo.usuario}`
    );
  } catch (error) {
    console.error(
      "Error creando superadmin:",
      error
    );

    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

crearSuperadmin();