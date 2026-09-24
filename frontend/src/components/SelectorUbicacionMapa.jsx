import {
  useEffect,
} from "react";

import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import "./SelectorUbicacionMapa.css";

const CENTRO_SAN_LUIS = [
  -33.295,
  -66.3356,
];

const iconoUbicacion =
  L.divIcon({
    className:
      "selector-mapa-icono-contenedor",

    html: `
      <div class="selector-mapa-icono">
        <span></span>
      </div>
    `,

    iconSize: [30, 38],
    iconAnchor: [15, 36],
  });

const SelectorMapaEventos = ({
  onCambiar,
}) => {
  useMapEvents({
    click(event) {
      onCambiar({
        latitud:
          event.latlng.lat,

        longitud:
          event.latlng.lng,
      });
    },
  });

  return null;
};

const CentrarMapa = ({
  latitud,
  longitud,
}) => {
  const mapa = useMap();

  useEffect(() => {
    if (
      Number.isFinite(latitud) &&
      Number.isFinite(longitud)
    ) {
      mapa.flyTo(
        [
          latitud,
          longitud,
        ],
        Math.max(
          mapa.getZoom(),
          16
        )
      );
    }
  }, [
    mapa,
    latitud,
    longitud,
  ]);

  return null;
};

const SelectorUbicacionMapa = ({
  latitud = null,
  longitud = null,
  onCambiar,
}) => {
  const tieneUbicacion =
    Number.isFinite(latitud) &&
    Number.isFinite(longitud);

  const centro =
    tieneUbicacion
      ? [latitud, longitud]
      : CENTRO_SAN_LUIS;

  return (
    <div className="selector-mapa">
      <div className="selector-mapa-ayuda">
        Tocá el lugar exacto del
        reclamo en el mapa.
      </div>

      <MapContainer
        center={centro}
        zoom={
          tieneUbicacion
            ? 16
            : 13
        }
        scrollWheelZoom
        className="selector-mapa-contenedor"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SelectorMapaEventos
          onCambiar={onCambiar}
        />

        <CentrarMapa
          latitud={latitud}
          longitud={longitud}
        />

        {tieneUbicacion && (
          <Marker
            position={[
              latitud,
              longitud,
            ]}
            icon={
              iconoUbicacion
            }
          />
        )}
      </MapContainer>

      {tieneUbicacion && (
        <div className="selector-mapa-confirmacion">
          📍 Punto seleccionado
        </div>
      )}
    </div>
  );
};

export default SelectorUbicacionMapa;