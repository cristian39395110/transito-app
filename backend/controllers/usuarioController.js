const bcrypt = require("bcryptjs");

const {
  Op,
} = require("sequelize");

const {
  enviarConfirmacionCorreo,
} = require("../services/emailService");

const {
  Usuario,
  Rol,
} = require("../models");

/*
|--------------------------------------------------------------------------
| UTILIDADES SUPERADMIN
|--------------------------------------------------------------------------
*/

const obtenerNombreRolUsuario = (
  req
) => {
  return String(
    req.usuario?.rol || ""
  )
    .trim()
    .toLowerCase();
};

const esSuperadminRequest = (
  req
) => {
  return (
    obtenerNombreRolUsuario(req) ===
    "superadmin"
  );
};

const esRolSuperadmin = (
  rol
) => {
  return (
    String(
      rol?.nombre || ""
    )
      .trim()
      .toLowerCase() ===
    "superadmin"
  );
};

/*
|--------------------------------------------------------------------------
| LISTAR USUARIOS
|--------------------------------------------------------------------------
*/

const listarUsuarios = async (
  req,
  res
) => {
  try {
    const esSuperadmin =
      esSuperadminRequest(req);

    const usuarios =
      await Usuario.findAll({
        attributes: {
          exclude: ["password"],
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

            ...(
              !esSuperadmin
                ? {
                    where: {
                      nombre: {
                        [Op.ne]:
                          "superadmin",
                      },
                    },
                  }
                : {}
            ),
          },
        ],

        order: [
          ["nombre", "ASC"],
        ],
      });

    return res.json({
      ok: true,
      usuarios,
    });
  } catch (error) {
    console.error(
      "Error listando usuarios:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener los usuarios",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREAR USUARIO
|--------------------------------------------------------------------------
*/

const crearUsuario = async (
  req,
  res
) => {
  try {
   const {
  nombre,
  usuario,
  password,
  rolId,
  predioId,
} = req.body;

    if (
      !nombre ||
      !usuario ||
      !password ||
      !rolId
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Nombre, usuario, contraseña y rol son obligatorios",
      });
    }

    const rol =
      await Rol.findByPk(
        rolId
      );

    if (
      !rol ||
      !rol.activo
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El rol seleccionado no es válido",
      });
    }
    const nombreRol = String(
  rol.nombre || ""
)
  .trim()
  .toLowerCase();

