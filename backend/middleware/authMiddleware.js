const jwt = require("jsonwebtoken");

const verificarToken = (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        mensaje:
          "No se proporcionó token",
      });
    }

    const partes =
      authHeader.split(" ");

    if (
      partes.length !== 2 ||
      partes[0] !== "Bearer"
    ) {
      return res.status(401).json({
        ok: false,
        mensaje:
          "Formato de token inválido",
      });
    }

    const token = partes[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje:
        "Token inválido o vencido",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CONTROL DE ROLES
|--------------------------------------------------------------------------
*/

const permitirRoles = (...roles) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje:
          "Usuario no autenticado",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SUPERADMIN HEREDA PERMISOS DE ADMINISTRADOR
    |--------------------------------------------------------------------------
    */

    const tienePermiso =
      roles.includes(
        req.usuario.rol
      ) ||
      (
        req.usuario.rol ===
          "superadmin" &&
        roles.includes(
          "administrador"
        )
      );

    if (!tienePermiso) {
      return res.status(403).json({
        ok: false,
        mensaje:
          "No tiene permisos para realizar esta acción",
      });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  permitirRoles,
};