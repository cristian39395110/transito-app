import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import TipoReclamoForm from "../components/TipoReclamoForm";

import "./TiposReclamoPage.css";

const TiposReclamoPage = () => {
  const [tipos, setTipos] =
    useState([]);

  const [buscar, setBuscar] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    tipoEditando,
    setTipoEditando,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | CARGAR
  |--------------------------------------------------------------------------
  */

  const cargarTipos =
    useCallback(async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get(
            "/tipos-reclamo"
          );

        const datos =
          respuesta.data || {};

        const lista =
          datos.tipos ||
          datos.tiposReclamo ||
          datos.tipoReclamos ||
          datos.data ||
          (Array.isArray(datos)
            ? datos
            : []);

        setTipos(
          Array.isArray(lista)
            ? lista
            : []
        );
      } catch (err) {
        console.error(
          "Error cargando tipos:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudieron cargar los tipos de reclamo"
        );
      } finally {
        setCargando(false);
      }
    }, []);

  useEffect(() => {
    cargarTipos();
  }, [cargarTipos]);

  /*
  |--------------------------------------------------------------------------
  | FILTRAR
  |--------------------------------------------------------------------------
  */

  const filtrados =
    useMemo(() => {
      const texto =
        buscar
          .trim()
          .toLowerCase();

      if (!texto) {
        return tipos;
      }

      return tipos.filter(
        (tipo) => {
          const contenido = [
            tipo.nombre,
            tipo.descripcion,
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
      tipos,
      buscar,
    ]);

  const abrirNuevo = () => {
    setTipoEditando(null);
    setMostrarFormulario(true);
  };

  const abrirEditar = (
    tipo
  ) => {
    setTipoEditando(tipo);
    setMostrarFormulario(true);
  };

  const cerrarFormulario =
    () => {
      setTipoEditando(null);
      setMostrarFormulario(false);
    };

  const manejarGuardado =
    async () => {
      cerrarFormulario();

      await cargarTipos();
    };

  const activos =
    tipos.filter(
      (tipo) =>
        tipo.activo !== false
    ).length;

  return (
    <div className="tipos-page">
      <div className="tipos-header">
        <div>
          <h1>
            Tipos de reclamo
          </h1>

          <p>
            Catálogo utilizado para
            clasificar los reclamos
            recibidos.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNuevo}
        >
          + Nuevo tipo
        </button>
      </div>

      <div className="tipos-resumen">
        <div>
          <strong>
            {tipos.length}
          </strong>

          <span>
            Total
          </span>
        </div>

        <div>
          <strong>
            {activos}
          </strong>

          <span>
            Activos
          </span>
        </div>

        <div>
          <strong>
            {tipos.length -
              activos}
          </strong>

          <span>
            Inactivos
          </span>
        </div>
      </div>

      <div className="tipos-buscador">
        <input
          type="search"
          value={buscar}
          onChange={(event) =>
            setBuscar(
              event.target.value
            )
          }
          placeholder="Buscar tipo de reclamo..."
        />
      </div>

      {cargando ? (
        <div className="tipos-mensaje">
          Cargando tipos...
        </div>
      ) : error ? (
        <div className="tipos-error">
          {error}

          <button
            type="button"
            onClick={cargarTipos}
          >
            Reintentar
          </button>
        </div>
      ) : filtrados.length ===
        0 ? (
        <div className="tipos-mensaje">
          No hay tipos de reclamo
          cargados.
        </div>
      ) : (
        <div className="tipos-lista">
          {filtrados.map(
            (tipo) => (
              <div
                key={tipo.id}
                className={`tipo-reclamo-item ${
                  tipo.activo ===
                  false
                    ? "inactivo"
                    : ""
                }`}
              >
                <div className="tipo-reclamo-estado">
                  {tipo.activo ===
                  false
                    ? "○"
                    : "●"}
                </div>

                <div className="tipo-reclamo-info">
                  <strong>
                    {tipo.nombre}
                  </strong>

                  <span>
                    {tipo.descripcion ||
                      "Sin descripción"}
                  </span>
                </div>

                <div className="tipo-reclamo-badge">
                  {tipo.activo ===
                  false
                    ? "Inactivo"
                    : "Activo"}
                </div>

                <button
                  type="button"
                  className="tipo-reclamo-editar"
                  onClick={() =>
                    abrirEditar(
                      tipo
                    )
                  }
                >
                  Editar
                </button>
              </div>
            )
          )}
        </div>
      )}

      {mostrarFormulario && (
        <div
          className="tipos-modal"
          onClick={
            cerrarFormulario
          }
        >
          <div
            className="tipos-modal-contenido"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <TipoReclamoForm
              tipo={
                tipoEditando
              }
              onGuardado={
                manejarGuardado
              }
              onCancelar={
                cerrarFormulario
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TiposReclamoPage;