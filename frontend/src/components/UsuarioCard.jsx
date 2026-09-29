import RolBadge from "./RolBadge";

import "./UsuarioCard.css";


const UsuarioCard = ({
  usuario,
  onEditar,
  onEliminar,
  eliminando = false,
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

      {/* CABECERA */}

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


      {/* ROL */}

      <div className="usuario-card-rol">

        <span>
          Rol
        </span>

        <RolBadge
          rol={rol}
        />

      </div>


      {/* ACCIONES */}

      <div className="usuario-card-acciones">

        <button
          type="button"
          className="usuario-editar"
          onClick={onEditar}
          disabled={eliminando}
        >
          Editar usuario
        </button>


        <button
          type="button"
          className="usuario-eliminar"
          onClick={onEliminar}
          disabled={eliminando}
        >
          {eliminando
            ? "Eliminando..."
            : "Eliminar usuario"}
        </button>

      </div>

    </article>
  );
};


export default UsuarioCard;