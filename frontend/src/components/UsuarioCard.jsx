import RolBadge from "./RolBadge";

import "./UsuarioCard.css";

const UsuarioCard = ({
  usuario,
  onEditar,
}) => {
  const rol =
    usuario.rol?.nombre ||
    usuario.Rol?.nombre ||
    usuario.rol ||
    "sin_rol";

  const activo =
    usuario.activo !== false;

  return (
    <article className="usuario-card">
      <div className="usuario-card-header">
        <div className="usuario-avatar">
          {(
            usuario.nombre ||
            usuario.usuario ||
            "U"
          )
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="usuario-identidad">
          <strong>
            {usuario.nombre}
          </strong>

          <span>
            @{usuario.usuario}
          </span>
        </div>

        <span
          className={`usuario-estado ${
            activo
              ? "activo"
              : "inactivo"
          }`}
        >
          {activo
            ? "Activo"
            : "Inactivo"}
        </span>
      </div>

      <div className="usuario-card-rol">
        <span>
          Rol
        </span>

        <RolBadge
          rol={rol}
        />
      </div>

      <button
        type="button"
        onClick={onEditar}
      >
        Editar usuario
      </button>
    </article>
  );
};

export default UsuarioCard;