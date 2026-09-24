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

import ReclamoForm from "../components/ReclamoForm";

import {
  useAuth,
} from "../context/AuthContext";

import "./ReclamosPage.css";

const ETAPAS = {
  PENDIENTE_ASIGNACION_GUARDIA: {
    texto: "Sin asignar",
    clase: "gris",
    accion:
      "Director debe asignar jefe",
  },

  PENDIENTE_PRIMERA_VISITA: {
    texto:
      "Esperando primera visita",
    clase: "amarillo",
    accion:
      "Jefe debe asignar inspector",
  },

  PRIMERA_VISITA: {
    texto:
      "Primera visita asignada",
    clase: "azul",
    accion:
      "Inspector debe verificar",
  },

  ESPERANDO_PLAZO: {
    texto:
      "Esperando vencimiento",
    clase: "amarillo",
    accion:
      "Esperar plazo",
  },

  PENDIENTE_SEGUNDA_VISITA: {
    texto:
      "Necesita segunda visita",
    clase: "rojo",
    accion:
      "Jefe debe asignar inspector",
  },

  SEGUNDA_VISITA: {
    texto:
      "Segunda visita asignada",
    clase: "azul",
    accion:
      "Inspector debe verificar",
  },

  PENDIENTE_DECISION_JEFE: {
    texto:
      "Pendiente de decisión",
    clase: "amarillo",
    accion:
      "Jefe debe revisar",
  },

  PENDIENTE_ENVIO_JUZGADO: {
    texto:
      "Pendiente de enviar al Juzgado",
    clase: "naranja",
    accion:
      "Secretaría debe enviar acta",
  },

  EN_JUZGADO: {
    texto:
      "Esperando respuesta del Juzgado",
    clase: "violeta",
    accion:
      "Esperar respuesta",
  },

  PENDIENTE_ASIGNACION_POST_JUZGADO: {
    texto:
      "Juzgado autorizó",
    clase: "celeste",
    accion:
      "Director debe asignar jefe",
  },

  POST_JUZGADO_ASIGNADO_GUARDIA: {
    texto:
      "Asignado después del Juzgado",
    clase: "celeste",
    accion:
      "Jefe debe organizar actuación",
  },

  POST_JUZGADO_EN_ACTUACION: {
    texto:
      "Actuación posterior al Juzgado",
    clase: "azul",
    accion:
      "Inspector debe actuar",
  },

  FINALIZADO: {
    texto: "Finalizado",
    clase: "verde",
    accion:
      "Sin tareas pendientes",
  },

  ANULADO: {
    texto: "Anulado",
    clase: "gris",
    accion:
      "Sin tareas pendientes",
  },
};

const obtenerEtapa = (
  reclamo
) =>
  ETAPAS[
    reclamo.etapaActual
  ] || {
    texto:
      reclamo.etapaActual ||
      reclamo.estado ||
      "Sin estado",
    clase: "gris",
    accion:
      "Revisar expediente",
  };

const obtenerTipo = (
  reclamo
) =>
  reclamo.tipoReclamo
    ?.nombre ||
  reclamo.TipoReclamo
    ?.nombre ||
  "Sin tipo";

const obtenerResponsable = (
  reclamo
) => {
  if (reclamo.inspector) {
    return (
      reclamo.inspector
        .nombre ||
      reclamo.inspector
        .usuario ||
      "Inspector"
    );
  }

  if (reclamo.jefeGuardia) {
    return (
      reclamo.jefeGuardia
        .nombre ||
      reclamo.jefeGuardia
        .usuario ||
      "Jefe de guardia"
    );
  }

  return "—";
};

