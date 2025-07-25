import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import { requestUserLocation } from './utils/location';
import { mockHealthCenters } from './data/healthCenters';
import './styles/global.css';

function AppContent() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [description, setDescription] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [healthCenters, setHealthCenters] = useState(mockHealthCenters);
  const [recommendedCenters, setRecommendedCenters] = useState([]);
  const [mapCenter, setMapCenter] = useState([-16.6514931, -49.3280203]);
  const [isLoading, setIsLoading] = useState(false);

  // 1) Open WS once, subscribe, handle initial + diffs + recommendations
  useEffect(() => {
    const socket = new WebSocket(process.env.REACT_APP_WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket open, requesting initial data');
      socket.send(JSON.stringify({ action: 'healthCentersSubscribe' }));
    };

    socket.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      switch (msg.action) {

        // initial full list
        case 'healthCentersInitial':
          setHealthCenters(msg.data);
          break;

        // only diffs
        case 'healthCentersUpdate':
          setHealthCenters(prev => {
            const byId = new Map(prev.map(c => [c.id, c]));
            msg.data.forEach(c => byId.set(c.id, c));
            return Array.from(byId.values());
          });
          break;

        // recommendation response
        case 'recommendations':
          handleRecommendationsMessage(msg.data);
          break;

        default:
          console.log(msg)
          console.warn('Unknown WS action:', msg.action);
      }
    };

    socket.onerror = console.error;
    socket.onclose = () => console.log('WebSocket closed');

    return () => {
      socket.close();
    };
  }, []);


  const handleRecommendationsMessage = useCallback((payload) => {
    setIsLoading(false);

    // assume server may send { centers: [] } or omit centers on error
    let centers = Array.isArray(payload.centers)
      ? payload.centers
      : [];

    if (centers.length === 0) {
      // *** your original demo fallback logic ***
      if (description.length > 0) {
        const emptyCenter = healthCenters.find(c => c.status === 'empty');
        centers = emptyCenter ? [emptyCenter] : [];
      } else if (userLocation) {
        centers = healthCenters
          .filter(c => c.status !== 'full')
          .slice(0, 2);
      }
    }
    setRecommendedCenters(centers);

    if (centers.length === 1) {
      setMapCenter([centers[0].lat, centers[0].lng]);
    } else if (centers.length === 2) {
      const midLat = (centers[0].lat + centers[1].lat) / 2;
      const midLng = (centers[0].lng + centers[1].lng) / 2;
      setMapCenter([midLat, midLng]);
    }
  }, [description, userLocation, healthCenters]);
    
  // Request user location
  const handleLocationRequest = useCallback(async () => {
    const location = await requestUserLocation();
    if (location) {
      setUserLocation(location);
    }
  }, []);

  
  // Call Lambda endpoint for recommendations
  const getRecommendations = useCallback((withDescription) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not open yet');
      return;
    }
    setIsLoading(true);
    socketRef.current.send(JSON.stringify({
      action: 'getRecommendations',
      description: withDescription ? description : undefined,
      location: userLocation
    }));
  }, [description, userLocation]);

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