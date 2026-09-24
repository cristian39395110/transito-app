import VehiculoPredioCard from "./VehiculoPredioCard";

const PendientesIngresoPredio = ({
  items,
  onSeleccionar,
}) => {
  if (!items.length) {
    return (
      <div className="predio-mensaje">
        No hay vehículos pendientes de
        ingreso al predio.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "12px",
      }}
    >
      {items.map((item) => {
        const vehiculo =
          item.vehiculo ||
          item.Vehiculo ||
          item;

        return (
          <VehiculoPredioCard
            key={
              item.remocionId ||
              item.id ||
              vehiculo.id
            }
            item={item}
            tipo="PENDIENTE"
            onAbrir={() =>
              onSeleccionar(item)
            }
          />
        );
      })}
    </div>
  );
};

export default PendientesIngresoPredio;