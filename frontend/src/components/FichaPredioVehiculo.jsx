import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/api";

import IngresoPredioForm from "./IngresoPredioForm";
import EgresoPredioForm from "./EgresoPredioForm";
import FotosReclamo from "./FotosReclamo";
import FotoUploader from "./FotoUploader";

import {
  useAuth,
} from "../context/AuthContext";

import "./FichaPredioVehiculo.css";

const FichaPredioVehiculo = ({
  item,
  onVolver,
  onActualizado,
}) => {
  const {
    rol,
  } = useAuth();

  const [seguimiento, setSeguimiento] =
    useState(null);

  const [
    cargandoSeguimiento,
    setCargandoSeguimiento,
  ] = useState(false);

  const [
    errorSeguimiento,
    setErrorSeguimiento,
  ] = useState("");

  const vehiculo =
    item?.vehiculo ||
    item?.Vehiculo ||
    item ||
    {};

  const reclamo =
    item?.reclamo ||
    item?.Reclamo ||
    vehiculo?.reclamo ||
    vehiculo?.Reclamo ||
    null;

  const remocionOriginal =
    item?.remocion ||
    item?.Remocion ||
    vehiculo?.remocion ||
    vehiculo?.Remocion ||
    null;

  const ingresoPredio =
    item?.ingresoPredio ||
    item?.IngresoPredio ||
    (
      item?.predioId &&
      item?.vehiculoId
        ? item
        : null
    );

  const predio =
    item?.predio ||
    item?.Predio ||
    ingresoPredio?.predio ||
    ingresoPredio?.Predio ||
    null;

  const esPendiente =
    !ingresoPredio;

  const puedeGestionarPredio =
    rol === "administrador" ||
    rol === "secretaria_predio";

  useEffect(() => {
    const cargarSeguimiento =
      async () => {
        if (!reclamo?.id) {
          return;
        }

        try {
          setCargandoSeguimiento(
            true
          );

          setErrorSeguimiento(
            ""
          );

          const respuesta =
            await api.get(
              `/seguimiento-reclamo/${reclamo.id}`
            );

          setSeguimiento(
            respuesta.data || null
          );
        } catch (error) {
          console.error(
            "Error cargando seguimiento para recepción:",
            error
          );

          setErrorSeguimiento(
            "No se pudo cargar el inventario realizado por el inspector."
          );
        } finally {
          setCargandoSeguimiento(
            false
          );
        }
      };

    cargarSeguimiento();
  }, [reclamo?.id]);

  const remocion =
    useMemo(() => {
      const remociones =
        seguimiento?.remociones ||
        [];

      if (
        remocionOriginal?.id
      ) {
        const encontrada =
          remociones.find(
            (actual) =>
              Number(actual.id) ===
              Number(
                remocionOriginal.id
              )
          );

        if (encontrada) {
          return {
            ...remocionOriginal,
            ...encontrada,
          };
        }
      }

      return (
        remocionOriginal ||
        remociones[0] ||
        null
      );
    }, [
      seguimiento,
      remocionOriginal,
    ]);

  const inventario =
    useMemo(() => {
      if (
        remocion?.inventario
      ) {
        return remocion.inventario;
      }

      if (
        remocion
          ?.InventarioVehiculo
      ) {
        return (
          remocion
            .InventarioVehiculo
        );
      }

      const inventarios =
        seguimiento?.inventarios ||
        [];

      if (
        remocion?.inventarioId
      ) {
        const encontrado =
          inventarios.find(
            (actual) =>
              Number(actual.id) ===
              Number(
                remocion
                  .inventarioId
              )
          );

        if (encontrado) {
          return encontrado;
        }
      }

      const porVehiculo =
        inventarios.find(
          (actual) =>
            Number(
              actual.vehiculoId
            ) ===
            Number(
              vehiculo.id
            )
        );

      return (
        porVehiculo ||
        null
      );
    }, [
      remocion,
      seguimiento,
      vehiculo.id,
    ]);

  const itemsInventario =
    useMemo(
      () =>
        convertirInventario(
          inventario?.detalle
        ),
      [inventario]
    );

  return (
    <div className="ficha-predio">
      <button
        type="button"
        className="ficha-volver"
        onClick={onVolver}
      >
        ← Volver al predio
      </button>

      <section className="ficha-cabecera">
        <div className="ficha-identificacion">
          <span>
            VEHÍCULO INTERNO
          </span>

          <h1>
            Nº{" "}
            {vehiculo.numeroInterno ||
              vehiculo.id}
          </h1>

          <strong>
            {vehiculo.dominio ||
              "SIN DOMINIO VISIBLE"}
          </strong>
        </div>

        <div className="ficha-datos">
          <Dato
            titulo="Marca / modelo"
            valor={
              [
                vehiculo.marca,
                vehiculo.modelo,
              ]
                .filter(Boolean)
                .join(" ") ||
              "—"
            }
          />

          <Dato
            titulo="Color"
            valor={
              vehiculo.color ||
              "—"
            }
          />

          <Dato
            titulo="Reclamo"
            valor={
              reclamo?.numeroReclamo
                ? `#${reclamo.numeroReclamo}`
                : "—"
            }
          />

          <Dato
            titulo="Estado"
            valor={formatearEstado(
              vehiculo.estadoActual
            )}
          />

          {remocion?.destino && (
            <Dato
              titulo="Destino"
              valor={
                remocion.destino
              }
            />
          )}

          {ingresoPredio && (
            <>
              <Dato
                titulo="Predio"
                valor={
                  predio?.nombre ||
                  "—"
                }
              />

              <Dato
                titulo="Sector"
                valor={
                  ingresoPredio.sector ||
                  "—"
                }
              />

              <Dato
                titulo="Nº / Precinto"
                valor={
                  ingresoPredio.posicion ||
                  "—"
                }
              />
            </>
          )}
        </div>
      </section>

      {esPendiente && (
        <div className="ficha-aviso-pendiente">
          <span>
            🚛
          </span>

          <div>
           <strong>
  En traslado hacia{" "}
  {remocion?.destino ||
    "el predio"}
</strong>

<p>
  El inspector ya registró la
  remoción. El vehículo todavía
  no fue recibido oficialmente
  en el predio.
</p>
          </div>
        </div>
      )}

      <section className="ficha-evidencia">
        <div className="ficha-seccion-titulo">
          <div>
            <span>
              EVIDENCIA DEL PREDIO
            </span>

            <h2>
             Fotos del vehículo en el predio
            </h2>
          </div>

       <div className="ficha-evidencia-badge">
  Máximo 1 foto
</div>
        </div>

    <p className="ficha-ayuda">
  Estas fotografías muestran el estado
  del vehículo dentro del predio municipal.
</p>

{/* FOTO TOMADA POR EL INSPECTOR DURANTE LA REMOCIÓN */}
{reclamo?.id && remocion?.id && (
  <>
    <div className="ficha-seccion-titulo">
      <div>
        <span>
          EVIDENCIA DE LA REMOCIÓN
        </span>

        <h2>
          Foto al momento del retiro
        </h2>
      </div>
    </div>

    <p className="ficha-ayuda">
      Fotografía tomada por el inspector
      cuando el vehículo fue retirado.
    </p>

 <FotosReclamo
  reclamoId={reclamo.id}
  tipoReferencia="REMOCION"
  permitirSubir={false}
  maxFotos={1}
/>
  </>
)}


{/* FOTO TOMADA CUANDO EL VEHÍCULO LLEGA AL PREDIO */}
{reclamo?.id && ingresoPredio?.id ? (
  <>
    <div className="ficha-seccion-titulo">
      <div>
        <span>
          EVIDENCIA DEL PREDIO
        </span>

        <h2>
          Foto al recibir el vehículo
        </h2>
      </div>
    </div>

    <FotosReclamo
      reclamoId={reclamo.id}
      tipoReferencia="INGRESO_PREDIO"
      referenciaId={ingresoPredio.id}
      permitirSubir={puedeGestionarPredio}
      maxFotos={1}
    />
  </>
) : (
  <div className="ficha-sin-datos">
    El vehículo todavía no fue ingresado al predio.
  </div>
)}
      </section>

      <section className="ficha-inventario">
        <div className="ficha-seccion-titulo">
          <div>
            <span>
              INVENTARIO DEL INSPECTOR
            </span>

            <h2>
              Estado al momento del retiro
            </h2>
          </div>
        </div>

        <p className="ficha-ayuda">
          Revisá especialmente los elementos
          marcados como presentes, faltantes
          o dañados antes de confirmar la
          recepción.
        </p>

        {cargandoSeguimiento && (
          <div className="ficha-sin-datos">
            Cargando inventario...
          </div>
        )}

        {!cargandoSeguimiento &&
          errorSeguimiento && (
          <div className="ficha-error">
            {errorSeguimiento}
          </div>
        )}

        {!cargandoSeguimiento &&
          !errorSeguimiento &&
          inventario && (
          <>
            {itemsInventario.length >
            0 ? (
              <div className="inventario-recepcion-lista">
                {itemsInventario.map(
                  (
                    inventarioItem,
                    index
                  ) => (
                    <InventarioItem
                      key={`${inventarioItem.clave}-${index}`}
                      item={
                        inventarioItem
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="ficha-sin-datos">
                El inventario está
                registrado, pero no tiene
                elementos para mostrar.
              </div>
            )}

            {inventario.observaciones && (
              <div className="inventario-recepcion-observaciones">
                <span>
                  Observaciones del inspector
                </span>

                <p>
                  {
                    inventario
                      .observaciones
                  }
                </p>
              </div>
            )}
          </>
        )}

        {!cargandoSeguimiento &&
          !errorSeguimiento &&
          !inventario && (
          <div className="ficha-sin-datos">
            No se encontró un inventario
            asociado a esta remoción.
          </div>
        )}
      </section>

      <section className="ficha-gestion">
        {esPendiente ? (
          puedeGestionarPredio ? (
            <>
              <div className="ficha-seccion-titulo">
                <div>
                  <span>
                    RECEPCIÓN DEL VEHÍCULO
                  </span>

                  <h2>
                    Registrar ingreso
                  </h2>
                </div>
              </div>

              <p className="ficha-ayuda">
                Después de revisar las
                fotos y el inventario,
                indicá si el vehículo llegó
                en las mismas condiciones.
              </p>

              {reclamo ? (
  <IngresoPredioForm
    reclamo={reclamo}
    vehiculo={vehiculo}
    remocion={remocion}
    predio={predio}
    onGuardado={
      onActualizado
    }
  />
) : (
  <div className="ficha-error">
    No se pudo determinar el
    reclamo asociado al vehículo.
  </div>
)}
            </>
          ) : (
            <SoloLecturaPendiente
              remocion={remocion}
            />
          )
        ) : puedeGestionarPredio ? (
          <>
            <div className="ficha-seccion-titulo">
              <div>
                <span>
                  MOVIMIENTO DEL VEHÍCULO
                </span>

                <h2>
                  Salida / entrega del vehículo
                </h2>
              </div>
            </div>

            {reclamo ? (
              <EgresoPredioForm
                reclamo={reclamo}
                vehiculo={vehiculo}
                ingresoPredio={
                  ingresoPredio
                }
                onGuardado={
                  onActualizado
                }
              />
            ) : (
              <div className="ficha-error">
                No se pudo determinar el
                reclamo asociado.
              </div>
            )}
          </>
        ) : (
          <SoloLecturaEnPredio
            ingresoPredio={
              ingresoPredio
            }
            predio={predio}
          />
        )}
      </section>
    </div>
  );
};

const Dato = ({
  titulo,
  valor,
}) => (
  <div className="ficha-dato">
    <span>
      {titulo}
    </span>

    <strong>
      {valor}
    </strong>
  </div>
);

const InventarioItem = ({
  item,
}) => {
  const valor =
    String(
      item.valor ?? ""
    )
      .trim()
      .toUpperCase();

  let clase =
    "normal";

  let texto =
    textoValorInventario(
      item.valor
    );

  if (
    valor === "PRESENTE" ||
    valor === "BUENO" ||
    item.valor === true ||
    item.valor === "true"
  ) {
    clase = "presente";
  }

  if (
    valor === "FALTANTE" ||
    valor === "MALO" ||
    item.valor === false ||
    item.valor === "false"
  ) {
    clase = "faltante";
  }

  if (
    valor === "DAÑADO" ||
    valor === "DANADO" ||
    valor === "REGULAR"
  ) {
    clase = "danado";
  }

  return (
    <div
      className={`inventario-recepcion-item ${clase}`}
    >
      <div className="inventario-recepcion-icono">
        {clase ===
        "presente"
          ? "✓"
          : clase ===
              "faltante"
            ? "✕"
            : clase ===
                "danado"
              ? "!"
              : "•"}
      </div>

      <div className="inventario-recepcion-contenido">
        <strong>
          {item.clave}
        </strong>

        <span>
          {texto}
        </span>
      </div>
    </div>
  );
};

const SoloLecturaPendiente = ({
  remocion,
}) => (
  <div className="ficha-solo-lectura">
    <span>
      ESTADO DEL VEHÍCULO
    </span>

    <h2>
      Pendiente de recepción
    </h2>

    <p>
      El personal del predio todavía
      no confirmó el ingreso.
    </p>

    {remocion?.destino && (
      <div>
        <small>
          DESTINO INFORMADO
        </small>

        <strong>
          {remocion.destino}
        </strong>
      </div>
    )}
  </div>
);

const SoloLecturaEnPredio = ({
  ingresoPredio,
  predio,
}) => (
  <div className="ficha-solo-lectura">
    <span>
      UBICACIÓN ACTUAL
    </span>

    <h2>
      Vehículo en predio
    </h2>

    <p>
      El vehículo fue recibido
      correctamente.
    </p>

    <div className="ficha-datos">
      <Dato
        titulo="Predio"
        valor={
          predio?.nombre ||
          "—"
        }
      />

      <Dato
        titulo="Sector"
        valor={
          ingresoPredio?.sector ||
          "—"
        }
      />

      <Dato
        titulo="Nº / Posición"
        valor={
          ingresoPredio?.posicion ||
          "—"
        }
      />
    </div>
  </div>
);

const convertirInventario = (
  detalle
) => {
  if (
    detalle === null ||
    detalle === undefined ||
    detalle === ""
  ) {
    return [];
  }

  let procesado =
    detalle;

  for (
    let intento = 0;
    intento < 2;
    intento += 1
  ) {
    if (
      typeof procesado !==
      "string"
    ) {
      break;
    }

    const texto =
      procesado.trim();

    const pareceJson =
      (
        texto.startsWith("{") &&
        texto.endsWith("}")
      ) ||
      (
        texto.startsWith("[") &&
        texto.endsWith("]")
      );

    if (!pareceJson) {
      break;
    }

    try {
      procesado =
        JSON.parse(texto);
    } catch {
      break;
    }
  }

  if (
    Array.isArray(procesado)
  ) {
    return procesado.map(
      (valor, index) => ({
        clave:
          `Ítem ${index + 1}`,
        valor,
      })
    );
  }

  if (
    typeof procesado !==
      "object" ||
    procesado === null
  ) {
    return [
      {
        clave: "Detalle",
        valor: procesado,
      },
    ];
  }

  const resultado = [];

  const recorrer = (
    objeto,
    prefijo = ""
  ) => {
    Object.entries(
      objeto
    ).forEach(
      ([clave, valor]) => {
        const nombreClave =
          formatearClave(
            clave
          );

        const nombre =
          prefijo
            ? `${prefijo} · ${nombreClave}`
            : nombreClave;

        if (
          valor &&
          typeof valor ===
            "object" &&
          !Array.isArray(
            valor
          )
        ) {
          recorrer(
            valor,
            nombre
          );

          return;
        }

        resultado.push({
          clave: nombre,
          valor,
        });
      }
    );
  };

  recorrer(procesado);

  return resultado;
};

const formatearClave = (
  clave
) =>
  String(clave || "")
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letra) =>
        letra.toUpperCase()
    );

const textoValorInventario = (
  valor
) => {
  if (
    valor === true ||
    valor === "true"
  ) {
    return "PRESENTE";
  }

  if (
    valor === false ||
    valor === "false"
  ) {
    return "FALTANTE";
  }

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  if (Array.isArray(valor)) {
    return valor.join(", ");
  }

  const texto =
    String(valor)
      .trim()
      .toUpperCase();

  switch (texto) {
    case "PRESENTE":
      return "PRESENTE";

    case "FALTANTE":
      return "FALTANTE";

    case "DAÑADO":
    case "DANADO":
      return "DAÑADO";

    case "BUENO":
      return "BUENO";

    case "REGULAR":
      return "REGULAR";

    case "MALO":
      return "MALO";

    default:
      return String(valor);
  }
};

const formatearEstado = (
  estado
) => {
  const nombres = {
    EN_VIA_PUBLICA:
      "En vía pública",

    EMPLAZADO:
      "Emplazado",

    PENDIENTE_REMOCION:
      "Pendiente de remoción",

    REMOVIDO:
      "Removido",

    PENDIENTE_INGRESO_PREDIO:
      "Pendiente de ingreso",

    EN_PREDIO:
      "En predio",

    EGRESADO:
      "Entregado / egresado",
  };

  return (
    nombres[estado] ||
    estado ||
    "—"
  );
};

export default FichaPredioVehiculo;