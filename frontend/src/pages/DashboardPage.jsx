import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/api";

import {
  useAuth,
} from "../context/AuthContext";

import "./DashboardPage.css";

const DashboardPage = () => {
  const navigate = useNavigate();

  const {
    rol,
    usuario,
  } = useAuth();

  const [
    reclamos,
    setReclamos,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | TIPO DE DASHBOARD
  |--------------------------------------------------------------------------
  */

  const esInspector =
    rol === "inspector";

  const esJefe =
    rol === "jefe_guardia";

  /*
  |--------------------------------------------------------------------------
  | RUTAS SEGÚN ROL
  |--------------------------------------------------------------------------
  */

  const rutaListado =
    esInspector
      ? "/mis-trabajos"
      : esJefe
        ? "/mi-guardia"
        : "/reclamos";

  /*
  |--------------------------------------------------------------------------
  | CARGAR RECLAMOS
  |--------------------------------------------------------------------------
  */

  const cargar =
    useCallback(async () => {
      try {
        setCargando(true);
        setError("");

        let endpoint =
          "/reclamos";

        if (esInspector) {
          endpoint =
            "/reclamos/mis-trabajos";
        }

        if (esJefe) {
          endpoint =
            "/reclamos/mi-guardia";
        }

        const respuesta =
          await api.get(
            endpoint
          );

        const lista =
          respuesta.data
            ?.reclamos ||
          respuesta.data ||
          [];

        setReclamos(
          Array.isArray(lista)
            ? lista
            : []
        );
      } catch (err) {
        console.error(
          "Error cargando dashboard:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo cargar el tablero."
        );

        setReclamos([]);
      } finally {
        setCargando(false);
      }
    }, [
      esInspector,
      esJefe,
    ]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /*
  |--------------------------------------------------------------------------
  | RESUMEN
  |--------------------------------------------------------------------------
  */

  const resumen =
    useMemo(() => {
      const contar = (
        estado
      ) =>
        reclamos.filter(
          (reclamo) =>
            reclamo.estado ===
            estado
        ).length;

      return {
        total:
          reclamos.length,

        nuevos:
          contar("NUEVO"),

        asignados:
          contar(
            "ASIGNADO_GUARDIA"
          ) +
          contar(
            "ASIGNADO_INSPECTOR"
          ),

        inspeccion:
          contar(
            "EN_INSPECCION"
          ),

        seguimiento:
          contar(
            "EN_SEGUIMIENTO"
          ),

        actuaciones:
          contar(
            "PENDIENTE_ACTUACION"
          ),

        resueltos:
          contar(
            "RESUELTO"
          ),

        paraCerrar:
          reclamos.filter(
            (reclamo) =>
              reclamo.estado ===
                "RESUELTO" &&
              reclamo.estadoExterno ===
                "LISTO_PARA_CERRAR"
          ).length,

        sinInspector:
          reclamos.filter(
            (reclamo) =>
              !reclamo.inspectorId &&
              reclamo.estado !==
                "RESUELTO" &&
              reclamo.estado !==
                "ANULADO"
          ).length,
      };
    }, [reclamos]);

  /*
  |--------------------------------------------------------------------------
  | ÚLTIMOS
  |--------------------------------------------------------------------------
  */

  const recientes =
    useMemo(() => {
      return [...reclamos]
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ) -
            new Date(
              a.createdAt
            )
        )
        .slice(0, 6);
    }, [reclamos]);

  /*
  |--------------------------------------------------------------------------
  | TEXTOS SEGÚN ROL
  |--------------------------------------------------------------------------
  */

  const titulo = esInspector
    ? "Mis trabajos"
    : esJefe
      ? "Mi guardia"
      : "Tránsito y Vía Pública";

  const subtitulo = esInspector
    ? "Reclamos asignados a tu usuario."
    : esJefe
      ? "Estado de los reclamos asignados a tu guardia."
      : "Estado general del trabajo interno.";

  const tituloRecientes =
    esInspector
      ? "Mis últimos trabajos"
      : esJefe
        ? "Últimos reclamos de mi guardia"
        : "Últimos reclamos";

  /*
  |--------------------------------------------------------------------------
  | CARGANDO
  |--------------------------------------------------------------------------
  */

  if (cargando) {
    return (
      <div className="dashboard-mensaje">
        Cargando tablero...
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>
            {titulo}
          </h1>

          <p>
            {subtitulo}
          </p>

          {(esInspector ||
            esJefe) &&
            usuario?.nombre && (
              <small>
                {usuario.nombre}
              </small>
            )}
        </div>

        <button
          type="button"
          onClick={cargar}
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      <div className="dashboard-cards">

        {/*
        |--------------------------------------------------------------------------
        | DIRECTOR / ADMIN / SECRETARÍA
        |--------------------------------------------------------------------------
        */}

        {!esInspector &&
          !esJefe && (
            <Tarjeta
              titulo="Nuevos"
              cantidad={
                resumen.nuevos
              }
              descripcion="Sin asignar"
              onClick={() =>
                navigate(
                  "/reclamos"
                )
              }
            />
          )}

        {/*
        |--------------------------------------------------------------------------
        | JEFE DE GUARDIA
        |--------------------------------------------------------------------------
        */}

        {esJefe && (
          <Tarjeta
            titulo="Sin inspector"
            cantidad={
              resumen.sinInspector
            }
            descripcion="Pendientes de asignación"
            onClick={() =>
              navigate(
                "/mi-guardia"
              )
            }
          />
        )}

        {/*
        |--------------------------------------------------------------------------
        | ASIGNADOS
        |--------------------------------------------------------------------------
        */}

        <Tarjeta
          titulo={
            esInspector
              ? "Asignados a mí"
              : esJefe
                ? "Asignados"
                : "Asignados"
          }
          cantidad={
            resumen.asignados
          }
          descripcion={
            esInspector
              ? "Trabajos recibidos"
              : esJefe
                ? "Guardia o inspector"
                : "Guardia o inspector"
          }
          onClick={() =>
            navigate(
              rutaListado
            )
          }
        />

        <Tarjeta
          titulo="En inspección"
          cantidad={
            resumen.inspeccion
          }
          descripcion="Trabajo en calle"
          onClick={() =>
            navigate(
              rutaListado
            )
          }
        />

        <Tarjeta
          titulo="Seguimiento"
          cantidad={
            resumen.seguimiento
          }
          descripcion="Esperando nueva visita"
          onClick={() =>
            navigate(
              rutaListado
            )
          }
        />

        <Tarjeta
          titulo="Pendiente actuación"
          cantidad={
            resumen.actuaciones
          }
          descripcion="Requiere intervención"
          onClick={() =>
            navigate(
              rutaListado
            )
          }
        />

        {/*
        | Para cerrar pertenece a la
        | operación de Secretaría/Admin.
        |
        | No tiene sentido mostrarlo
        | al inspector ni al jefe.
        */}

        {!esInspector &&
          !esJefe && (
            <Tarjeta
              titulo="Para cerrar"
              cantidad={
                resumen.paraCerrar
              }
              descripcion="Sistema externo"
              destacar
              onClick={() =>
                navigate(
                  "/para-cerrar"
                )
              }
            />
          )}
      </div>

      <div className="dashboard-secciones">
        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>
                {tituloRecientes}
              </h2>

              <p>
                {esInspector
                  ? "Últimos reclamos que te fueron asignados."
                  : esJefe
                    ? "Últimos reclamos asignados a tu guardia."
                    : "Ingresos recientes al sistema."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  rutaListado
                )
              }
            >
              Ver todos
            </button>
          </div>

          {recientes.length ===
          0 ? (
            <div className="dashboard-vacio">
              {esInspector
                ? "No tenés trabajos asignados."
                : esJefe
                  ? "No tenés reclamos asignados a tu guardia."
                  : "Todavía no hay reclamos."}
            </div>
          ) : (
            <div className="dashboard-recientes">
              {recientes.map(
                (reclamo) => {
                  const tipo =
                    reclamo.TipoReclamo ||
                    reclamo.tipoReclamo;

                  return (
                    <button
                      key={
                        reclamo.id
                      }
                      type="button"
                      onClick={() =>
                        navigate(
                          `/reclamos/${reclamo.id}`
                        )
                      }
                    >
                      <div>
                        <strong>
                          #
                          {
                            reclamo.numeroReclamo
                          }
                        </strong>

                        <span>
                          {tipo?.nombre ||
                            "Sin tipo"}
                        </span>
                      </div>

                      <div>
                        <span>
                          {
                            reclamo.direccion
                          }
                        </span>

                        <small>
                          {
                            reclamo.estado
                          }
                        </small>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section className="dashboard-panel dashboard-total">
          <span>
            {esInspector
              ? "Mis reclamos"
              : esJefe
                ? "Reclamos de mi guardia"
                : "Reclamos registrados"}
          </span>

          <strong>
            {resumen.total}
          </strong>

          <p>
            {esInspector
              ? "Total de reclamos asignados a tu usuario."
              : esJefe
                ? "Total de reclamos asignados a tu guardia."
                : "Total acumulado dentro de nuestro sistema."}
          </p>

          <div>
            <span>
              Resueltos
            </span>

            <strong>
              {resumen.resueltos}
            </strong>
          </div>
        </section>
      </div>
    </div>
  );
};

const Tarjeta = ({
  titulo,
  cantidad,
  descripcion,
  destacar = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={`dashboard-card ${
        destacar
          ? "dashboard-card-destacar"
          : ""
      }`}
      onClick={onClick}
    >
      <span>
        {titulo}
      </span>

      <strong>
        {cantidad}
      </strong>

      <small>
        {descripcion}
      </small>
    </button>
  );
};

export default DashboardPage;