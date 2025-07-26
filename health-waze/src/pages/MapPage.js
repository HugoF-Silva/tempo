import React, { useEffect } from 'react';
import Logo from '../components/Logo';
import TextInput from '../components/TextInput';
import IconButton from '../components/IconButton';
import InfoBanner from '../components/InfoBanner';
import HealthMap from '../components/HealthMap';
import { RefreshIcon } from '../components/Icons';
import './MapPage.css';

const MapPage = ({
  description,
  onDescriptionChange,
  userLocation,
  healthCenters,
  recommendedCenters,
  mapCenter,
  isLoading,
  onRefresh,
  onLocationRequest
}) => {
  
  // Request location on mount
  useEffect(() => {
    onLocationRequest();
  }, [onLocationRequest]);
  console.log(`MapPage.js ${healthCenters}`)

  if (healthCenters === null) {
    return (
      <div className="map-page map-loading">
        <InfoBanner>
          Loading health centers…
        </InfoBanner>
      </div>
    );
  }

  console.log(`MapPage.js`, healthCenters);

  return (
    <div className="map-page">
      <div className="map-header">
        <Logo size="small" />
        
        <div className="rewrite-section">
          <span className="rewrite-label">rewrite (describe again)</span>
          <div className="rewrite-input-wrapper">
            <TextInput
              value={description}
              onChange={onDescriptionChange}
              placeholder="Describe symptoms..."
              maxLength={300}
              variant="compact"
            />
            <IconButton
              icon={<RefreshIcon />}
              onClick={onRefresh}
              disabled={isLoading}
              label="Refresh recommendations"
            />
          </div>
        </div>
      </div>
      
      <InfoBanner>
        <strong>Did you know?</strong> It's your right to be taken care of at 
        the health center unit you go (Doesn't matter if they told you to go 
        see a doctor at your neighbourhood)
      </InfoBanner>
      
      <HealthMap
        healthCenters={healthCenters}
        recommendedCenters={recommendedCenters}
        userLocation={userLocation}
        mapCenter={mapCenter}
      />
    </div>
  );
};

export default MapPage;