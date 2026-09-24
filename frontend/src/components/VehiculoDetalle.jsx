import VerificacionForm from "./VerificacionForm";
import InfraccionForm from "./InfraccionForm";
import InventarioVehiculoForm from "./InventarioVehiculoForm";

import "./VehiculoDetalle.css";

const estadosVehiculo = {
  EN_VIA_PUBLICA:
    "En vía pública",

  EMPLAZADO:
    "Emplazado",

  PENDIENTE_REMOCION:
    "Pendiente de remoción",

  REMOVIDO:
    "Removido",

  PENDIENTE_INGRESO_PREDIO:
    "Pendiente ingreso a predio",

  EN_PREDIO:
    "En predio",

  EGRESADO:
    "Egresado",
};

const VehiculoDetalle = ({
  reclamo,
  vehiculo,
  emplazamiento = null,
  verificacion = null,
  infraccion = null,
  inventario = null,
  onActualizado,
}) => {
  if (!vehiculo) {
    return null;
  }

  return (
    <div className="vehiculo-detalle">
      <div className="vehiculo-detalle-header">
        <div>
          <span>
            VEHÍCULO INTERNO
          </span>

          <h2>
            Nº{" "}
            {vehiculo.numeroInterno ||
              vehiculo.id}
          </h2>
        </div>

        <span className="vehiculo-detalle-estado">
          {estadosVehiculo[
            vehiculo.estadoActual
          ] ||
            vehiculo.estadoActual}
        </span>
      </div>

      <div className="vehiculo-detalle-grid">
        <div>
          <span>
            Dominio
          </span>

          <strong>
            {vehiculo.dominio ||
              "Sin dominio visible"}
          </strong>
        </div>

        <div>
          <span>
            Tipo
          </span>

          <strong>
            {vehiculo.tipoVehiculo ||
              "—"}
          </strong>
        </div>

        <div>
          <span>
            Marca
          </span>

          <strong>
            {vehiculo.marca ||
              "—"}
          </strong>
        </div>

        <div>
          <span>
            Modelo
          </span>

          <strong>
            {vehiculo.modelo ||
              "—"}
          </strong>
        </div>

        <div>
          <span>
            Color
          </span>

          <strong>
            {vehiculo.color ||
              "—"}
          </strong>
        </div>
      </div>

      {vehiculo.descripcion && (
        <div className="vehiculo-detalle-descripcion">
          <span>
            Descripción
          </span>

          <p>
            {vehiculo.descripcion}
          </p>
        </div>
      )}

      {emplazamiento && (
        <div className="vehiculo-etapa">
          <div className="vehiculo-etapa-titulo">
            <h3>
              Emplazamiento
            </h3>

            <span>
              {emplazamiento.estado}
            </span>
          </div>

          <p>
            Vencimiento:{" "}
            <strong>
              {new Date(
                emplazamiento.fechaVencimiento
              ).toLocaleString(
                "es-AR"
              )}
            </strong>
          </p>
        </div>
      )}

      {emplazamiento &&
        !verificacion && (
          <div className="vehiculo-etapa">
            <h3>
              Verificación
            </h3>

            <p className="vehiculo-ayuda">
              El inspector debe volver
              al lugar y comprobar si
              se cumplió el
              emplazamiento.
            </p>

            <VerificacionForm
              reclamo={reclamo}
              vehiculo={vehiculo}
              emplazamiento={
                emplazamiento
              }
              onGuardado={
                onActualizado
              }
            />
          </div>
        )}

      {verificacion && (
        <div className="vehiculo-etapa">
          <div className="vehiculo-etapa-titulo">
            <h3>
              Verificación realizada
            </h3>

            <span>
              {
                verificacion.resultado
              }
            </span>
          </div>

          <p>
            {verificacion.situacion}
          </p>
        </div>
      )}

      {verificacion?.resultado ===
        "NO_CUMPLIDO" &&
        !infraccion && (
          <div className="vehiculo-etapa">
            <h3>
              Infracción
            </h3>

            <p className="vehiculo-ayuda">
              Como el emplazamiento no
              fue cumplido, puede
              registrarse el acta de
              infracción.
            </p>

            <InfraccionForm
              reclamo={reclamo}
              vehiculo={vehiculo}
              verificacion={
                verificacion
              }
              onGuardado={
                onActualizado
              }
            />
          </div>
        )}

      {infraccion && (
        <div className="vehiculo-etapa">
          <div className="vehiculo-etapa-titulo">
            <h3>
              Infracción registrada
            </h3>

            <span>
              #
              {
                infraccion.numeroActa
              }
            </span>
          </div>

          <p>
            {infraccion.motivo}
          </p>
        </div>
      )}

      {infraccion &&
        !inventario && (
          <div className="vehiculo-etapa">
            <h3>
              Inventario previo a remoción
            </h3>

            <p className="vehiculo-ayuda">
              Antes de retirar el
              vehículo se deja
              constancia de su estado y
              de los elementos visibles.
            </p>

            <InventarioVehiculoForm
              reclamo={reclamo}
              vehiculo={vehiculo}
              onGuardado={
                onActualizado
              }
            />
          </div>
        )}

      {inventario && (
        <div className="vehiculo-etapa vehiculo-etapa-ok">
          <h3>
            Inventario realizado
          </h3>

          <p>
            El vehículo ya tiene
            inventario previo a la
            remoción.
          </p>
        </div>
      )}
    </div>
  );
};

export default VehiculoDetalle;