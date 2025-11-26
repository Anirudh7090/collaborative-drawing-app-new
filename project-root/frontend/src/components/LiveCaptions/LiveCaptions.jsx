import React from 'react';
import './LiveCaptions.css';
import { useLiveCaptions, CAPTION_DURATION } from './LiveCaptions.hook';

function LiveCaptions({
  websocket,
  isEnabled,
  isMicEnabled,
  currentUser,
  isMinimized,
  onToggle,
}) {
  const {
    captions,
    currentTranscript,
    captionsEndRef,
    recognitionReady,
  } = useLiveCaptions({ websocket, isEnabled, isMicEnabled, currentUser });

  // Show panel only when captions are enabled
  if (!isEnabled) return null;

  return (
    <div className={`live-captions-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="captions-header" onClick={onToggle}>
        <span className="captions-icon">💬</span>
        <h3>Live Captions</h3>
        <button className="toggle-btn">{isMinimized ? '▲' : '▼'}</button>
      </div>

      {!isMinimized && (
        <div className="captions-content">
          <div className="captions-status">
            {isMicEnabled ? (
              <span className="status-listening">🎤 Listening...</span>
            ) : (
              <span className="status-waiting">
                🔇 Mic is off - Turn on mic to start
              </span>
            )}
            {!recognitionReady && (
              <span className="status-error">
                Speech recognition not supported in this browser
              </span>
            )}
          </div>

          <div className="captions-messages">
            {captions.length === 0 && !currentTranscript ? (
              <div className="no-captions">
                <p>No captions yet</p>
                <p style={{ fontSize: '13px', color: '#a0aec0' }}>
                  {isMicEnabled
                    ? 'Start speaking to see captions'
                    : 'Enable mic to capture captions'}
                </p>
              </div>
            ) : (
              <>
                {captions.map((caption) => (
                  <div
                    key={caption.id}
                    className={`caption-message ${caption.isOwn ? 'own' : 'other'}`}
                  >
                    <div className="caption-header">
                      <span className="caption-user">{caption.user}</span>
                      <span className="caption-time">
                        {new Date(caption.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="caption-text">{caption.text}</div>
                  </div>
                ))}

                {currentTranscript && (
                  <div className="caption-message own interim">
                    <div className="caption-header">
                      <span className="caption-user">You</span>
                      <span className="caption-status">Speaking...</span>
                    </div>
                    <div className="caption-text">{currentTranscript}</div>
                  </div>
                )}

                <div ref={captionsEndRef} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveCaptions;
