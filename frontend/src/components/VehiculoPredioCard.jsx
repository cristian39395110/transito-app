import "./VehiculoPredioCard.css";

const VehiculoPredioCard = ({
  item,
  tipo,
  onAbrir,
}) => {
  const vehiculo =
    item.vehiculo ||
    item.Vehiculo ||
    item;

  const reclamo =
    item.reclamo ||
    item.Reclamo ||
    vehiculo.reclamo ||
    vehiculo.Reclamo;

  const predio =
    item.predio ||
    item.Predio;

  return (
    <article
      className="vehiculo-predio-card"
      onClick={onAbrir}
    >
      <div className="vpc-header">
        <div>
          <small>
            VEHÍCULO INTERNO
          </small>

          <strong>
            Nº{" "}
            {vehiculo.numeroInterno ||
              vehiculo.id}
          </strong>
        </div>

        <span
          className={`vpc-estado ${
            tipo === "PENDIENTE"
              ? "pendiente"
              : "ingresado"
          }`}
        >
          {tipo === "PENDIENTE"
            ? "Pendiente ingreso"
            : "En predio"}
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
              .filter(Boolean)
              .join(" ") ||
              "Sin especificar"}
          </strong>
        </div>

        <div>
          <span>
            Reclamo externo
          </span>

          <strong>
            {reclamo?.numeroReclamo
              ? `#${reclamo.numeroReclamo}`
              : "—"}
          </strong>
        </div>

        {tipo !== "PENDIENTE" && (
          <>
            <div>
              <span>
                Predio
              </span>

              <strong>
                {predio?.nombre ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Ubicación
              </span>

              <strong>
                {[
                  item.sector,
                  item.posicion,
                ]
                  .filter(Boolean)
                  .join(" / ") ||
                  "—"}
              </strong>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();

          onAbrir();
        }}
      >
        {tipo === "PENDIENTE"
          ? "Registrar ingreso →"
          : "Ver ficha →"}
      </button>
    </article>
  );
};

export default VehiculoPredioCard;