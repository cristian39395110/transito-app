import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import {
  useAuth,
} from "../context/AuthContext";

import PendientesIngresoPredio from "../components/PendientesIngresoPredio";
import VehiculosEnPredio from "../components/VehiculosEnPredio";
import FichaPredioVehiculo from "../components/FichaPredioVehiculo";
import HistorialPredio from "../components/HistorialPredio";

import "./PredioPage.css";

const PredioPage = () => {

    const {
    usuario,
    rol,
  } = useAuth();

  const nombreRol =
    String(
      rol || ""
    )
      .trim()
      .toLowerCase();

  const esSecretariaPredio =
    nombreRol ===
    "secretaria_predio";

  const puedeVerTodos =
    [
      "director",
      "administrador",
      "superadmin",
    ].includes(nombreRol);

  const predioAsignadoId =
    usuario?.predioId
      ? String(
          usuario.predioId
        )
      : "";
  const [predios, setPredios] =
    useState([]);

  const [
    predioSeleccionadoId,
    setPredioSeleccionadoId,
  ] = useState("");

  const [pendientes, setPendientes] =
    useState([]);

  const [enPredio, setEnPredio] =
    useState([]);


    const [historial, setHistorial] =
  useState([]);
  const [seleccionado, setSeleccionado] =
    useState(null);

  const [pestana, setPestana] =
    useState("EN_PREDIO");

  const [buscar, setBuscar] =
    useState("");

    const [
  paginaEnPredio,
  setPaginaEnPredio,
] = useState(1);

const [
  totalEnPredio,
  setTotalEnPredio,
] = useState(0);

const [
  totalPaginasEnPredio,
  setTotalPaginasEnPredio,
] = useState(1);

const [
  paginaHistorial,
  setPaginaHistorial,
] = useState(1);

const [
  totalHistorial,
  setTotalHistorial,
] = useState(0);

const [
  totalPaginasHistorial,
  setTotalPaginasHistorial,
] = useState(1);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | PREDIO SELECCIONADO
  |--------------------------------------------------------------------------
  */

   const predioSeleccionado =
    useMemo(() => {
      if (
        predioSeleccionadoId ===
        "TODOS"
      ) {
        return null;
      }

      return (
        predios.find(
          (predio) =>
            Number(predio.id) ===
            Number(
              predioSeleccionadoId
            )
        ) || null
      );
    }, [
      predios,
      predioSeleccionadoId,
    ]);

  const viendoTodos =
    predioSeleccionadoId ===
    "TODOS";
  /*
  |--------------------------------------------------------------------------
  | CARGAR CATÁLOGO DE PREDIOS
  |--------------------------------------------------------------------------
  */

  const cargarPredios =
    async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get(
            "/predios"
          );

        const lista =
          respuesta.data?.predios ||
          [];

        setPredios(lista);

        if (!lista.length) {
          setPredioSeleccionadoId(
            ""
          );
setPendientes([]);
setEnPredio([]);
setHistorial([]);

          setError(
            "No hay predios activos cargados."
          );

          return;
        }

       

        if (esSecretariaPredio) {
  if (!predioAsignadoId) {
    setPredioSeleccionadoId("");

    setError(
      "La secretaria no tiene un predio asignado."
    );

    return;
  }

  setPredioSeleccionadoId(
    predioAsignadoId
  );

  return;
}

if (puedeVerTodos) {
  setPredioSeleccionadoId(
    "TODOS"
  );

  return;
}

setPredioSeleccionadoId(
  String(lista[0].id)
);
      } catch (err) {
        console.error(
          "Error cargando predios:",
          err
        );

        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudieron cargar los predios."
        );
      } finally {
        setCargando(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CARGAR VEHÍCULOS DEL PREDIO
  |--------------------------------------------------------------------------
  */

const cargarVehiculos =
  async (predioId) => {
    if (!predioId) {
      setPendientes([]);
      setEnPredio([]);
      setHistorial([]);

      setTotalEnPredio(0);
      setTotalHistorial(0);

      return;
    }

    try {
      setCargando(true);
      setError("");

   const [
  respuestaPendientes,
  respuestaTraslados,
  respuestaEnPredio,
  respuestaHistorial,
] = await Promise.all([
        api.get(
          "/predios/vehiculos/pendientes-ingreso",
          {
            params: {
              predioId,
            },
          }
        ),

        api.get(
  "/predios/traslados/pendientes",
  {
    params: {
      predioId,
    },
  }
),

        api.get(
          "/predios/vehiculos/en-predio",
          {
            params: {
              predioId,
              page: paginaEnPredio,
              buscar:
                buscar.trim() ||
                undefined,
            },
          }
        ),

        api.get(
          "/predios/vehiculos/historial",
          {
            params: {
              predioId,
              page: paginaHistorial,
              buscar:
                buscar.trim() ||
                undefined,
            },
          }
        ),
      ]);
const pendientesNormales =
  respuestaPendientes.data
    ?.pendientes || [];

const trasladosPendientes =
  respuestaTraslados.data
    ?.pendientes || [];

setPendientes([
  ...pendientesNormales,
  ...trasladosPendientes,
]);
      setEnPredio(
        respuestaEnPredio.data
          ?.ingresos || []
      );

      setTotalEnPredio(
        Number(
          respuestaEnPredio.data
            ?.total
        ) || 0
      );

      setTotalPaginasEnPredio(
        Number(
          respuestaEnPredio.data
            ?.totalPaginas
        ) || 1
      );

      setHistorial(
        respuestaHistorial.data
          ?.historial || []
      );

      setTotalHistorial(
        Number(
          respuestaHistorial.data
            ?.total
        ) || 0
      );

      setTotalPaginasHistorial(
        Number(
          respuestaHistorial.data
            ?.totalPaginas
        ) || 1
      );
    } catch (err) {
      console.error(
        "Error cargando predio:",
        err
      );

      setPendientes([]);
      setEnPredio([]);
      setHistorial([]);

      setTotalEnPredio(0);
      setTotalHistorial(0);

      setError(
        err.response?.data
          ?.mensaje ||
          "No se pudo cargar la información del predio."
      );
    } finally {
      setCargando(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CARGA INICIAL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    cargarPredios();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CAMBIO DE PREDIO
  |--------------------------------------------------------------------------
  */

useEffect(() => {
  if (!predioSeleccionadoId) {
    return;
  }

  setSeleccionado(null);

  const timer =
    setTimeout(() => {
      cargarVehiculos(
        predioSeleccionadoId
      );
    }, 300);

  return () =>
    clearTimeout(timer);
}, [
  predioSeleccionadoId,
  paginaEnPredio,
  paginaHistorial,
  buscar,
]);

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const obtenerVehiculo = (
    item
  ) => {
    return (
      item?.vehiculo ||
      item?.Vehiculo ||
      item ||
      {}
    );
  };

  const obtenerReclamo = (
    item
  ) => {
    const vehiculo =
      obtenerVehiculo(item);

    return (
      item?.reclamo ||
      item?.Reclamo ||
      vehiculo?.reclamo ||
      vehiculo?.Reclamo ||
      {}
    );
  };

  const obtenerIngreso = (
    item
  ) => {
    return (
      item?.ingresoPredio ||
      item?.IngresoPredio ||
      (
        item?.predioId &&
        item?.vehiculoId
          ? item
          : null
      )
    );
  };

  const coincideBusqueda = (
    item
  ) => {
    const texto =
      buscar
        .trim()
        .toLowerCase();

    if (!texto) {
      return true;
    }

    const vehiculo =
      obtenerVehiculo(item);

    const reclamo =
      obtenerReclamo(item);

    const ingreso =
      obtenerIngreso(item);

    const remocion =
      item?.remocion ||
      item?.Remocion ||
      {};

    const valores = [
      vehiculo?.numeroInterno,
      vehiculo?.dominio,
      vehiculo?.marca,
      vehiculo?.modelo,
      vehiculo?.color,

      reclamo?.numeroReclamo,
      reclamo?.direccion,

      ingreso?.sector,
      ingreso?.posicion,

      remocion?.destino,

      predioSeleccionado
        ?.nombre,
    ];

    return valores.some(
      (valor) =>
        String(valor || "")
          .toLowerCase()
          .includes(texto)
    );
  };

  const pendientesFiltrados =
    useMemo(
      () =>
        pendientes.filter(
          coincideBusqueda
        ),
      [
        pendientes,
        buscar,
        predioSeleccionado,
      ]
    );

  const enPredioFiltrados =
    useMemo(
      () =>
        enPredio.filter(
          coincideBusqueda
        ),
      [
        enPredio,
        buscar,
        predioSeleccionado,
      ]
    );
const historialFiltrado =
  useMemo(() => {
    const texto =
      buscar
        .trim()
        .toLowerCase();

    if (!texto) {
      return historial;
    }

    return historial.filter(
      (item) => {
        const vehiculo =
          item?.vehiculo || {};

        const reclamo =
          item?.reclamo || {};

        const ingreso =
          item?.ingreso || {};

        const egreso =
          item?.egreso || {};

        const destino =
          egreso?.predioDestino
            ?.nombre || "";

        const valores = [
          vehiculo.numeroInterno,
          vehiculo.dominio,
          vehiculo.marca,
          vehiculo.modelo,
          vehiculo.color,

          reclamo.numeroReclamo,
          reclamo.direccion,

          ingreso.sector,
          ingreso.posicion,

          egreso.tipoEgreso,
          egreso.destinoPersona,
          egreso.dniPersona,

          destino,
        ];

        return valores.some(
          (valor) =>
            String(valor || "")
              .toLowerCase()
              .includes(texto)
        );
      }
    );
  }, [
    historial,
    buscar,
  ]);
  /*
  |--------------------------------------------------------------------------
  | ACTUALIZAR DESPUÉS DE INGRESO / EGRESO
  |--------------------------------------------------------------------------
  */

  const actualizar = async () => {
    setSeleccionado(null);

    await cargarVehiculos(
      predioSeleccionadoId
    );
  };

  /*
  |--------------------------------------------------------------------------
  | RECARGA MANUAL
  |--------------------------------------------------------------------------
  */

  const recargar = async () => {
    if (
      predioSeleccionadoId
    ) {
      await cargarVehiculos(
        predioSeleccionadoId
      );
    } else {
      await cargarPredios();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FICHA
  |--------------------------------------------------------------------------
  */

  if (seleccionado) {
    return (
      <div className="predio-page">
        <FichaPredioVehiculo
          item={seleccionado}
          onVolver={() =>
            setSeleccionado(null)
          }
          onActualizado={
            actualizar
          }
        />
      </div>
    );
  }

  return (
    <div className="predio-page">
      <header className="predio-header">
        <div>
          <span className="predio-eyebrow">
            CONTROL MUNICIPAL
          </span>

          <h1>
            Predio de vehículos
          </h1>

          <p>
            Control de vehículos
            pendientes de recepción y
            vehículos actualmente
            guardados.
          </p>
        </div>

        <button
          type="button"
          className="predio-recargar"
          onClick={recargar}
          disabled={cargando}
        >
          ↻ Actualizar
        </button>
      </header>

      {/* SELECTOR DE PREDIO */}

     {esSecretariaPredio ? (
  <section className="predio-selector">
    <div className="predio-selector-info">
      <strong>
        📍 Predio asignado
      </strong>

      <span>
        Lugar asignado para gestionar
        vehículos.
      </span>
    </div>

    <div className="predio-ubicacion-fija">
      {predioSeleccionado?.nombre ||
        "Predio asignado"}
    </div>
  </section>
) : (
  <section className="predio-selector">
    <div className="predio-selector-info">
      <strong>
        Predio / destino
      </strong>

      <span>
        Seleccione el lugar que desea
        consultar.
      </span>
    </div>

    <select
      value={predioSeleccionadoId}
      onChange={(event) => {
        setPredioSeleccionadoId(
          event.target.value
        );

        setBuscar("");
        setPaginaEnPredio(1);
        setPaginaHistorial(1);
      }}
      disabled={
        cargando ||
        !predios.length
      }
    >
      {puedeVerTodos && (
        <option value="TODOS">
          🌐 Todos los predios
        </option>
      )}

      {!predios.length && (
        <option value="">
          No hay predios
        </option>
      )}

      {predios.map((predio) => (
        <option
          key={predio.id}
          value={predio.id}
        >
          {predio.nombre}
        </option>
      ))}
    </select>
  </section>
)}

    {(predioSeleccionado ||
  viendoTodos) && (
  <div className="predio-actual">
    <span>
      Mostrando vehículos de
    </span>

    <strong>
      {viendoTodos
        ? "🌐 Todos los predios"
        : `📍 ${predioSeleccionado?.nombre}`}
    </strong>
  </div>
)}

      <section className="predio-resumen">
        <div className="predio-resumen-item">
          <span>
            En predio
          </span>

          <strong>
        {totalEnPredio}
          </strong>
        </div>

        <div className="predio-resumen-item pendiente">
          <span>
            Pendientes de ingreso
          </span>

          <strong>
            {pendientes.length}
          </strong>
        </div>
      </section>

      <section className="predio-herramientas">
        <div className="predio-buscador">
          <span>
            🔎
          </span>

          <input
            type="text"
            value={buscar}
           onChange={(event) => {
  setBuscar(
    event.target.value
  );

  setPaginaEnPredio(1);
  setPaginaHistorial(1);
}}
       placeholder="Buscar por Nº, patente, reclamo, acta, nombre o DNI..."
          />

          {buscar && (
            <button
              type="button"
            onClick={() => {
  setBuscar("");
  setPaginaEnPredio(1);
  setPaginaHistorial(1);
}}
            >
              ×
            </button>
          )}
        </div>
      </section>

      <nav className="predio-tabs">
        <button
          type="button"
          className={
            pestana ===
            "EN_PREDIO"
              ? "activo"
              : ""
          }
          onClick={() =>
            setPestana(
              "EN_PREDIO"
            )
          }
        >
          En predio

          <span>
          {totalEnPredio}
          </span>
        </button>

        <button
          type="button"
          className={
            pestana ===
            "PENDIENTES"
              ? "activo"
              : ""
          }
          onClick={() =>
            setPestana(
              "PENDIENTES"
            )
          }
        >
          Pendientes

          <span>
            {pendientes.length}
          </span>
        </button>

        <button
  type="button"
  className={
    pestana ===
    "HISTORIAL"
      ? "activo"
      : ""
  }
  onClick={() =>
    setPestana(
      "HISTORIAL"
    )
  }
>
  Historial

  <span>
   {totalHistorial}
  </span>
</button>
      </nav>

      {error && (
        <div className="predio-error">
          <strong>
            No se pudo cargar
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={recargar}
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && cargando && (
        <div className="predio-cargando">
          Cargando vehículos...
        </div>
      )}

      {!error &&
        !cargando &&
        pestana ===
          "PENDIENTES" && (
          <PendientesIngresoPredio
            items={
              pendientesFiltrados
            }
            onSeleccionar={
              setSeleccionado
            }
          />
        )}

      {!error &&
        !cargando &&
        pestana ===
          "EN_PREDIO" && (
         <>
  <VehiculosEnPredio
    items={enPredio}
    onSeleccionar={
      setSeleccionado
    }
  />

  {totalEnPredio > 0 && (
    <div className="predio-paginacion">
      <button
        type="button"
        disabled={
          paginaEnPredio <= 1
        }
        onClick={() =>
          setPaginaEnPredio(
            (pagina) =>
              pagina - 1
          )
        }
      >
        ← Anterior
      </button>

      <span>
        Página{" "}
        <strong>
          {paginaEnPredio}
        </strong>{" "}
        de{" "}
        <strong>
          {totalPaginasEnPredio}
        </strong>
      </span>

      <button
        type="button"
        disabled={
          paginaEnPredio >=
          totalPaginasEnPredio
        }
        onClick={() =>
          setPaginaEnPredio(
            (pagina) =>
              pagina + 1
          )
        }
      >
        Siguiente →
      </button>
    </div>
  )}
</>
        )}

   {!error &&
  !cargando &&
  pestana ===
    "HISTORIAL" && (
    <>
    
        <HistorialPredio
  items={historial}
/>

      {totalHistorial > 0 && (
        <div className="predio-paginacion">
          <button
            type="button"
            disabled={
              paginaHistorial <= 1
            }
            onClick={() =>
              setPaginaHistorial(
                (pagina) =>
                  pagina - 1
              )
            }
          >
            ← Anterior
          </button>

          <span>
            Página{" "}
            <strong>
              {paginaHistorial}
            </strong>{" "}
            de{" "}
            <strong>
              {totalPaginasHistorial}
            </strong>
          </span>

          <button
            type="button"
            disabled={
              paginaHistorial >=
              totalPaginasHistorial
            }
            onClick={() =>
              setPaginaHistorial(
                (pagina) =>
                  pagina + 1
              )
            }
          >
            Siguiente →
          </button>
        </div>
      )}
    </>
)}
    </div>
  );
};

export default PredioPage;