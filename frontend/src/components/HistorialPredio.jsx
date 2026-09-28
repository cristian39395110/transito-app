const HistorialPredio = ({
  items,
}) => {
  if (!items?.length) {
    return (
      <div className="predio-mensaje">
        No hay movimientos registrados
        en el predio.
      </div>
    );
  }

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "—";
    }

    return new Date(
      fecha
    ).toLocaleString(
      "es-AR"
    );
  };

  const obtenerSalida = (
    egreso
  ) => {
    if (!egreso) {
      return "En predio";
    }

    if (
      egreso.tipoEgreso ===
      "ENTREGADO"
    ) {
      return egreso.destinoPersona
        ? `Entregado a ${egreso.destinoPersona}`
        : "Entregado";
    }

    if (
      egreso.tipoEgreso ===
      "TRASLADADO"
    ) {
      return egreso
        ?.predioDestino
        ?.nombre
        ? `Trasladado a ${egreso.predioDestino.nombre}`
        : "Trasladado";
    }

    if (
      egreso.tipoEgreso ===
      "COMPACTADO"
    ) {
      return "Compactado";
    }

    if (
      egreso.tipoEgreso ===
      "OTRO"
    ) {
      return "Otra salida";
    }

    return (
      egreso.tipoEgreso ||
      "—"
    );
  };

  return (
    <div
      className="historial-predio-grid"
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "12px",
      }}
    >
      {items.map(
        (item, index) => {
          const vehiculo =
            item?.vehiculo ||
            {};

          const reclamo =
            item?.reclamo ||
            {};

          const ingreso =
            item?.ingreso ||
            {};

          const egreso =
            item?.egreso ||
            null;

          const predio =
            item?.predio ||
            ingreso?.predio ||
            ingreso?.Predio ||
            {};

          const salida =
            obtenerSalida(
              egreso
            );

          const key =
            ingreso?.id ||
            egreso?.id ||
            vehiculo?.id ||
            index;

          return (
            <article
              className="vehiculo-predio-card"
              key={key}
            >
              <div className="vpc-header">
                <div>
                  <small>
                    VEHÍCULO INTERNO
                  </small>

                  <strong>
                    Nº{" "}
                    {vehiculo
                      .numeroInterno ||
                      vehiculo.id ||
                      "—"}
                  </strong>
                </div>

                <span className="vpc-estado ingresado">
                  Historial
                </span>
              </div>

              <div className="vpc-dominio">
                {vehiculo.dominio ||
                  "SIN DOMINIO"}
              </div>

              <div className="vpc-datos">
                <div>
                  <span>
                    Vehículo
                  </span>

                  <strong>
                    {[
                      vehiculo.marca,
                      vehiculo.modelo,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(" ") ||
                      "Sin especificar"}
                  </strong>
                </div>

                <div>
                  <span>
                    📍 Predio
                  </span>

                  <strong>
                    {predio?.nombre ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Reclamo
                  </span>

                  <strong>
                    {reclamo
                      ?.numeroReclamo
                      ? `#${reclamo.numeroReclamo}`
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    N° Precinto
                  </span>

                  <strong>
                    {[
                      ingreso.sector,
                      ingreso.posicion,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(" / ") ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Fecha de ingreso
                  </span>

                  <strong>
                    {formatearFecha(
                      ingreso.fechaHora
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Estado Actual
                  </span>

                  <strong>
                    {salida}
                  </strong>
                </div>

                {egreso
                  ?.dniPersona && (
                  <div>
                    <span>
                      DNI
                    </span>

                    <strong>
                      {
                        egreso.dniPersona
                      }
                    </strong>
                  </div>
                )}

                <div>
                  <span>
                    Fecha de salida
                  </span>

                  <strong>
                    {formatearFecha(
                      egreso?.fechaHora
                    )}
                  </strong>
                </div>
              </div>
            </article>
          );
        }
      )}
    </div>
  );
};

export default HistorialPredio;