import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import { requestUserLocation } from './utils/location';
import { callRecommendationAPI } from './services/api';
import { mockHealthCenters } from './data/healthCenters';
import './styles/global.css';

function AppContent() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [healthCenters, setHealthCenters] = useState(mockHealthCenters);
  const [recommendedCenters, setRecommendedCenters] = useState([]);
  const [mapCenter, setMapCenter] = useState([-16.6514931, -49.3280203]);
  const [isLoading, setIsLoading] = useState(false);

  // Update health centers from cron job
  useEffect(() => {
    // This would be replaced with actual WebSocket or polling logic
    const updateInterval = setInterval(() => {
      // Fetch updated health center statuses
      // setHealthCenters(updatedData);
    }, 3600000); // Every hour

    return () => clearInterval(updateInterval);
  }, []);

  // Request user location
  const handleLocationRequest = useCallback(async () => {
    const location = await requestUserLocation();
    if (location) {
      setUserLocation(location);
    }
  }, []);

  // Call Lambda endpoint for recommendations
  const getRecommendations = useCallback(async (hasDescription) => {
    setIsLoading(true);
    try {
      const recommendations = await callRecommendationAPI({
        description: hasDescription ? description : undefined,
        location: userLocation
      });

      if (recommendations.centers) {
        setRecommendedCenters(recommendations.centers);
        
        if (recommendations.centers.length === 1) {
          // Center on single recommendation
          setMapCenter([
            recommendations.centers[0].lat, 
            recommendations.centers[0].lng
          ]);
        } else if (recommendations.centers.length === 2) {
          // Center on midpoint
          const midLat = (recommendations.centers[0].lat + recommendations.centers[1].lat) / 2;
          const midLng = (recommendations.centers[0].lng + recommendations.centers[1].lng) / 2;
          setMapCenter([midLat, midLng]);
        }
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      // Fallback logic for demo
      if (hasDescription && description.length > 0) {
        const recommended = [healthCenters.find(c => c.status === 'empty')];
        setRecommendedCenters(recommended);
        setMapCenter([recommended[0].lat, recommended[0].lng]);
      } else if (userLocation) {
        const recommended = healthCenters.filter(c => c.status !== 'full').slice(0, 2);
        setRecommendedCenters(recommended);
        const midLat = (recommended[0].lat + recommended[1].lat) / 2;
        const midLng = (recommended[0].lng + recommended[1].lng) / 2;
        setMapCenter([midLat, midLng]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [description, userLocation, healthCenters]);

  // Navigate to map with optional description
  const navigateToMap = useCallback((withDescription) => {
    navigate('/map');
    handleLocationRequest();
    if (withDescription || userLocation) {
      getRecommendations(withDescription);
    }
  }, [navigate, handleLocationRequest, getRecommendations, userLocation]);

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <HomePage 
            description={description}
            onDescriptionChange={setDescription}
            onNavigateToMap={navigateToMap}
          />
        } 
      />
      <Route 
        path="/map" 
        element={
          <MapPage
            description={description}
            onDescriptionChange={setDescription}
            userLocation={userLocation}
            healthCenters={healthCenters}
            recommendedCenters={recommendedCenters}
            mapCenter={mapCenter}
            isLoading={isLoading}
            onRefresh={() => getRecommendations(description.length > 0)}
            onLocationRequest={handleLocationRequest}
          />
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;