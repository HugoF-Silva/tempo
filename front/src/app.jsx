import React, { useState, useEffect } from "react";

// Set your API base URL here:
const API_URL = "https://api.mttvps.shop"; // e.g., http://localhost:8080

const riskColors = [
  { value: "b", label: "Blue" },
  { value: "g", label: "Green" },
  { value: "y", label: "Yellow" },
  { value: "o", label: "Orange" },
  { value: "r", label: "Red" },
];

function AppFunc() {
  const [tab, setTab] = useState("register");
  // Register unit state
  const [unitName, setUnitName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [registerMsg, setRegisterMsg] = useState("");
  // Annotate state
  const [pseudonym, setPseudonym] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [eventType, setEventType] = useState("cinza");
  const [riskColor, setRiskColor] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [annotateMsg, setAnnotateMsg] = useState("");

  // Fetch units for annotation select
  useEffect(() => {
    fetchUnits();
  }, [tab]);

  const fetchUnits = async () => {
    if (tab === "annotate") {
      try {
        const res = await fetch(`${API_URL}/units`);
        const data = await res.json();
        setUnits(data.units || []);
      } catch (e) {
        setUnits([]);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterMsg("");
    let latitude = lat ? parseFloat(lat) : undefined;
    let longitude = lng ? parseFloat(lng) : undefined;

    // If no latitude/longitude but postal code exists, fetch them
    const cleanedCep = postalCode ? postalCode.replace(/\D/g, '') : '';
    if ((!latitude || !longitude) && cleanedCep.length === 8) {
      try {
        const res = await fetch(`${API_URL}/cep_lookup?cep=${cleanedCep}`);
        if (res.ok) {
          const data = await res.json();
          console.log("CepAberto response:", data);
          if (data.latitude && data.longitude) {
            latitude = parseFloat(data.latitude);
            longitude = parseFloat(data.longitude);
          }
        }
      } catch (err) {
        // Optionally show an error, or continue with empty lat/lng
      }
    }

    let body = {
      unit: unitName,
      address: address || undefined,
      postal_code: postalCode || undefined,
      latitude,
      longitude,
    };

    try {
      const res = await fetch(`${API_URL}/register_unit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setRegisterMsg("✅ Registered!");
        setUnitName(""); setAddress(""); setPostalCode(""); setLat(""); setLng("");
      } else {
        setRegisterMsg("❌ " + (data.message || "Registration failed"));
      }
    } catch (err) {
      setRegisterMsg("❌ Error: " + err.message);
    }
  };

  const handleAnnotate = async (e) => {
    e.preventDefault();
    setAnnotateMsg("");
    let body = {
      pseudonym,
      unit: selectedUnit,
      event_type: eventType,
      risk_color: eventType === "rc" ? riskColor : undefined,
      timestamp: timestamp || new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_URL}/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setAnnotateMsg("✅ Annotated!");
      setPseudonym(""); setSelectedUnit(""); setEventType("cinza"); setRiskColor(""); setTimestamp("");
    } catch (err) {
      setAnnotateMsg("❌ Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4">
        <div className="flex space-x-4 mb-4">
          <button
            className={`flex-1 py-2 rounded ${tab === "register" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("register")}
          >
            Register Unit
          </button>
          <button
            className={`flex-1 py-2 rounded ${tab === "annotate" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("annotate")}
          >
            Annotate
          </button>
        </div>

        {tab === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col space-y-3">
            <input
              className="border p-2 rounded"
              placeholder="Unit Name (unique)"
              value={unitName}
              onChange={e => setUnitName(e.target.value)}
              required
            />
            <input
              className="border p-2 rounded"
              placeholder="Address (optional)"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <input
              className="border p-2 rounded"
              placeholder="Postal Code (CEP, optional)"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
            />
            <input
              className="border p-2 rounded"
              placeholder="Latitude (optional)"
              value={lat}
              onChange={e => setLat(e.target.value)}
              type="number"
              step="any"
            />
            <input
              className="border p-2 rounded"
              placeholder="Longitude (optional)"
              value={lng}
              onChange={e => setLng(e.target.value)}
              type="number"
              step="any"
            />
            <button
              className="bg-blue-600 text-white py-2 rounded font-bold"
              type="submit"
            >
              Register
            </button>
            {registerMsg && <div className="text-center mt-2">{registerMsg}</div>}
          </form>
        )}

        {tab === "annotate" && (
          <form onSubmit={handleAnnotate} className="flex flex-col space-y-3">
            <input
              className="border p-2 rounded"
              placeholder="Pseudonym (e.g. AlJo)"
              value={pseudonym}
              onChange={e => setPseudonym(e.target.value)}
              required
            />
            <select
              className="border p-2 rounded"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              required
            >
              <option value="">Select Unit</option>
              {units.map(u => (
                <option key={u.unit} value={u.unit}>{u.unit}</option>
              ))}
            </select>
            <select
              className="border p-2 rounded"
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              required
            >
              <option value="cinza">Cinza (Triage)</option>
              <option value="rc">Risk Color (Doctor Call)</option>
            </select>
            {eventType === "rc" && (
              <select
                className="border p-2 rounded"
                value={riskColor}
                onChange={e => setRiskColor(e.target.value)}
                required
              >
                <option value="">Select Risk Color</option>
                {riskColors.map(rc => (
                  <option key={rc.value} value={rc.value}>{rc.label}</option>
                ))}
              </select>
            )}
            <input
              className="border p-2 rounded"
              placeholder="Timestamp (ISO, optional)"
              value={timestamp}
              onChange={e => setTimestamp(e.target.value)}
              type="datetime-local"
            />
            <button
              className="bg-blue-600 text-white py-2 rounded font-bold"
              type="submit"
            >
              Annotate
            </button>
            {annotateMsg && <div className="text-center mt-2">{annotateMsg}</div>}
          </form>
        )}
      </div>
      <div className="text-gray-400 mt-4 text-xs">MVP | Data Collector UI</div>
    </div>
  );
}

export default AppFunc;
