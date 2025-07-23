export const openNavigationApp = (destination, userLocation) => {
  const { lat: destLat, lng: destLng } = destination;
  
  // Check if on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Try to detect installed apps and provide options
    const apps = detectInstalledApps();
    
    if (apps.length > 1) {
      // Show app selection modal (simplified for now)
      const selectedApp = prompt(
        'Choose navigation app:\n1. Google Maps\n2. Waze\n3. Uber',
        '1'
      );
      
      openSpecificApp(selectedApp, destination, userLocation);
    } else {
      // Default to Google Maps
      openGoogleMaps(destination, userLocation);
    }
  } else {
    // Desktop - open Google Maps in new tab
    openGoogleMaps(destination, userLocation);
  }
};

const openSpecificApp = (appChoice, destination, userLocation) => {
  switch(appChoice) {
    case '2':
      openWaze(destination);
      break;
    case '3':
      openUber(destination);
      break;
    default:
      openGoogleMaps(destination, userLocation);
  }
};

const openGoogleMaps = (destination, userLocation) => {
  let url;
  if (userLocation) {
    url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destination.lat},${destination.lng}`;
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lng}`;
  }
  window.open(url, '_blank');
};

const openWaze = (destination) => {
  const url = `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
  window.open(url, '_blank');
};

const openUber = (destination) => {
  const url = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`;
  window.open(url, '_blank');
};

const detectInstalledApps = () => {
  // This is a simplified version - in reality, detecting installed apps
  // is limited by browser security. This would need native app integration
  return ['Google Maps', 'Waze', 'Uber'];
};