import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getStatusColor, getStatusText } from '../utils/status';
import './HealthCenterMarker.css';

const HealthCenterMarker = ({ center, isRecommended, onMarkerClick }) => {
  const statusColor = getStatusColor(center.status);
  const statusText = getStatusText(center.status);

  const markerHtml = `
    <div class="health-marker ${isRecommended ? 'health-marker--recommended' : ''}">
      <div class="marker-pin">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C12.5 0 6 6.5 6 14C6 24.5 20 40 20 40C20 40 34 24.5 34 14C34 6.5 27.5 0 20 0Z" 
                fill="${statusColor}"/>
          <circle cx="20" cy="14" r="6" fill="white"/>
          <path d="M20 11V17M17 14H23" 
                stroke="${statusColor}" 
                stroke-width="2" 
                stroke-linecap="round"/>
        </svg>
        ${isRecommended ? '<div class="recommendation-ring"></div>' : ''}
      </div>
    </div>
  `;

  const icon = L.divIcon({
    html: markerHtml,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  });
  console.log(`HealhCenterMarker.js ${center}`)

  return (
    <Marker 
      position={[center.lat, center.lng]} 
      icon={icon}
      eventHandlers={{
        click: () => onMarkerClick(center)
      }}
    >
      <Popup className="health-popup">
        <div className="popup-content">
          <h3>{center.name}</h3>
          <p className="status-text">{statusText}</p>
          {center.waitTime && (
            <p className="wait-time">Est. wait: {center.waitTime}</p>
          )}
          {center.status === 'empty' && (
            <p className="best-choice">✓ Best choice for quick service</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default HealthCenterMarker;