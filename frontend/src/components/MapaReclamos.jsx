import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import L from "leaflet";

import PopupReclamoMapa from "./PopupReclamoMapa";

import {
  obtenerColorEstado,
} from "../utils/estadoReclamoMapa";

import "./MapaReclamos.css";

const crearIcono = (
  estado
) => {
  const color =
    obtenerColorEstado(estado);

  return L.divIcon({
    className:
      "marcador-reclamo-wrapper",

    html: `
      <div
        class="marcador-reclamo"
        style="
          background:${color};
        "
      ></div>
    `,

    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
};

const MapaReclamos = ({
  reclamos,
}) => {
  const centroDefault = [
    -33.29501,
    -66.33563,
  ];

  const primerReclamo =
    reclamos[0];

  const centro =
    primerReclamo
      ? [
          Number(
            primerReclamo.latitudDenunciada
          ),
          Number(
            primerReclamo.longitudDenunciada
          ),
        ]
      : centroDefault;

  return (
    <div className="mapa-reclamos-contenedor">
      <MapContainer
        center={centro}
        zoom={13}
        scrollWheelZoom
        className="mapa-reclamos-leaflet"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reclamos.map(
          (reclamo) => (
            <Marker
              key={reclamo.id}
              position={[
                Number(
                  reclamo.latitudDenunciada
                ),
                Number(
                  reclamo.longitudDenunciada
                ),
              ]}
              icon={crearIcono(
                reclamo.estado
              )}
            >
              <Popup>
                <PopupReclamoMapa
                  reclamo={reclamo}
                />
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
};

export default MapaReclamos;