if (
  nombreRol === "secretaria_predio" &&
  !predioId
) {
  return res.status(400).json({
    ok: false,
    mensaje:
      "Debe seleccionar un predio para la secretaria de predio",
  });
}

    /*
    |--------------------------------------------------------------------------
    | PROTECCIÓN SUPERADMIN
    |--------------------------------------------------------------------------
    |
    | Nadie puede crear otro superadmin desde esta API.
    | Ni siquiera otro superadmin.
    |
    | El superadmin principal se crea manualmente/controladamente.
    |
    */

    if (
      esRolSuperadmin(rol)
    ) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "El rol superadmin no puede asignarse desde la administración de usuarios",
      });
    }

    const existente =
      await Usuario.findOne({
        where: {
          usuario,
        },
      });

    if (existente) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Ese nombre de usuario ya existe",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

   const nuevoUsuario =
  await Usuario.create({
    nombre,
    usuario,
    password:
      passwordHash,
    rolId,

    predioId:
      nombreRol === "secretaria_predio"
        ? Number(predioId)
        : null,

    activo: true,
  });

    return res.status(201).json({
      ok: true,
      mensaje:
        "Usuario creado correctamente",

     usuario: {
  id:
    nuevoUsuario.id,

  nombre:
    nuevoUsuario.nombre,

  usuario:
    nuevoUsuario.usuario,

  rolId:
    nuevoUsuario.rolId,

  predioId:
    nuevoUsuario.predioId,

  activo:
    nuevoUsuario.activo,
},
    });
  } catch (error) {
    console.error(
      "Error creando usuario:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al crear el usuario",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ACTUALIZAR USUARIO
|--------------------------------------------------------------------------
*/

const actualizarUsuario = async (
  req,
  res
) => {
  try {
    const {
      id,
    } = req.params;

const {
  nombre,
  usuario,
  password,
  rolId,
  predioId,
  activo,
} = req.body;

    /*
    |--------------------------------------------------------------------------
    | BUSCAMOS USUARIO + ROL ACTUAL
    |--------------------------------------------------------------------------
    */

    const usuarioEncontrado =
      await Usuario.findByPk(
        id,
        {
          include: [
            {
              model: Rol,
              as: "rol",

              attributes: [
                "id",
                "nombre",
              ],
            },
          ],
        }
      );

    if (
      !usuarioEncontrado
    ) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Usuario no encontrado",
      });
    }

    const usuarioObjetivoEsSuperadmin =
      esRolSuperadmin(
        usuarioEncontrado.rol
      );

    const solicitanteEsSuperadmin =
      esSuperadminRequest(req);

    /*
    |--------------------------------------------------------------------------
    | PROTEGER CUENTA SUPERADMIN
    |--------------------------------------------------------------------------
    |
    | Un administrador normal no puede modificar:
    |
    | - nombre
    | - usuario
    | - contraseña
    | - rol
    | - estado activo
    |
    | del superadmin.
    |
    */

    if (
      usuarioObjetivoEsSuperadmin &&
      !solicitanteEsSuperadmin
    ) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "No tiene permisos para modificar este usuario",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CAMBIO DE ROL
    |--------------------------------------------------------------------------
    */

    if (
      rolId !== undefined
    ) {
      const rol =
        await Rol.findByPk(
          rolId
        );

      if (
        !rol ||
        !rol.activo
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El rol seleccionado no es válido",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | NADIE PUEDE CONVERTIR UNA CUENTA EN SUPERADMIN
      |--------------------------------------------------------------------------
      */

      if (
        esRolSuperadmin(rol) &&
        !usuarioObjetivoEsSuperadmin
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "El rol superadmin no puede asignarse desde la administración de usuarios",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EL SUPERADMIN NO PUEDE QUITARSE SU PROPIO ROL DESDE ESTA API
      |--------------------------------------------------------------------------
      */

      if (
        usuarioObjetivoEsSuperadmin &&
        !esRolSuperadmin(rol)
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "No se puede quitar el rol superadmin desde la administración de usuarios",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ACTUALIZACIÓN NORMAL
    |--------------------------------------------------------------------------
    */

    if (
      nombre !== undefined
    ) {
      usuarioEncontrado.nombre =
        nombre;
    }

    if (
      usuario !== undefined
    ) {
      const usuarioDuplicado =
        await Usuario.findOne({
          where: {
            usuario,
            id: {
              [Op.ne]:
                usuarioEncontrado.id,
            },
          },
        });

      if (
        usuarioDuplicado
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese nombre de usuario ya existe",
        });
      }

      usuarioEncontrado.usuario =
        usuario;
    }

    if (
      rolId !== undefined
    ) {
      usuarioEncontrado.rolId =
        rolId;
    }

    if (
      activo !== undefined
    ) {
      /*
      |--------------------------------------------------------------------------
      | NO DESACTIVAR SUPERADMIN
      |--------------------------------------------------------------------------
      */

      if (
        usuarioObjetivoEsSuperadmin &&
        !Boolean(activo)
      ) {
        return res.status(403).json({
          ok: false,
          mensaje:
            "El usuario superadmin no puede ser desactivado",
        });
      }

      usuarioEncontrado.activo =
        Boolean(activo);
    }

    if (
      password &&
      password.trim() !== ""
    ) {
      usuarioEncontrado.password =
        await bcrypt.hash(
          password,
          10
        );
    }


    const rolFinal =
  await Rol.findByPk(
    usuarioEncontrado.rolId
  );

const nombreRolFinal = String(
  rolFinal?.nombre || ""
)
  .trim()
  .toLowerCase();

if (
  nombreRolFinal === "secretaria_predio"
) {
  const predioFinal =
    predioId !== undefined
      ? predioId
      : usuarioEncontrado.predioId;

  if (!predioFinal) {
    return res.status(400).json({
      ok: false,
      mensaje:
        "Debe seleccionar un predio para la secretaria de predio",
    });
  }

  usuarioEncontrado.predioId =
    Number(predioFinal);
} else {
  usuarioEncontrado.predioId =
    null;
}
    await usuarioEncontrado.save();

    return res.json({
      ok: true,
      mensaje:
        "Usuario actualizado correctamente",
    });
  } catch (error) {
    console.error(
      "Error actualizando usuario:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al actualizar el usuario",
    });
  }
};

