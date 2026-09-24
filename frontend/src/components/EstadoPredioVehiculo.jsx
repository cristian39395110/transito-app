import RemocionForm from "./RemocionForm";
import IngresoPredioForm from "./IngresoPredioForm";
import EgresoPredioForm from "./EgresoPredioForm";

const EstadoPredioVehiculo = ({
  reclamo,
  vehiculo,
  infraccion = null,
  inventario = null,
  remocion = null,
  ingresoPredio = null,
  egresoPredio = null,
  onActualizado,
}) => {
  if (!vehiculo) {
    return null;
  }

  if (egresoPredio) {
    return (
      <div
        style={{
          padding: "16px",
          border:
            "1px solid #a7f3d0",
          borderRadius: "10px",
          background: "#ecfdf5",
        }}
      >
        <strong>
          Vehículo egresado
        </strong>

        <p
          style={{
            margin:
              "5px 0 0",
            fontSize: "12px",
            color: "#047857",
          }}
        >
          El vehículo Nº{" "}
          {vehiculo.numeroInterno ||
            vehiculo.id}{" "}
          ya salió del predio.
        </p>
      </div>
    );
  }

  if (ingresoPredio) {
    return (
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
    );
  }

  if (remocion) {
    return (
      <IngresoPredioForm
        reclamo={reclamo}
        vehiculo={vehiculo}
        remocion={remocion}
        onGuardado={
          onActualizado
        }
      />
    );
  }

  if (inventario) {
    return (
      <RemocionForm
        reclamo={reclamo}
        vehiculo={vehiculo}
        infraccion={
          infraccion
        }
        inventario={
          inventario
        }
        onGuardado={
          onActualizado
        }
      />
    );
  }

  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "9px",
        background: "#f9fafb",
        color: "#6b7280",
        fontSize: "12px",
      }}
    >
      El vehículo todavía no está listo
      para remoción. Primero debe
      completarse la actuación
      correspondiente y el inventario.
    </div>
  );
};

export default EstadoPredioVehiculo;