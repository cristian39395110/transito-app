import {
  useNavigate,
} from "react-router-dom";

const NoAutorizadoPage = () => {
  const navigate =
    useNavigate();

  return (
    <div
      style={{
        minHeight:
          "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          padding: "25px",
          border:
            "1px solid #e5e7eb",
          borderRadius: "12px",
          background: "#ffffff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "38px",
            marginBottom: "9px",
          }}
        >
          🔒
        </div>

        <h1
          style={{
            margin: "0 0 7px",
            fontSize: "21px",
          }}
        >
          Acceso no autorizado
        </h1>

        <p
          style={{
            margin: "0 0 18px",
            color: "#6b7280",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Tu usuario está activo,
          pero tu rol no tiene permiso
          para ingresar a esta sección.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/")
          }
          style={{
            width: "100%",
            minHeight: "44px",
            border: "none",
            borderRadius: "8px",
            background: "#1f2937",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default NoAutorizadoPage;