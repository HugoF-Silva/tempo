import React from 'react';
import PropTypes from 'prop-types';
import './NavigationAppPicker.css';
import { getGoogleMapsIntent, getWazeIntent, getUberIntent } from '../utils/navigation';
import { GoogleIcon, WazeIcon, UberIcon } from './Icons';

export function NavigationAppPicker({ destination, userLocation, onClose }) {
  const apps = [
    { key: 'google', label: 'Google Maps', icon: GoogleIcon, handler: getGoogleMapsIntent },
    { key: 'waze',   label: 'Waze',         icon: WazeIcon,   handler: () => getWazeIntent(destination) },
    { key: 'uber',   label: 'Uber',         icon: UberIcon,   handler: () => getUberIntent(destination) }
  ];

  const handleAppClick = (app) => {
    let url;
    if (app.key === 'google') url = app.handler(destination, userLocation);
    else url = app.handler();
    window.location.href = url;
    onClose();
  };

  return (
    <div className="navigation-app-picker-overlay">
      <div className="navigation-app-picker-dialog">
        <div className="navigation-app-picker-header">Open with:</div>
        <div className="navigation-app-list">
          {apps.map((app) => (
            <button
              key={app.key}
              className={`navigation-app-button ${app.key}`}
              onClick={() => handleAppClick(app)}
            >
              <app.icon size={20} />
              {app.label}
            </button>
          ))}
        </div>
        <button
          className="navigation-app-button navigation-app-cancel"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

NavigationAppPicker.propTypes = {
  destination: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }).isRequired,
  userLocation: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  onClose: PropTypes.func.isRequired,
};