const ReclamosPage = () => {
  const navigate =
    useNavigate();

  const { rol } =
    useAuth();

  const [
    reclamos,
    setReclamos,
  ] = useState([]);

  const [
    tipos,
    setTipos,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    buscar,
    setBuscar,
  ] = useState("");

  const [
    etapaActual,
    setEtapaActual,
  ] = useState("");

  const [
    tipoReclamoId,
    setTipoReclamoId,
  ] = useState("");

  const [
    mostrarNuevo,
    setMostrarNuevo,
  ] = useState(false);

  const puedeCrear =
    rol ===
      "administrador" ||
    rol ===
      "secretaria_reclamos";

  const cargarDatos =
    useCallback(
      async () => {
        try {
          setCargando(true);
          setError("");

          const [
            respuestaReclamos,
            respuestaTipos,
          ] =
            await Promise.all([
              api.get(
                "/reclamos"
              ),
              api.get(
                "/tipos-reclamo"
              ),
            ]);

          const listaReclamos =
            respuestaReclamos
              .data?.reclamos ||
            respuestaReclamos
              .data ||
            [];

          setReclamos(
            Array.isArray(
              listaReclamos
            )
              ? listaReclamos
              : []
          );

          const datosTipos =
            respuestaTipos.data ||
            {};

          const listaTipos =
            datosTipos.tipos ||
            datosTipos
              .tiposReclamo ||
            datosTipos
              .tipoReclamos ||
            datosTipos.data ||
            (Array.isArray(
              datosTipos
            )
              ? datosTipos
              : []);

          setTipos(
            Array.isArray(
              listaTipos
            )
              ? listaTipos
              : []
          );
        } catch (err) {
          console.error(
            err
          );

          setError(
            err.response?.data
              ?.mensaje ||
              "No se pudieron cargar los reclamos"
          );
        } finally {
          setCargando(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const reclamosFiltrados =
    useMemo(() => {
      const texto =
        buscar
          .trim()
          .toLowerCase();

      return reclamos.filter(
        (reclamo) => {
          if (
            etapaActual &&
            reclamo.etapaActual !==
              etapaActual
          ) {
            return false;
          }

          if (tipoReclamoId) {
            const idTipo =
              reclamo
                .tipoReclamoId ||
              reclamo
                .tipoReclamo
                ?.id ||
              reclamo
                .TipoReclamo
                ?.id;

            if (
              Number(idTipo) !==
              Number(
                tipoReclamoId
              )
            ) {
              return false;
            }
          }

          if (!texto) {
            return true;
          }

          const etapa =
            obtenerEtapa(
              reclamo
            );

          const contenido = [
            reclamo
              .numeroReclamo,
            reclamo.direccion,
            reclamo.barrio,
            reclamo.referencia,
            reclamo
              .observaciones,
            obtenerTipo(
              reclamo
            ),
            etapa.texto,
            etapa.accion,
            obtenerResponsable(
              reclamo
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return contenido.includes(
            texto
          );
        }
      );
    }, [
      reclamos,
      buscar,
      etapaActual,
      tipoReclamoId,
    ]);

  const limpiarFiltros =
    () => {
      setBuscar("");
      setEtapaActual("");
      setTipoReclamoId("");
    };

  const hayFiltros =
    Boolean(
      buscar ||
        etapaActual ||
        tipoReclamoId
    );

  const manejarCreado =
    async () => {
      setMostrarNuevo(
        false
      );

      await cargarDatos();
    };

  return (
    <div className="reclamos-page">
      <div className="reclamos-header">
        <div>
          <h1>
            Reclamos
          </h1>

          <p>
            Seguimiento operativo de
            todos los reclamos.
          </p>
        </div>

        {puedeCrear && (
          <button
            type="button"
            className="reclamos-nuevo"
            onClick={() =>
              setMostrarNuevo(
                true
              )
            }
          >
            + Nuevo reclamo
          </button>
        )}
      </div>

      <div className="reclamos-filtros">
        <input
          type="search"
          value={buscar}
          onChange={(event) =>
            setBuscar(
              event.target
                .value
            )
          }
          placeholder="Buscar número, dirección, responsable..."
        />

        <select
          value={
            etapaActual
          }
          onChange={(event) =>
            setEtapaActual(
              event.target
                .value
            )
          }
        >
          <option value="">
            Todas las situaciones
          </option>

          {Object.entries(
            ETAPAS
          ).map(
            ([
              valor,
              datos,
            ]) => (
              <option
                key={valor}
                value={valor}
              >
                {datos.texto}
              </option>
            )
          )}
        </select>

        <select
          value={
            tipoReclamoId
          }
          onChange={(event) =>
            setTipoReclamoId(
              event.target
                .value
            )
          }
        >
          <option value="">
            Todos los tipos
          </option>

          {tipos.map(
            (tipo) => (
              <option
                key={
                  tipo.id
                }
                value={
                  tipo.id
                }
              >
                {tipo.nombre}
              </option>
            )
          )}
        </select>

        {hayFiltros && (
          <button
            type="button"
            className="reclamos-limpiar"
            onClick={
              limpiarFiltros
            }
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="reclamos-resumen">
        <strong>
          {
            reclamosFiltrados
              .length
          }
        </strong>

        <span>
          reclamo
          {reclamosFiltrados
            .length !== 1
            ? "s"
            : ""}
        </span>

        {hayFiltros && (
          <small>
            de{" "}
            {
              reclamos.length
            }{" "}
            total
          </small>
        )}
      </div>

      {cargando ? (
        <div className="reclamos-mensaje">
          Cargando reclamos...
        </div>
      ) : error ? (
        <div className="reclamos-error">
          {error}

          <button
            type="button"
            onClick={
              cargarDatos
            }
          >
            Reintentar
          </button>
        </div>
      ) : reclamosFiltrados
          .length === 0 ? (
        <div className="reclamos-mensaje">
          No hay reclamos que
          coincidan con los
          filtros.
        </div>
      ) : (
        <div className="reclamos-tabla-contenedor">
          <table className="reclamos-tabla">
            <thead>
              <tr>
                <th>
                  Reclamo
                </th>

                <th>
                  Tipo
                </th>

                <th>
                  Dirección
                </th>

                <th>
                  Situación actual
                </th>

                <th>
                  Qué sigue
                </th>

                <th>
                  Responsable
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {reclamosFiltrados.map(
                (reclamo) => {
                  const etapa =
                    obtenerEtapa(
                      reclamo
                    );

                  return (
                    <tr
                      key={
                        reclamo.id
                      }
                    >
                      <td
                        data-label="Reclamo"
                        className="reclamo-numero"
                      >
                        #
                        {reclamo
                          .numeroReclamo ||
                          reclamo.id}
                      </td>

                      <td data-label="Tipo">
                        {obtenerTipo(
                          reclamo
                        )}
                      </td>

                      <td data-label="Dirección">
                        <strong>
                          {reclamo
                            .direccion ||
                            "—"}
                        </strong>

                        {reclamo
                          .barrio && (
                          <small>
                            {
                              reclamo
                                .barrio
                            }
                          </small>
                        )}
                      </td>

                      <td data-label="Situación">
                        <span
                          className={`estado-etapa ${etapa.clase}`}
                        >
                          {
                            etapa.texto
                          }
                        </span>
                      </td>

                      <td
                        data-label="Qué sigue"
                        className="reclamo-accion"
                      >
                        {
                          etapa.accion
                        }
                      </td>

                      <td data-label="Responsable">
                        {obtenerResponsable(
                          reclamo
                        )}
                      </td>

                      <td className="reclamo-ver">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/reclamos/${reclamo.id}`
                            )
                          }
                        >
                          Ver →
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {mostrarNuevo && (
        <div
          className="reclamo-modal"
          onClick={() =>
            setMostrarNuevo(
              false
            )
          }
        >
          <div
            className="reclamo-modal-contenido"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="reclamo-modal-cerrar"
              onClick={() =>
                setMostrarNuevo(
                  false
                )
              }
            >
              ×
            </button>

            <ReclamoForm
              onCreado={
                manejarCreado
              }
              onCancelar={() =>
                setMostrarNuevo(
                  false
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReclamosPage;