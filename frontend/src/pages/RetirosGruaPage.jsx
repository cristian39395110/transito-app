import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/api";

import {
  useAuth,
} from "../context/AuthContext";

import "./RetirosGruaPage.css";

/*
|--------------------------------------------------------------------------
| RETIROS GRÚA
|--------------------------------------------------------------------------
|
| Vehículos con Acta de Infracción que el inspector dejó
| marcados en la segunda visita como "Lo retira la grúa".
|
| Al tocar "Retirar vehículo" se abre la pantalla de remoción
| existente (inventario + fotos + destino). Al confirmar,
| el vehículo queda PENDIENTE DE INGRESO en el predio, igual
| que cuando lo retira el inspector.
|
*/

const formatearFecha = (
  valor
) => {
  if (!valor) {
    return "—";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "—";
  }

  return fecha.toLocaleString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const tiempoEsperando = (
  valor
) => {
  if (!valor) {
    return "";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "";
  }

  const minutos =
    Math.max(
      0,
      Math.floor(
        (Date.now() -
          fecha.getTime()) /
          60000
      )
    );

  if (minutos < 60) {
    return `Espera hace ${minutos} min`;
  }

  const horas =
    Math.floor(minutos / 60);

  if (horas < 24) {
    return `Espera hace ${horas} h`;
  }

  const dias =
    Math.floor(horas / 24);

  return dias === 1
    ? "Espera hace 1 día"
    : `Espera hace ${dias} días`;
};

const describirVehiculo = (
  vehiculo
) => {
  if (!vehiculo) {
    return "Vehículo";
  }

  const partes = [
    vehiculo.tipoVehiculo,
    vehiculo.marca,
    vehiculo.modelo,
    vehiculo.color,
  ].filter(Boolean);

  return (
    partes.join(" ") ||
    "Vehículo sin descripción"
  );
};

const linkMapa = (
  reclamo
) => {
  const lat =
    Number(
      reclamo?.latitudDenunciada
    );

  const lng =
    Number(
      reclamo?.longitudDenunciada
    );

  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const texto = [
    reclamo?.direccion,
    reclamo?.barrio,
  ]
    .filter(Boolean)
    .join(", ");

  if (!texto) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
};


const tiempoDesde = (
  valor
) => {
  const texto =
    tiempoEsperando(valor);

  return texto.replace(
    "Espera hace",
    "hace"
  );
};

const RetirosGruaPage = () => {
  const navigate =
    useNavigate();

  const {
    rol,
  } = useAuth();

  const puedeRetirar =
    [
      "grua",
      "administrador",
      "superadmin",
    ].includes(rol);

  /*
  | Solo la grúa (y el administrador) ven
  | las segundas visitas para tomar.
  */

  const veVisitas =
    [
      "grua",
      "administrador",
      "superadmin",
    ].includes(rol);

  const esGrua =
    rol === "grua";

  const [
    pestana,
    setPestana,
  ] = useState("retiros");

  const [
    retiros,
    setRetiros,
  ] = useState([]);

  const [
    visitas,
    setVisitas,
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
    tomando,
    setTomando,
  ] = useState(null);

  const mostrarRespuesta =
    useCallback(
      (pedido) =>
        pedido
          .then(
            ([
              respuestaRetiros,
              respuestaVisitas,
            ]) => {
              setError("");

              setRetiros(
                Array.isArray(
                  respuestaRetiros
                    ?.data?.retiros
                )
                  ? respuestaRetiros.data
                      .retiros
                  : []
              );

              setVisitas(
                Array.isArray(
                  respuestaVisitas
                    ?.data?.visitas
                )
                  ? respuestaVisitas.data
                      .visitas
                  : []
              );
            }
          )
          .catch((err) => {
            console.error(
              "Error cargando la bandeja de grúa:",
              err
            );

            setError(
              err.response?.data
                ?.mensaje ||
                "No se pudo cargar la bandeja de la grúa."
            );
          })
          .finally(() => {
            setCargando(false);
          }),
      []
    );

  const pedirTodo =
    useCallback(
      () =>
        Promise.all([
          api.get(
            "/grua/retiros"
          ),

          veVisitas
            ? api.get(
                "/grua/segundas-visitas"
              )
            : Promise.resolve(null),
        ]),
      [veVisitas]
    );

  const cargar = () => {
    setCargando(true);

    mostrarRespuesta(
      pedirTodo()
    );
  };

  useEffect(() => {
    mostrarRespuesta(
      pedirTodo()
    );
  }, [
    mostrarRespuesta,
    pedirTodo,
  ]);

  const retirar = (
    retiro
  ) => {
    navigate(
      `/remocion/${retiro.reclamo.id}?infraccionId=${retiro.infraccionId}`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | TOMAR UNA SEGUNDA VISITA
  |--------------------------------------------------------------------------
  */

  const tomarVisita =
    async (visita) => {
      const reclamoId =
        visita.reclamo.id;

      if (visita.esMia) {
        navigate(
          `/segunda-visita/${reclamoId}`
        );

        return;
      }

      const confirmar =
        window.confirm(
          visita.asignadoA?.nombre
            ? `Esta visita está asignada a ${visita.asignadoA.nombre}, que todavía no fue. Si la tomás vos, se le saca y le avisamos por email. ¿Tomarla?`
            : "¿Tomás esta segunda visita? Queda a tu nombre hasta que la termines."
        );

      if (!confirmar) {
        return;
      }

      try {
        setTomando(reclamoId);
        setError("");

        await api.post(
          `/grua/segundas-visitas/${reclamoId}/tomar`,
          {}
        );

        navigate(
          `/segunda-visita/${reclamoId}`
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.mensaje ||
            "No se pudo tomar la visita."
        );

        cargar();
      } finally {
        setTomando(null);
      }
    };

  const visitasDisponibles =
    visitas.filter(
      (item) =>
        item.puedeTomar ||
        item.esMia
    ).length;

  const lista =
    pestana === "visitas"
      ? visitas
      : retiros;

  return (
    <div className="retiros-grua-page">
      <header className="retiros-grua-header">
        <div>
          <span className="retiros-grua-eyebrow">
            GRÚA
          </span>

          <h1>
            {esGrua
              ? "Mi trabajo"
              : "Retiros de grúa"}
          </h1>

          <p>
            {pestana === "visitas"
              ? "Segundas visitas vencidas: tomá una, cargá el acta y llevate el auto."
              : "Vehículos con Acta de Infracción listos para llevar al predio."}
          </p>
        </div>

        <button
          type="button"
          className="boton-actualizar"
          onClick={cargar}
          disabled={cargando}
        >
          {cargando
            ? "Actualizando..."
            : "↻ Actualizar"}
        </button>
      </header>

      {/* PESTAÑAS */}

      {veVisitas && (
        <nav className="retiros-grua-pestanas">
          <button
            type="button"
            className={
              pestana === "retiros"
                ? "activa"
                : ""
            }
            onClick={() =>
              setPestana(
                "retiros"
              )
            }
          >
            🏗️ Para retirar
            <span>
              {retiros.length}
            </span>
          </button>

          <button
            type="button"
            className={
              pestana === "visitas"
                ? "activa"
                : ""
            }
            onClick={() =>
              setPestana(
                "visitas"
              )
            }
          >
            📋 Segundas visitas
            <span>
              {visitasDisponibles}
            </span>
          </button>
        </nav>
      )}

      {pestana === "retiros" ? (
        <ol className="retiros-grua-pasos">
          <li>
            <strong>1.</strong> Andá a la
            dirección (botón “Cómo llegar”).
          </li>
          <li>
            <strong>2.</strong> Tocá “Retirar
            vehículo”: fotos, inventario y
            predio de destino.
          </li>
          <li>
            <strong>3.</strong> Al confirmar, el
            predio lo ve como pendiente de
            ingreso.
          </li>
        </ol>
      ) : (
        <ol className="retiros-grua-pasos">
          <li>
            <strong>1.</strong> Tocá “Tomar
            visita” y andá a la dirección.
          </li>
          <li>
            <strong>2.</strong> Si ya no está,
            marcalo. Si sigue, cargá el Acta de
            Infracción.
          </li>
          <li>
            <strong>3.</strong> Te lo llevás, o si
            el dueño se opone queda esperando la
            orden del juez.
          </li>
        </ol>
      )}

      {error && (
        <div className="retiros-grua-mensaje error">
          {error}
        </div>
      )}

      {cargando &&
        !lista.length && (
          <div className="retiros-grua-mensaje">
            Cargando...
          </div>
        )}

      {!cargando &&
        !error &&
        !lista.length && (
          <div className="retiros-grua-mensaje">
            {pestana === "visitas"
              ? "No hay segundas visitas vencidas en este momento."
              : "No hay vehículos para retirar en este momento."}
          </div>
        )}

      {/* =====================================================
          PARA RETIRAR
      ===================================================== */}

      {pestana === "retiros" && (
        <section className="retiros-grua-listado">
          {retiros.map(
            (retiro) => {
              const {
                reclamo,
                vehiculo,
              } = retiro;

              const mapa =
                linkMapa(reclamo);

              return (
                <article
                  key={
                    retiro.infraccionId
                  }
                  className="retiro-grua-card"
                >
                  <div className="retiro-grua-principal">
                    <span className="retiro-grua-reclamo">
                      Reclamo N.º{" "}
                      {reclamo?.numeroReclamo ||
                        reclamo?.id}
                    </span>

                    <div className="retiro-grua-etiquetas">
                      {tiempoEsperando(
                        retiro.fechaActa
                      ) && (
                        <span className="retiro-grua-espera">
                          ⏱{" "}
                          {tiempoEsperando(
                            retiro.fechaActa
                          )}
                        </span>
                      )}

                      {retiro.conOrdenJudicial && (
                        <span className="retiro-grua-orden">
                          ⚖️ Con orden del juez
                        </span>
                      )}
                    </div>

                    <h2>
                      {describirVehiculo(
                        vehiculo
                      )}
                    </h2>

                    <div className="retiro-grua-datos">
                      <span>
                        <strong>
                          Dominio:
                        </strong>{" "}
                        {vehiculo?.dominio ||
                          "Sin dominio"}
                      </span>

                      {vehiculo?.numeroInterno && (
                        <span>
                          <strong>
                            N.º interno:
                          </strong>{" "}
                          {
                            vehiculo.numeroInterno
                          }
                        </span>
                      )}

                      <span>
                        <strong>
                          Acta N.º:
                        </strong>{" "}
                        {retiro.numeroActa ||
                          "—"}
                      </span>

                      <span>
                        <strong>
                          Fecha del acta:
                        </strong>{" "}
                        {formatearFecha(
                          retiro.fechaActa
                        )}
                      </span>

                      {retiro.inspector
                        ?.nombre && (
                        <span>
                          <strong>
                            Inspector:
                          </strong>{" "}
                          {
                            retiro
                              .inspector
                              .nombre
                          }
                        </span>
                      )}
                    </div>

                    <p className="retiro-grua-direccion">
                      📍{" "}
                      {reclamo?.direccion ||
                        retiro.lugar ||
                        "Sin dirección"}
                      {reclamo?.barrio
                        ? ` · ${reclamo.barrio}`
                        : ""}
                    </p>

                    {reclamo?.referencia && (
                      <p className="retiro-grua-nota">
                        <strong>
                          Referencia:
                        </strong>{" "}
                        {reclamo.referencia}
                      </p>
                    )}

                    {retiro.detalle && (
                      <p className="retiro-grua-nota">
                        <strong>
                          {retiro.conOrdenJudicial
                            ? "Observación del inspector:"
                            : "Indicaciones del inspector:"}
                        </strong>{" "}
                        {retiro.detalle}
                      </p>
                    )}
                  </div>

                  <div className="retiro-grua-acciones">
                    {puedeRetirar && (
                      <button
                        type="button"
                        className="boton-retirar"
                        onClick={() =>
                          retirar(retiro)
                        }
                      >
                        🏗️ Retirar vehículo
                      </button>
                    )}

                    {mapa && (
                      <a
                        href={mapa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="boton-mapa"
                      >
                        🗺️ Cómo llegar
                      </a>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}

      {/* =====================================================
          SEGUNDAS VISITAS
      ===================================================== */}

      {pestana === "visitas" && (
        <section className="retiros-grua-listado">
          {visitas.map(
            (visita) => {
              const {
                reclamo,
                vehiculos,
              } = visita;

              const mapa =
                linkMapa(reclamo);

              const primerVencimiento =
                vehiculos
                  .map(
                    (item) =>
                      item.venceEl
                  )
                  .filter(Boolean)
                  .sort()[0];

              return (
                <article
                  key={
                    reclamo.id
                  }
                  className={`retiro-grua-card visita-grua-card ${
                    visita.esMia
                      ? "mia"
                      : visita.enCurso
                        ? "bloqueada"
                        : ""
                  }`}
                >
                  <div className="retiro-grua-principal">
                    <span className="retiro-grua-reclamo">
                      Reclamo N.º{" "}
                      {reclamo.numeroReclamo ||
                        reclamo.id}
                    </span>

                    <div className="retiro-grua-etiquetas">
                      {primerVencimiento && (
                        <span className="retiro-grua-espera">
                          ⏱ Venció{" "}
                          {tiempoDesde(
                            primerVencimiento
                          )}
                        </span>
                      )}

                      {visita.esMia && (
                        <span className="visita-grua-estado mia">
                          ✋ La tomaste vos
                        </span>
                      )}

                      {!visita.esMia &&
                        visita.enCurso && (
                          <span className="visita-grua-estado bloqueada">
                            🔒{" "}
                            {visita.asignadoA
                              ?.nombre ||
                              "Otro"}{" "}
                            ya está en el lugar
                          </span>
                        )}

                      {!visita.esMia &&
                        !visita.enCurso &&
                        visita.asignadoA && (
                          <span className="visita-grua-estado asignada">
                            👤 Asignada a{" "}
                            {
                              visita.asignadoA
                                .nombre
                            }{" "}
                            (todavía no fue)
                          </span>
                        )}
                    </div>

                    <p className="retiro-grua-direccion">
                      📍{" "}
                      {reclamo.direccion ||
                        "Sin dirección"}
                      {reclamo.barrio
                        ? ` · ${reclamo.barrio}`
                        : ""}
                    </p>

                    <ul className="visita-grua-vehiculos">
                      {vehiculos.map(
                        (vehiculo) => (
                          <li
                            key={
                              vehiculo.id
                            }
                          >
                            🚗{" "}
                            <strong>
                              {vehiculo.dominio ||
                                "Sin dominio"}
                            </strong>{" "}
                            ·{" "}
                            {describirVehiculo(
                              vehiculo
                            )}
                          </li>
                        )
                      )}
                    </ul>

                    {reclamo.referencia && (
                      <p className="retiro-grua-nota">
                        <strong>
                          Referencia:
                        </strong>{" "}
                        {reclamo.referencia}
                      </p>
                    )}
                  </div>

                  <div className="retiro-grua-acciones">
                    {esGrua &&
                      (visita.esMia ||
                        visita.puedeTomar) && (
                        <button
                          type="button"
                          className="boton-retirar"
                          disabled={
                            tomando ===
                            reclamo.id
                          }
                          onClick={() =>
                            tomarVisita(
                              visita
                            )
                          }
                        >
                          {tomando ===
                          reclamo.id
                            ? "Tomando..."
                            : visita.esMia
                              ? "▶ Continuar visita"
                              : "✋ Tomar visita"}
                        </button>
                      )}

                    {mapa && (
                      <a
                        href={mapa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="boton-mapa"
                      >
                        🗺️ Cómo llegar
                      </a>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}
    </div>
  );
};

export default RetirosGruaPage;
