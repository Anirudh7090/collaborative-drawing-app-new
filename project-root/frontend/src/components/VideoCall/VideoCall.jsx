import React from 'react';
import './VideoCall.css';
import { useVideoCall } from './VideoCall.hook';

// Remote user video display, stays at the bottom
function RemoteVideo({ peerData }) {
  const videoRef = React.useRef();

  React.useEffect(() => {
    if (videoRef.current && peerData.stream) {
      videoRef.current.srcObject = peerData.stream;
    }
  }, [peerData.stream]);

  return (
    <div className="video-wrapper remote-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="video-label">
        {peerData.userName || `User ${peerData.userId}`}
      </div>
    </div>
  );
}

function VideoCall({
  roomId, token, currentUser, wsUrl,
  isMinimized, onToggleMinimize, onClose
}) {
  const {
    peers,
    localVideoRef,
    isMuted,
    isVideoOff,
    error,
    userLeftNotification,
    toggleMute,
    toggleVideo,
    handleEndCall,
  } = useVideoCall({
    roomId, token, currentUser, wsUrl, onClose
  });

  if (error) {
    return (
      <div className="video-call-error">
        <div className="error-message">
          <h3>❌ {error}</h3>
          <button onClick={onClose} className="close-error-btn">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`video-call-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="video-header" onClick={onToggleMinimize}>
        <h3>📹 Video Call</h3>
        <button className="toggle-btn">{isMinimized ? '▲' : '▼'}</button>
      </div>

      {userLeftNotification && (
        <div className="user-left-notification">
          {userLeftNotification} left the call
        </div>
      )}

      {!isMinimized && (
        <>
          <div className="video-grid">
            <div className="video-wrapper local-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="video-element"
              />
              <div className="video-label">
                {currentUser?.fullName || currentUser?.email || 'You'} {isMuted && '🔇'} {isVideoOff && '📷'}
              </div>
            </div>

            {Object.entries(peers).map(([userId, peerData]) => (
              <RemoteVideo key={userId} peerData={peerData} />
            ))}

            {Object.keys(peers).length === 0 && (
              <div className="waiting-message">
                <p>⏳ Waiting for others to join...</p>
              </div>
            )}
          </div>

          <div className="video-controls">
            <button
              onClick={toggleMute}
              className={`control-btn ${isMuted ? 'muted' : ''}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'} {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleVideo}
              className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
              title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
            >
              {isVideoOff ? '📹' : '📷'} {isVideoOff ? 'Video On' : 'Video Off'}
            </button>
            <button onClick={handleEndCall} className="control-btn end-call-btn">
              ❌ End Call
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default VideoCall;
