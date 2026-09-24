const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Usuario = require("../models/Usuario");
const Rol = require("../models/Rol");

const login = async (req, res) => {
  try {
    const {
      usuario,
      password,
    } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Usuario y contraseña son obligatorios",
      });
    }

    const usuarioEncontrado =
      await Usuario.findOne({
        where: {
          usuario,
        },
        include: [
  {
    model: Rol,
    as: "rol",
    attributes: [
      "id",
      "nombre",
      "descripcion",
    ],
  },
],
      });

    if (!usuarioEncontrado) {
      return res.status(401).json({
        ok: false,
        mensaje:
          "Usuario o contraseña incorrectos",
      });
    }

    if (!usuarioEncontrado.activo) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "El usuario se encuentra desactivado",
      });
    }

    const passwordCorrecto =
      await bcrypt.compare(
        password,
        usuarioEncontrado.password
      );

    if (!passwordCorrecto) {
      return res.status(401).json({
        ok: false,
        mensaje:
          "Usuario o contraseña incorrectos",
      });
    }

    const token = jwt.sign(
      {
        id: usuarioEncontrado.id,
        rolId: usuarioEncontrado.rolId,
        rol: usuarioEncontrado.rol.nombre,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "12h",
      }
    );

    await usuarioEncontrado.update({
      ultimoAcceso: new Date(),
    });

    return res.json({
      ok: true,

      token,

      usuario: {
        id: usuarioEncontrado.id,
        nombre:
          usuarioEncontrado.nombre,
        usuario:
          usuarioEncontrado.usuario,
        rol:
          usuarioEncontrado.rol.nombre,
      },
    });
  } catch (error) {
    console.error(
      "Error en login:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error interno al iniciar sesión",
    });
  }
};

module.exports = {
  login,
};