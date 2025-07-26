import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import HealthCenterMarker from './HealthCenterMarker';
import UserLocationMarker from './UserLocationMarker';
import { openNavigationApp } from '../utils/navigation';
import 'leaflet/dist/leaflet.css';
import './HealthMap.css';

// Fix Leaflet icon issues
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to control map center
const MapCenterController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

const HealthMap = ({ 
  healthCenters, 
  recommendedCenters, 
  userLocation, 
  mapCenter 
}) => {
  const handleMarkerClick = (center) => {
    openNavigationApp(center, userLocation);
  };

  const isRecommended = (center) => {
    return recommendedCenters.some(r => r.id === center.id);
  };

  return (
    <div className="map-container">
      <MapContainer 
        center={mapCenter} 
        zoom={12} 
        className="health-map"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors & CartoDB'
        />
        
        <MapCenterController center={mapCenter} zoom={12} />
        
        {healthCenters.map(center => (
          <HealthCenterMarker
            key={`${center.id}-${center.status}`}
            center={center}
            isRecommended={isRecommended(center)}
            onMarkerClick={handleMarkerClick}
          />
        ))}
        
        {userLocation && (
          <UserLocationMarker location={userLocation} />
        )}
      </MapContainer>
    </div>
  );
};

export default HealthMap;