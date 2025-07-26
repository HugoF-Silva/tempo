export const openNavigationApp = async (destination, userLocation) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!isMobile) {
    // Desktop → always Google Maps
    return openGoogleMaps(destination, userLocation);
  }

  // Build the available apps list
  const apps = [
    { name: 'Google Maps', action: () => openGoogleMaps(destination, userLocation) },
    { name: 'Waze',       action: () => openWaze(destination) },
    { name: 'Uber',       action: () => openUber(destination) },
  ];

  // Show the picker and wait for the user’s choice
  const choiceIndex = await showAppPicker(apps.map(a => a.name));
  apps[choiceIndex].action();
};

/**
 * Displays a modal <dialog> with radio buttons for each option,
 * and resolves with the index of the selected one.
 */
const showAppPicker = (options) => {
  return new Promise((resolve) => {
    // Create dialog
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <form method="dialog" style="padding:1em;max-width:300px;">
        <h3 style="margin-top:0;">Choose navigation app</h3>
        ${options.map((opt, i) => `
          <label style="display:block;margin:0.5em 0;">
            <input
              type="radio"
              name="app"
              value="${i}"
              ${i === 0 ? 'checked' : ''}
            /> ${opt}
          </label>
        `).join('')}
        <menu style="display:flex;justify-content:flex-end;gap:0.5em;">
          <button value="cancel" type="reset">Cancel</button>
          <button value="confirm">OK</button>
        </menu>
      </form>
    `;

    document.body.appendChild(dlg);

    dlg.addEventListener('close', () => {
      const form = dlg.querySelector('form');
      // If user clicked OK, read the checked radio; otherwise default to 0
      const idx = form.returnValue === 'confirm'
        ? parseInt(form.app.value, 10)
        : 0;
      dlg.remove();
      resolve(idx);
    }, { once: true });

    dlg.showModal();
  });
};

const openGoogleMaps = (destination, userLocation) => {
  const { lat, lng } = destination;
  let url;
  if (userLocation) {
    url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${lat},${lng}`;
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  window.open(url, '_blank');
};

const openWaze = (destination) => {
  const { lat, lng } = destination;
  const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  window.open(url, '_blank');
};

const openUber = (destination) => {
  const { lat, lng } = destination;
  const url = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`;
  window.open(url, '_blank');
};
