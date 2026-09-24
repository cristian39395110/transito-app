import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import "./HistorialReclamo.css";

const formatearFecha = (
  fecha
) => {
  if (!fecha) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(
    new Date(fecha)
  );
};

const HistorialReclamo = ({
  reclamoId,
}) => {
  const [
    historial,
    setHistorial,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const cargar =
    useCallback(async () => {
      try {
        setCargando(true);
        setError("");

        /*
        Primero buscamos si el
        backend devuelve el historial
        dentro del reclamo.
        */

        const respuesta =
          await api.get(
            `/reclamos/${reclamoId}`
          );

        const reclamo =
          respuesta.data.reclamo ||
          respuesta.data;

        setHistorial(
          reclamo.historial ||
            reclamo.Historials ||
            reclamo.historiales ||
            []
        );
      } catch (err) {
        console.error(
          "Error cargando historial:",
          err
        );

        setError(
          "No se pudo cargar el historial"
        );
      } finally {
        setCargando(false);
      }
    }, [reclamoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="historial-mensaje">
        Cargando historial...
      </div>
    );
  }

  if (error) {
    return (
      <div className="historial-error">
        {error}
      </div>
    );
  }

  if (!historial.length) {
    return (
      <div className="historial-mensaje">
        Todavía no hay movimientos
        registrados.
      </div>
    );
  }

  return (
    <div className="historial-lista">
      {historial.map(
        (item) => {
          const usuario =
            item.usuario ||
            item.Usuario;

          return (
            <div
              className="historial-item"
              key={item.id}
            >
              <div className="historial-linea">
                <span />
              </div>

              <div className="historial-contenido">
                <div className="historial-superior">
                  <strong>
                    {item.accion ||
                      "Movimiento"}
                  </strong>

                  <time>
                    {formatearFecha(
                      item.createdAt ||
                        item.fechaHora
                    )}
                  </time>
                </div>

                {item.descripcion && (
                  <p>
                    {
                      item.descripcion
                    }
                  </p>
                )}

                {(item.estadoAnterior ||
                  item.estadoNuevo) && (
                  <div className="historial-estados">
                    {item.estadoAnterior && (
                      <span>
                        {
                          item.estadoAnterior
                        }
                      </span>
                    )}

                    {item.estadoAnterior &&
                      item.estadoNuevo && (
                        <b>→</b>
                      )}

                    {item.estadoNuevo && (
                      <span>
                        {
                          item.estadoNuevo
                        }
                      </span>
                    )}
                  </div>
                )}

                {usuario && (
                  <small>
                    Realizado por{" "}
                    <strong>
                      {usuario.nombre ||
                        usuario.usuario}
                    </strong>
                  </small>
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
};

export default HistorialReclamo;