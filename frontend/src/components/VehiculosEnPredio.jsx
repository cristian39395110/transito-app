import VehiculoPredioCard from "./VehiculoPredioCard";

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
          item?.vehiculo ||
          item?.Vehiculo ||
          item ||
          {};

        const ingreso =
          item?.ingresoPredio ||
          item?.IngresoPredio ||
          item ||
          {};

        return (
          <VehiculoPredioCard
            key={
              ingreso?.id ||
              item?.ingresoPredioId ||
              vehiculo?.id
            }
            item={item}
            tipo="EN_PREDIO"
            onAbrir={() =>
              onSeleccionar(item)
            }
          />
        );
      })}
    </div>
  );
};

export default VehiculosEnPredio;