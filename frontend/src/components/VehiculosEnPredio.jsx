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

    return new Date(fecha).toLocaleDateString(
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

            return (
              <tr
                key={
                  ingreso?.id ||
                  item?.ingresoPredioId ||
                  item?.id ||
                  vehiculo?.id
                }
              >
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
                  {vehiculo.color || "—"}
                </td>

                <td>
                  {ingreso.sector || "—"}
                </td>

                <td>
                  {ingreso.posicion || "—"}
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
                      onSeleccionar(item)
                    }
                  >
                    Ver ficha
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VehiculosEnPredio;