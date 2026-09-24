import {
  useState,
} from "react";

import "./GaleriaFotos.css";

const obtenerBaseBackend =
  () => {
    const apiUrl =
      import.meta.env
        .VITE_API_URL ||
      "http://localhost:3001/api";

    return apiUrl.replace(
      /\/api\/?$/,
      ""
    );
  };

const obtenerUrlFoto = (
  ruta
) => {
  if (!ruta) {
    return "";
  }

  if (
    ruta.startsWith(
      "http://"
    ) ||
    ruta.startsWith(
      "https://"
    )
  ) {
    return ruta;
  }

  return `${obtenerBaseBackend()}${ruta}`;
};

const GaleriaFotos = ({
  fotos = [],
  permitirEliminar = false,
  onEliminarFoto = null,
}) => {
  const [
    fotoAbierta,
    setFotoAbierta,
  ] = useState(null);

  const [
    eliminandoId,
    setEliminandoId,
  ] = useState(null);

  const eliminarFoto =
    async (
      event,
      foto
    ) => {
      event.stopPropagation();

      if (
        !permitirEliminar ||
        !onEliminarFoto ||
        eliminandoId
      ) {
        return;
      }

      try {
        setEliminandoId(
          foto.id
        );

        await onEliminarFoto(
          foto
        );

        if (
          fotoAbierta?.id ===
          foto.id
        ) {
          setFotoAbierta(null);
        }
      } finally {
        setEliminandoId(null);
      }
    };

  if (!fotos.length) {
    return (
      <div className="galeria-fotos-vacia">
        <span>📷</span>

        <strong>
          Sin fotografías
        </strong>

        <p>
          Las fotografías del
          procedimiento aparecerán
          acá.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="galeria-fotos">
        {fotos.map(
          (foto) => {
            const url =
              obtenerUrlFoto(
                foto.ruta
              );

            return (
              <div
                key={foto.id}
                style={{
                  position:
                    "relative",
                }}
              >
                <button
                  type="button"
                  className="galeria-foto"
                  onClick={() =>
                    setFotoAbierta(
                      foto
                    )
                  }
                >
                  <img
                    src={url}
                    alt={
                      foto.descripcion ||
                      "Fotografía del reclamo"
                    }
                    loading="lazy"
                  />

                  <div className="galeria-foto-info">
                    <strong>
                      {
                        foto.tipoReferencia
                      }
                    </strong>

                    {foto.descripcion && (
                      <span>
                        {
                          foto.descripcion
                        }
                      </span>
                    )}
                  </div>
                </button>

                {permitirEliminar && (
                  <button
                    type="button"
                    onClick={(event) =>
                      eliminarFoto(
                        event,
                        foto
                      )
                    }
                    disabled={
                      eliminandoId ===
                      foto.id
                    }
                    title="Quitar foto"
                    style={{
                      position:
                        "absolute",
                      top: "8px",
                      right: "8px",
                      width: "40px",
                      height: "40px",
                      borderRadius:
                        "50%",
                      border: "none",
                      background:
                        "#991b1b",
                      color: "#ffffff",
                      fontSize: "24px",
                      fontWeight:
                        "bold",
                      cursor:
                        "pointer",
                      zIndex: 2,
                    }}
                  >
                    {eliminandoId ===
                    foto.id
                      ? "…"
                      : "×"}
                  </button>
                )}
              </div>
            );
          }
        )}
      </div>

      {fotoAbierta && (
        <div
          className="foto-modal"
          onClick={() =>
            setFotoAbierta(
              null
            )
          }
        >
          <div
            className="foto-modal-contenido"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="foto-modal-cerrar"
              onClick={() =>
                setFotoAbierta(
                  null
                )
              }
            >
              ×
            </button>

            <img
              src={obtenerUrlFoto(
                fotoAbierta.ruta
              )}
              alt={
                fotoAbierta.descripcion ||
                "Fotografía ampliada"
              }
            />

            <div className="foto-modal-datos">
              <strong>
                {
                  fotoAbierta.tipoReferencia
                }
              </strong>

              {fotoAbierta.descripcion && (
                <p>
                  {
                    fotoAbierta.descripcion
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GaleriaFotos;