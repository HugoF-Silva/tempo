import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import HealthCenterMarker from './HealthCenterMarker';
import UserLocationMarker from './UserLocationMarker';
import NavigationAppPicker from '../utils/navigation.js'; // <-- import the picker
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
  const [pickerDestination, setPickerDestination] = useState(null);

  const handleMarkerClick = (center) => {
    setPickerDestination(center);
  };

  const handlePickerClose = () => {
    setPickerDestination(null);
  };

  const isRecommended = (center) => {
    return recommendedCenters.some(r => r.id === center.id);
  };
  console.log(`HealthMap.js ${healthCenters}`)

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

      {pickerDestination && (
        <NavigationAppPicker
          destination={pickerDestination}
          userLocation={userLocation}
          onClose={handlePickerClose}
        />
      )}
    </div>
  );
};

export default HealthMap;