import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register'; // NEW modular path!
import DrawingCanvas from './components/DrawingCanvas';
import RoomSelection from './components/RoomSelection/RoomSelection';


// Use environment variables for API URLs
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login');
  const [token, setToken] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedRoom(null);
  }, []);

  // NEW registration logic handled in hook, parent just needs callback
  const handleRegisterSuccess = () => {
    setActiveTab('login');
  };

  // Login success callback
  const handleLoginSuccess = async (loginResult) => {
    try {
      const meResponse = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${loginResult.access_token}` }
      });
      if (meResponse.ok) {
        const meData = await meResponse.json();
        setCurrentUser(meData.user);
        setToken(loginResult.access_token);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setToken(null);
        setIsAuthenticated(false);
        alert('Login failed: Invalid credentials');
      }
    } catch {
      alert('Login failed: Network error');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setToken(null);
    setActiveTab('login');
    setSelectedRoom(null);
    localStorage.removeItem('token');
  };

  const handleRoomSelected = (roomId, roomName, role) => {
    setSelectedRoom({ id: roomId, name: roomName, role });
  };

  // Step 1: Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-header">
            <h1>🎨 React - FastAPI Auth & Drawing</h1>
            <div className="tab-buttons">
              <button className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>Login</button>
              <button className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>Register</button>
            </div>
          </div>
          <div className="auth-forms">
            {activeTab === 'register' &&
              <Register onRegisterSuccess={handleRegisterSuccess} />
            }
            {activeTab === 'login' &&
              <Login onLoginSuccess={handleLoginSuccess} />
            }
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Authenticated but room not chosen
  if (isAuthenticated && !selectedRoom) {
    return (
      <RoomSelection
        token={token}
        currentUser={currentUser}
        onRoomSelected={handleRoomSelected}
        onLogout={handleLogout}
      />
    );
  }

  // Step 3: Authenticated & room chosen -> open DrawingCanvas
  if (isAuthenticated && selectedRoom) {
    return (
      <div className="app">
        <div className="header">
          <h1>🎨 Collaborative Drawing Canvas</h1>
          <div className="user-info">
            <span>Welcome, {currentUser?.full_name || currentUser?.email}</span>
            <span className="room-info">
              Room: <b>{selectedRoom?.name}</b> (ID: {selectedRoom?.id}) | Role: {selectedRoom?.role}
            </span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
            <button onClick={() => setSelectedRoom(null)} className="logout-btn" style={{ marginLeft: 8 }}>Change Room</button>
          </div>
        </div>
        <div className="drawing-container">
          <DrawingCanvas
            roomId={selectedRoom.id}
            currentUser={currentUser}
            token={token}
          />
        </div>
      </div>
    );
  }

  return null;
}

export default App;
