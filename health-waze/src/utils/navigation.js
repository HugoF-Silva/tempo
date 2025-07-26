/* bottom_sheet_navigation.js */

// Core navigation opener
export const openNavigationApp = (destination, userLocation) => {
  // Feature-detect mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) {
    // Desktop: default to Google Maps in new tab
    openGoogleMaps(destination, userLocation);
    return;
  }

  // On mobile: detect installed apps (stub)
  const apps = detectInstalledApps();
  if (apps.length > 1) {
    // Show bottom-sheet app picker
    showAppSelectionMenu(apps, destination, userLocation);
  } else {
    // Fallback: only one or none detected
    openGoogleMaps(destination, userLocation);
  }
};

// Show a bottom-sheet (dropup) with app icons
const showAppSelectionMenu = (apps, destination, userLocation) => {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'nav-sheet-overlay';
  overlay.innerHTML = `
    <div id="nav-sheet">
      <h3>Select Navigation App</h3>
      <div id="nav-options">
        ${apps.map(app => `
          <button class="nav-option" data-app="${app}">
            <img src="${getIconForApp(app)}" alt="${app}" />
            <span>${app}</span>
          </button>
        `).join('')}
      </div>
      <button id="nav-close">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Event listeners
  overlay.querySelectorAll('.nav-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.getAttribute('data-app');
      openSpecificAppName(choice, destination, userLocation);
      closeSheet();
    });
  });
  overlay.querySelector('#nav-close').addEventListener('click', closeSheet);

  // Helper to remove sheet
  function closeSheet() {
    overlay.classList.add('closing');
    setTimeout(() => document.body.removeChild(overlay), 300);
  }
};

// Map app name to icon asset (you should host these in /assets/icons)
const getIconForApp = (appName) => {
  switch (appName.toLowerCase()) {
    case 'waze': return '/assets/icons/waze.png';
    case 'uber': return '/assets/icons/uber.png';
    default: return '/assets/icons/google-maps.png';
  }
};

// Dispatch to the selected app
const openSpecificAppName = (appName, destination, userLocation) => {
  switch (appName.toLowerCase()) {
    case 'waze': return openWaze(destination);
    case 'uber': return openUber(destination);
    default:    return openGoogleMaps(destination, userLocation);
  }
};

// URL openers
const openGoogleMaps = (destination, userLocation) => {
  const base = 'https://www.google.com/maps';
  const url = userLocation
    ? `${base}/dir/${userLocation.lat},${userLocation.lng}/${destination.lat},${destination.lng}`
    : `${base}/search/?api=1&query=${destination.lat},${destination.lng}`;
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

// Stub: replace with real detection logic if available
const detectInstalledApps = () => {
  // Browser cannot reliably detect; assume most common
  return ['Google Maps', 'Waze', 'Uber'];
};

/* Add required CSS (e.g., in your stylesheet)
#nav-sheet-overlay {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  transition: opacity 0.3s;
}
#nav-sheet {
  background: #fff;
  width: 100%;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding: 16px;
  box-shadow: 0 -4px 10px rgba(0,0,0,0.1);
}
#nav-sheet h3 { margin: 0 0 12px; font-size: 18px; }
#nav-options { display: flex; justify-content: space-around; }
.nav-option { 
  background: none; border: none; flex: 1; text-align: center;
}
.nav-option img { width: 40px; height: 40px; margin-bottom: 4px; }
#nav-close {
  margin-top: 12px;
  width: 100%;
  padding: 12px;
  border: none;
  background: #eee;
  border-radius: 8px;
}
*/
