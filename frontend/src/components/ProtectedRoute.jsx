import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

const ProtectedRoute = ({
  children,
  roles = null,
  permitirSinEmail = false,
}) => {
  const location =
    useLocation();

  const {
    autenticado,
    cargandoAuth,
    rol,
    usuario,
  } = useAuth();

  if (cargandoAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6f8",
          color: "#6b7280",
          fontSize: "13px",
        }}
      >
        Verificando sesión...
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SIN SESIÓN
  |--------------------------------------------------------------------------
  */

  if (!autenticado) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          desde:
            location.pathname,
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | EMAIL OBLIGATORIO
  |--------------------------------------------------------------------------
  |
  | Si el usuario todavía no tiene email,
  | no puede continuar utilizando el sistema.
  |
  | La pantalla /completar-email utiliza
  | permitirSinEmail para evitar un bucle.
  |
  */

  const tieneEmail =
    Boolean(
      String(
        usuario?.email || ""
      ).trim()
    );

  if (
    !tieneEmail &&
    !permitirSinEmail
  ) {
    return (
      <Navigate
        to="/completar-email"
        replace
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PERMISOS POR ROL
  |--------------------------------------------------------------------------
  */

  if (
    Array.isArray(roles) &&
    roles.length > 0
  ) {
    const tienePermiso =
      roles.includes(rol) ||
      (
        rol === "superadmin" &&
        roles.includes(
          "administrador"
        )
      );

    if (!tienePermiso) {
      return (
        <Navigate
          to="/no-autorizado"
          replace
        />
      );
    }
  }

  return children;
};

export default ProtectedRoute;