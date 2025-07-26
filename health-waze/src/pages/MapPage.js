import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define your status‐to‐icon mapping
const STATUS_ICON_URLS = {
  empty: '/icons/marker-green.png',
  partial: '/icons/marker-yellow.png',
  full: '/icons/marker-red.png',
};

function getStatusIcon(status) {
  return new L.Icon({
    iconUrl: STATUS_ICON_URLS[status] || STATUS_ICON_URLS.empty,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35],
    shadowUrl: '/icons/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });
}

// Optional: keep map view in sync if mapCenter changes
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function HealthMap({
  healthCenters,
  recommendedCenters,
  userLocation,
  mapCenter
}) {
  const mapRef = useRef();

  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter center={mapCenter} />

      {/* Render all centers with dynamic icon based on status */}
      {healthCenters.map(center => (
        <Marker
          key={`${center.id}-${center.status}`}
          position={[center.lat, center.lng]}
          icon={getStatusIcon(center.status)}
        >
          <Popup>
            <strong>{center.name}</strong>
            <br />
            Status: {center.status}
          </Popup>
        </Marker>
      ))}

      {/* Optionally highlight recommended centers */}
      {recommendedCenters.map(center => (
        <Marker
          key={`rec-${center.id}-${center.status}`}
          position={[center.lat, center.lng]}
          icon={getStatusIcon(center.status)}
        >
          <Popup>
            <strong>Recommended: {center.name}</strong>
          </Popup>
        </Marker>
      ))}

      {/* Show user location if available */}
      {userLocation && (
        <Marker
          key="user-location"
          position={[userLocation.latitude, userLocation.longitude]}
          icon={new L.Icon.Default()}
        >
          <Popup>You are here</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
