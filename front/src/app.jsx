import React, { useState, useEffect } from "react";

// Set your API base URL here:
const API_URL = "https://api.mttvps.shop";

const COGNITO_CONFIG = {
  region: "us-east-1",
  userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
}

const riskColors = [
  { value: "b", label: "Blue" },
  { value: "g", label: "Green" },
  { value: "y", label: "Yellow" },
  { value: "o", label: "Orange" },
  { value: "r", label: "Red" },
];

// Simple Cognito authentication wrapper
class CognitoAuth {
  static async signIn(username, password) {
    const authData = {
      Username: username,
      Password: password,
    };

    const authDetails = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CONFIG.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    try {
      const response = await fetch(`https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
        },
        body: JSON.stringify(authDetails),
      });

      const data = await response.json();
      
      if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
        return { challengeName: "NEW_PASSWORD_REQUIRED", session: data.Session };
      }

      if (data.AuthenticationResult) {
        return {
          success: true,
          accessToken: data.AuthenticationResult.AccessToken,
          idToken: data.AuthenticationResult.IdToken,
          refreshToken: data.AuthenticationResult.RefreshToken,
        };
      }

      throw new Error(data.message || "Authentication failed");
    } catch (error) {
      throw error;
    }
  }

  static async respondToNewPasswordChallenge(username, newPassword, session) {
    const challengeResponse = {
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      ClientId: COGNITO_CONFIG.clientId,
      ChallengeResponses: {
        USERNAME: username,
        NEW_PASSWORD: newPassword,
      },
      Session: session,
    };

    try {
      const response = await fetch(`https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "AWSCognitoIdentityProviderService.RespondToAuthChallenge",
        },
        body: JSON.stringify(challengeResponse),
      });

      const data = await response.json();

      if (data.AuthenticationResult) {
        return {
          success: true,
          accessToken: data.AuthenticationResult.AccessToken,
          idToken: data.AuthenticationResult.IdToken,
          refreshToken: data.AuthenticationResult.RefreshToken,
        };
      }

      throw new Error(data.message || "Password change failed");
    } catch (error) {
      throw error;
    }
  }

  static signOut() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("idToken");
    localStorage.removeItem("refreshToken");
  }

  static isAuthenticated() {
    return !!localStorage.getItem("accessToken");
  }

  static getAccessToken() {
    return localStorage.getItem("accessToken");
  }
}

// Login Component
function LoginForm({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [session, setSession] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const result = await CognitoAuth.signIn(username, password);
      
      if (result.challengeName === "NEW_PASSWORD_REQUIRED") {
        setNeedsNewPassword(true);
        setSession(result.session);
      } else if (result.success) {
        localStorage.setItem("accessToken", result.accessToken);
        localStorage.setItem("idToken", result.idToken);
        localStorage.setItem("refreshToken", result.refreshToken);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await CognitoAuth.respondToNewPasswordChallenge(username, newPassword, session);
      
      if (result.success) {
        localStorage.setItem("accessToken", result.accessToken);
        localStorage.setItem("idToken", result.idToken);
        localStorage.setItem("refreshToken", result.refreshToken);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Admin Login</h2>
        
        {!needsNewPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-4">
              You must change your password on first login.
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handlePasswordChange)}
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handlePasswordChange)}
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={handlePasswordChange}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Changing password..." : "Change Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Component (Protected)
function ProtectedApp() {
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
        const res = await fetch(`${API_URL}/units`, {
          headers: {
            "Authorization": `Bearer ${CognitoAuth.getAccessToken()}`
          }
        });
        const data = await res.json();
        setUnits(data.units || []);
      } catch (e) {
        setUnits([]);
      }
    }
  };

  const handleRegister = async () => {
    if (!unitName) {
      setRegisterMsg("❌ Unit name is required");
      return;
    }
    
    setRegisterMsg("");
    let latitude = lat ? parseFloat(lat) : undefined;
    let longitude = lng ? parseFloat(lng) : undefined;

    // If no latitude/longitude but postal code exists, fetch them
    const cleanedCep = postalCode ? postalCode.replace(/\D/g, '') : '';
    if ((!latitude || !longitude) && cleanedCep.length === 8) {
      try {
        const res = await fetch(`${API_URL}/cep_lookup?cep=${cleanedCep}`, {
          headers: {
            "Authorization": `Bearer ${CognitoAuth.getAccessToken()}`
          }
        });
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
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CognitoAuth.getAccessToken()}`
        },
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

  function toBrazilIso(datetimeLocalStr) {
    if (!datetimeLocalStr) return new Date().toISOString();
    // e.g., "2024-05-30T11:01" -> Date as -03:00
    return new Date(datetimeLocalStr + ":00-03:00").toISOString();
  }

  const handleAnnotate = async () => {
    if (!pseudonym || !selectedUnit) {
      setAnnotateMsg("❌ Pseudonym and Unit are required");
      return;
    }
    if (eventType === "rc" && !riskColor) {
      setAnnotateMsg("❌ Risk color is required for doctor calls");
      return;
    }
    setAnnotateMsg("");
    let body = {
      pseudonym,
      unit: selectedUnit,
      event_type: eventType,
      risk_color: eventType === "rc" ? riskColor : undefined,
      timestamp: timestamp
        ? toBrazilIso(timestamp)
        : new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_URL}/annotate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CognitoAuth.getAccessToken()}`
        },
        body: JSON.stringify(body),
      });
      
      // 👇 Add this block!
      if (!res.ok) {
        // Optional: try to get server error message
        let msg = "";
        try { msg = (await res.json()).message; } catch {}
        throw new Error(msg || `HTTP error: ${res.status}`);
      }

      await res.json(); // parse if needed
      setAnnotateMsg("✅ Annotated!");
      setPseudonym(""); setSelectedUnit(""); setEventType("cinza"); setRiskColor(""); setTimestamp("");
    } catch (err) {
      setAnnotateMsg("❌ Error: " + err.message);
    }
  };

  const handleLogout = () => {
    CognitoAuth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Admin Tool</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
        
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
          <div className="flex flex-col space-y-3">
            <input
              className="border p-2 rounded"
              placeholder="Unit Name (unique)"
              value={unitName}
              onChange={e => setUnitName(e.target.value)}
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
              onClick={handleRegister}
            >
              Register
            </button>
            {registerMsg && <div className="text-center mt-2">{registerMsg}</div>}
          </div>
        )}

        {tab === "annotate" && (
          <div className="flex flex-col space-y-3">
            <input
              className="border p-2 rounded"
              placeholder="Pseudonym (e.g. AlJo)"
              value={pseudonym}
              onChange={e => setPseudonym(e.target.value)}
            />
            <select
              className="border p-2 rounded"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
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
            >
              <option value="cinza">Cinza (Triage)</option>
              <option value="rc">Risk Color (Doctor Call)</option>
            </select>
            {eventType === "rc" && (
              <select
                className="border p-2 rounded"
                value={riskColor}
                onChange={e => setRiskColor(e.target.value)}
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
              onClick={handleAnnotate}
            >
              Annotate
            </button>
            {annotateMsg && <div className="text-center mt-2">{annotateMsg}</div>}
          </div>
        )}
      </div>
      <div className="text-gray-400 mt-4 text-xs">MVP | Data Collector UI</div>
    </div>
  );
}

// Main App with Authentication Check
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    setIsAuthenticated(CognitoAuth.isAuthenticated());
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? (
    <ProtectedApp />
  ) : (
    <LoginForm onLoginSuccess={handleLoginSuccess} />
  );
}

export default App;