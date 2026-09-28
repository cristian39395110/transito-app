import {
  Fragment,
} from "react";

const VehiculosEnPredio = ({
  items,
  onSeleccionar,
}) => {
  if (!items.length) {
    return (
      <div className="predio-mensaje">
        No hay vehículos actualmente
        registrados dentro del predio.
      </div>
    );
  }

  const obtenerVehiculo = (item) =>
    item?.vehiculo ||
    item?.Vehiculo ||
    item ||
    {};

  const obtenerIngreso = (item) =>
    item?.ingresoPredio ||
    item?.IngresoPredio ||
    item ||
    {};

  const formatearFecha = (fecha) => {
    if (!fecha) return "—";

    return new Date(
      fecha
    ).toLocaleDateString(
      "es-AR"
    );
  };

  return (
    <div className="predio-tabla-contenedor">
      <table className="predio-tabla">
        <thead>
          <tr>
            <th>N.º</th>
            <th>Patente</th>
            <th>Vehículo</th>
            <th>Color</th>
            <th>Sector</th>
            <th>Precinto</th>
            <th>Ingreso</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const vehiculo =
              obtenerVehiculo(item);

            const ingreso =
              obtenerIngreso(item);

            const coincidencias =
              item?.coincidenciasBusqueda ||
              ingreso?.coincidenciasBusqueda ||
              [];

            const key =
              ingreso?.id ||
              item?.ingresoPredioId ||
              item?.id ||
              vehiculo?.id;

            return (
              <Fragment key={key}>
                <tr>
                  <td>
                    <strong>
                      {vehiculo.numeroInterno ||
                        vehiculo.id ||
                        "—"}
                    </strong>
                  </td>

                  <td>
                    <strong>
                      {vehiculo.dominio ||
                        "Sin patente"}
                    </strong>
                  </td>

                  <td>
                    {[
                      vehiculo.marca,
                      vehiculo.modelo,
                    ]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </td>

                  <td>
                    {vehiculo.color ||
                      "—"}
                  </td>

                  <td>
                    {ingreso.sector ||
                      "—"}
                  </td>

                  <td>
                    {ingreso.posicion ||
                      "—"}
                  </td>

                  <td>
                    {formatearFecha(
                      ingreso.fechaHora ||
                        ingreso.createdAt
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="predio-tabla-ver"
                      onClick={() =>
                        onSeleccionar(
                          item
                        )
                      }
                    >
                      Ver ficha
                    </button>
                  </td>
                </tr>

                {coincidencias.length >
                  0 && (
                  <tr className="predio-fila-coincidencia">
                    <td colSpan="8">
                      <div className="predio-coincidencias">
                        <strong className="predio-coincidencias-titulo">
                          🔎 Coincidencia
                          encontrada:
                        </strong>

                        <div className="predio-coincidencias-lista">
                          {coincidencias.map(
                            (
                              coincidencia,
                              index
                            ) => (
                              <span
                                className="predio-coincidencia"
                                key={`${coincidencia.tipo}-${coincidencia.valor}-${index}`}
                              >
                                {
                                  coincidencia.etiqueta
                                }
                                :{" "}
                                <strong>
                                  {
                                    coincidencia.valor
                                  }
                                </strong>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VehiculosEnPredio;