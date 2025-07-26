import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './NavigationAppPicker.css';
import { getGoogleMapsIntent, getWazeIntent, getUberIntent } from '../utils/navigation';
import { Icons } from './Icons';

export function NavigationAppPicker({ destination, userLocation, onClose }) {
  const [showDialog, setShowDialog] = useState(true);

  const handleAppClick = (app) => {
    let url;
    if (app === 'google') url = getGoogleMapsIntent(destination, userLocation);
    else if (app === 'waze') url = getWazeIntent(destination);
    else if (app === 'uber') url = getUberIntent(destination);
    window.location.href = url;
    close();
  };

  const close = () => {
    setShowDialog(false);
    onClose();
  };

  if (!showDialog) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 20,
          borderRadius: 12,
          minWidth: 280,
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: 16 }}>Open with:</div>
        <button
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
          onClick={() => handleAppClick('google')}
        >
          Google Maps
        </button>
        <button
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
          onClick={() => handleAppClick('waze')}
        >
          Waze
        </button>
        <button
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
          onClick={() => handleAppClick('uber')}
        >
          Uber
        </button>
        <button
          style={{ display: 'block', width: '100%', marginTop: 12 }}
          onClick={close}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}