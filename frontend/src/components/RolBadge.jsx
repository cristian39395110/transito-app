const nombres = {
  administrador:
    "Administrador",

  director:
    "Director",

  jefe_guardia:
    "Jefe de guardia",

  inspector:
    "Inspector",

  secretaria_reclamos:
    "Secretaría reclamos",

  secretaria_predio:
    "Secretaría predio",
};

const estilos = {
  administrador: {
    background: "#fef2f2",
    color: "#991b1b",
  },

  director: {
    background: "#eff6ff",
    color: "#1d4ed8",
  },

  jefe_guardia: {
    background: "#fff7ed",
    color: "#c2410c",
  },

  inspector: {
    background: "#ecfdf5",
    color: "#047857",
  },

  secretaria_reclamos: {
    background: "#f5f3ff",
    color: "#6d28d9",
  },

  secretaria_predio: {
    background: "#fdf2f8",
    color: "#be185d",
  },
};

const RolBadge = ({
  rol,
}) => {
  const estilo =
    estilos[rol] || {
      background: "#f3f4f6",
      color: "#4b5563",
    };

  return (
    <span
      style={{
        display: "inline-flex",
        width: "fit-content",
        padding: "5px 8px",
        borderRadius: "20px",
        background:
          estilo.background,
        color: estilo.color,
        fontSize: "9px",
        fontWeight: 700,
      }}
    >
      {nombres[rol] ||
        rol ||
        "Sin rol"}
    </span>
  );
};

export default RolBadge;