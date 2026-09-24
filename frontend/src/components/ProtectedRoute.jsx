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
}) => {
  const location =
    useLocation();

  const {
    autenticado,
    cargandoAuth,
    rol,
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

  if (
    Array.isArray(roles) &&
    roles.length > 0 &&
    !roles.includes(rol)
  ) {
    return (
      <Navigate
        to="/no-autorizado"
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;