/*
|--------------------------------------------------------------------------
| LISTAR ROLES
|--------------------------------------------------------------------------
*/

const listarRoles = async (
  req,
  res
) => {
  try {
    const esSuperadmin =
      esSuperadminRequest(req);

    const roles =
      await Rol.findAll({
        where: {
          activo: true,

          ...(
            !esSuperadmin
              ? {
                  nombre: {
                    [Op.ne]:
                      "superadmin",
                  },
                }
              : {}
          ),
        },

        order: [
          ["id", "ASC"],
        ],
      });

    return res.json({
      ok: true,
      roles,
    });
  } catch (error) {
    console.error(
      "Error listando roles:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener los roles",
    });
  }
};

/*
|--------------------------------------------------------------------------
| MI CUENTA
|--------------------------------------------------------------------------
*/

const obtenerMiCuenta = async (
  req,
  res
) => {
  try {
    const usuarioEncontrado =
      await Usuario.findByPk(
        req.usuario.id,
        {
          attributes: {
            exclude: ["password"],
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
        }
      );

    if (!usuarioEncontrado) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Usuario no encontrado",
      });
    }

    return res.json({
      ok: true,
      usuario: usuarioEncontrado,
    });
  } catch (error) {
    console.error(
      "Error obteniendo mi cuenta:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener los datos de la cuenta",
    });
  }
};


/*
|--------------------------------------------------------------------------
| ACTUALIZAR MI CUENTA
|--------------------------------------------------------------------------
*/

