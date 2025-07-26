import React, { useState } from "react";

const isAndroid = /Android/i.test(navigator.userAgent);

const getGoogleMapsIntent = (destination, userLocation) => {
  if (userLocation) {
    return `intent://maps.google.com/maps?saddr=${userLocation.lat},${userLocation.lng}&daddr=${destination.lat},${destination.lng}#Intent;package=com.google.android.apps.maps;scheme=https;end`;
  }
  return `intent://maps.google.com/maps?daddr=${destination.lat},${destination.lng}#Intent;package=com.google.android.apps.maps;scheme=https;end`;
};

const getWazeIntent = (destination) => {
  return `intent://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes#Intent;package=com.waze;scheme=https;end`;
};

const getUberIntent = (destination) => {
  return `intent://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}#Intent;package=com.ubercab;scheme=https;end`;
};

const getWebGoogleMaps = (destination, userLocation) => {
  if (userLocation) {
    return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destination.lat},${destination.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lng}`;
};

export function NavigationAppPicker({ destination, userLocation }) {
  const [showDialog, setShowDialog] = useState(false);

  const handleOpen = () => {
    if (isAndroid) {
      setShowDialog(true);
    } else {
      window.open(getWebGoogleMaps(destination, userLocation), "_blank");
    }
  };

  const handleAppClick = (app) => {
    let url;
    if (app === "google") url = getGoogleMapsIntent(destination, userLocation);
    else if (app === "waze") url = getWazeIntent(destination);
    else if (app === "uber") url = getUberIntent(destination);
    window.location.href = url;
    setShowDialog(false);
  };

  return (
    <>
      <button onClick={handleOpen}>Navigate</button>
      {showDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              minWidth: 280,
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 16 }}>Open with:</div>
            <button
              style={{ display: "block", width: "100%", marginBottom: 8 }}
              onClick={() => handleAppClick("google")}
            >
              Google Maps
            </button>
            <button
              style={{ display: "block", width: "100%", marginBottom: 8 }}
              onClick={() => handleAppClick("waze")}
            >
              Waze
            </button>
            <button
              style={{ display: "block", width: "100%", marginBottom: 8 }}
              onClick={() => handleAppClick("uber")}
            >
              Uber
            </button>
            <button
              style={{ display: "block", width: "100%", marginTop: 12 }}
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