const actualizarMiCuenta = async (
  req,
  res
) => {
  try {
    const {
      usuario,
      email,
      passwordActual,
      passwordNueva,
    } = req.body;

    const usuarioEncontrado =
      await Usuario.findByPk(
        req.usuario.id
      );

    if (!usuarioEncontrado) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Usuario no encontrado",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | USUARIO
    |--------------------------------------------------------------------------
    */

    if (
      usuario !== undefined &&
      usuario.trim() !== ""
    ) {
      const nuevoUsuario =
        usuario.trim();

      const duplicado =
        await Usuario.findOne({
          where: {
            usuario: nuevoUsuario,

            id: {
              [Op.ne]:
                usuarioEncontrado.id,
            },
          },
        });

      if (duplicado) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Ese nombre de usuario ya existe",
        });
      }

      usuarioEncontrado.usuario =
        nuevoUsuario;
    }

    /*
    |--------------------------------------------------------------------------
    | EMAIL
    |--------------------------------------------------------------------------
    */

    let emailCambio = false;

    if (email !== undefined) {
      const nuevoEmail = String(
        email || ""
      )
        .trim()
        .toLowerCase();

      if (!nuevoEmail) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El email no puede quedar vacío",
        });
      }

      const formatoEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !formatoEmail.test(
          nuevoEmail
        )
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Ingresá un email válido",
        });
      }

      const emailDuplicado =
        await Usuario.findOne({
          where: {
            email: nuevoEmail,

            id: {
              [Op.ne]:
                usuarioEncontrado.id,
            },
          },
        });

      if (emailDuplicado) {
        return res.status(409).json({
          ok: false,
          mensaje:
            "Ese email ya está registrado en otro usuario",
        });
      }

      /*
      |----------------------------------------------------------------------
      | DETECTAR SI REALMENTE CAMBIÓ
      |----------------------------------------------------------------------
      */

      emailCambio =
        nuevoEmail !==
        String(
          usuarioEncontrado.email || ""
        )
          .trim()
          .toLowerCase();

      usuarioEncontrado.email =
        nuevoEmail;
    }

    /*
    |--------------------------------------------------------------------------
    | CONTRASEÑA
    |--------------------------------------------------------------------------
    */

    if (
      passwordNueva &&
      passwordNueva.trim() !== ""
    ) {
      if (!passwordActual) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "Ingresá tu contraseña actual",
        });
      }

      const passwordCorrecta =
        await bcrypt.compare(
          passwordActual,
          usuarioEncontrado.password
        );

      if (!passwordCorrecta) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "La contraseña actual es incorrecta",
        });
      }

      if (
        passwordNueva.length < 6
      ) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "La nueva contraseña debe tener al menos 6 caracteres",
        });
      }

      usuarioEncontrado.password =
        await bcrypt.hash(
          passwordNueva,
          10
        );
    }

    /*
    |--------------------------------------------------------------------------
    | GUARDAR CAMBIOS
    |--------------------------------------------------------------------------
    */

    await usuarioEncontrado.save();

    /*
    |--------------------------------------------------------------------------
    | ENVIAR CONFIRMACIÓN SI CAMBIÓ EL EMAIL
    |--------------------------------------------------------------------------
    |
    | El usuario ya fue guardado.
    |
    | Si Gmail falla, NO fallamos la actualización de la cuenta.
    |
    */

    let emailEnviado = false;

    if (
      emailCambio &&
      usuarioEncontrado.email
    ) {
      try {
        await enviarConfirmacionCorreo({
          para:
            usuarioEncontrado.email,

          nombre:
            usuarioEncontrado.nombre,
        });

        emailEnviado = true;
      } catch (errorEmail) {
        console.error(
          "Email guardado, pero no se pudo enviar la confirmación:",
          errorEmail.message
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | RESPUESTA
    |--------------------------------------------------------------------------
    */

    return res.json({
      ok: true,

      emailEnviado,

      mensaje: emailCambio
        ? emailEnviado
          ? "Cuenta actualizada correctamente. Te enviamos un correo de confirmación."
          : "Cuenta actualizada correctamente. El email se guardó, pero no se pudo enviar el correo de confirmación."
        : "Cuenta actualizada correctamente",

      usuario: {
        id:
          usuarioEncontrado.id,

        nombre:
          usuarioEncontrado.nombre,

        usuario:
          usuarioEncontrado.usuario,

        email:
          usuarioEncontrado.email,

        rolId:
          usuarioEncontrado.rolId,

        predioId:
          usuarioEncontrado.predioId,
      },
    });
  } catch (error) {
    console.error(
      "Error actualizando mi cuenta:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "Error al actualizar la cuenta",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ELIMINAR USUARIO
|--------------------------------------------------------------------------
*/

const eliminarUsuario = async (req, res) => {
  try {
    const usuarioId =
      Number(req.params.id);

    /*
    |--------------------------------------------------------------------------
    | VALIDAR ID
    |--------------------------------------------------------------------------
    */

    if (
      !usuarioId ||
      Number.isNaN(usuarioId)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El usuario indicado no es válido",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | NO PERMITIR ELIMINARSE A SÍ MISMO
    |--------------------------------------------------------------------------
    */

    if (
      Number(req.usuario.id) ===
      usuarioId
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "No podés eliminar tu propio usuario",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | BUSCAR USUARIO
    |--------------------------------------------------------------------------
    */

    const usuario =
      await Usuario.findByPk(
        usuarioId
      );

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Usuario no encontrado",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | PROTEGER SUPERADMIN
    |--------------------------------------------------------------------------
    */

    const rolUsuario =
      await Rol.findByPk(
        usuario.rolId
      );

    if (
      rolUsuario?.nombre ===
      "superadmin"
    ) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "El usuario superadmin no puede eliminarse",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | ELIMINAR
    |--------------------------------------------------------------------------
    |
    | Si el usuario está relacionado con reclamos,
    | asignaciones, actuaciones, etc., MySQL puede
    | impedir la eliminación mediante las claves foráneas.
    |
    */

    await usuario.destroy();


    /*
    |--------------------------------------------------------------------------
    | RESPUESTA
    |--------------------------------------------------------------------------
    */

    return res.json({
      ok: true,
      mensaje:
        "Usuario eliminado correctamente",
    });

  } catch (error) {
    console.error(
      "Error eliminando usuario:",
      error
    );


    /*
    |--------------------------------------------------------------------------
    | USUARIO CON HISTORIAL / RELACIONES
    |--------------------------------------------------------------------------
    */

    if (
      error.name ===
        "SequelizeForeignKeyConstraintError" ||
      error.original?.code ===
        "ER_ROW_IS_REFERENCED_2" ||
      error.parent?.code ===
        "ER_ROW_IS_REFERENCED_2"
    ) {
      return res.status(409).json({
        ok: false,
        mensaje:
          "Este usuario ya tiene movimientos o historial en el sistema y no puede eliminarse. Podés dejarlo como inactivo.",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | ERROR GENERAL
    |--------------------------------------------------------------------------
    */

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el usuario",
    });
  }
};


const actualizarMiEmail = async (
  req,
  res
) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | VALIDAR EMAIL
    |--------------------------------------------------------------------------
    */

    if (!email) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El email es obligatorio",
      });
    }

    const formatoEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !formatoEmail.test(email)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Ingresá un email válido",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | BUSCAR USUARIO ACTUAL
    |--------------------------------------------------------------------------
    */

    const usuarioEncontrado =
      await Usuario.findByPk(
        req.usuario.id
      );

    if (!usuarioEncontrado) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Usuario no encontrado",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFICAR QUE EL EMAIL NO ESTÉ USADO
    |--------------------------------------------------------------------------
    */

    const emailDuplicado =
      await Usuario.findOne({
        where: {
          email,

          id: {
            [Op.ne]:
              usuarioEncontrado.id,
          },
        },
      });

    if (emailDuplicado) {
      return res.status(409).json({
        ok: false,
        mensaje:
          "Ese email ya está registrado en otro usuario",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GUARDAR EMAIL
    |--------------------------------------------------------------------------
    */

    usuarioEncontrado.email =
      email;

    await usuarioEncontrado.save();

    let emailEnviado = false;

try {
  await enviarConfirmacionCorreo({
    para: usuarioEncontrado.email,
    nombre: usuarioEncontrado.nombre,
  });

  emailEnviado = true;
} catch (errorEmail) {
  console.error(
    "Email guardado, pero no se pudo enviar la confirmación:",
    errorEmail.message
  );
}

 return res.json({
  ok: true,

  emailEnviado,

  mensaje: emailEnviado
    ? "Email guardado correctamente. Te enviamos un correo de confirmación."
    : "Email guardado correctamente, pero no se pudo enviar el correo de confirmación.",

  usuario: {
        id:
          usuarioEncontrado.id,

        nombre:
          usuarioEncontrado.nombre,

        usuario:
          usuarioEncontrado.usuario,

        email:
          usuarioEncontrado.email,

        rolId:
          usuarioEncontrado.rolId,

        predioId:
          usuarioEncontrado.predioId,

        activo:
          usuarioEncontrado.activo,
      },
    });
  } catch (error) {
    console.error(
      "Error actualizando email:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo guardar el email",
    });
  }
};
module.exports = {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  listarRoles,
    obtenerMiCuenta,
  actualizarMiCuenta,
  actualizarMiEmail,
  eliminarUsuario
};