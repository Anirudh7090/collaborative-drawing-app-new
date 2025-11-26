import React from "react";
import ChatBox from '../ChatBox';
import VideoCall from '../VideoCall';
import LiveCaptions from '../LiveCaptions';
import './DrawingCanvas.css';

import {
  useDrawingCanvas,
  CANVAS_W,
  CANVAS_H,
  CURSORS,
  COLORS,
  THICKNESS,
  TOOLS,
  TOOL_LABELS
} from "./DrawingCanvas.hook";

function DrawingCanvas({ currentUser, roomId, token }) {
  const {
    canvasRef,
    wsRef,
    color, setColor,
    thickness, setThickness,
    tool, setTool,
    remoteCursors,
    myCursor,
    collision,

    isChatMinimized, setIsChatMinimized,
    showVideoCall, setShowVideoCall,
    isVideoMinimized, setIsVideoMinimized,
    captionsEnabled, setCaptionsEnabled,
    isMicEnabled, setIsMicEnabled,
    isCaptionsMinimized, setIsCaptionsMinimized,
    incomingCall, setIncomingCall,
    isOwner,

    loadingSnapshots,
    snapshots,
    fetchSnapshots,
    handleSaveSnapshot,
    handleRestoreSnapshot,
    handleSaveCanvas,
    handleClearCanvas,
    handleStartVideoCall,
    handleJoinCall,
    handleRejectCall,

    start,
    move,
    stop,
  } = useDrawingCanvas({ currentUser, roomId, token });

  // Render helpers

  const renderSnapshots = () => (
    <div style={{
      width: "100%",
      marginBottom: 16,
      background: "#f5f9ff",
      border: "1px solid #a0c4e2",
      borderRadius: 10,
      padding: "8px 16px",
      fontSize: 15
    }}>
      <div style={{ fontWeight: 700, marginBottom: 5 }}>
        Canvas Snapshots / History
        <button
          style={{
            float: "right", marginLeft: 4, borderRadius: 6,
            border: "none", background: "#ddd", padding: "4px 12px",
            fontWeight: 600, fontSize: 14, cursor: "pointer"
          }}
          disabled={loadingSnapshots}
          onClick={fetchSnapshots}
        >Refresh</button>
      </div>
      <div style={{ maxHeight: 120, overflowY: "auto" }}>
        {snapshots.length === 0 ? <div style={{ color: "#666" }}>No snapshots yet.</div> :
          <ul style={{ paddingLeft: 8, margin: "0 0 0 0" }}>
            {snapshots.map(snap =>
              <li key={snap.snapshot_id} style={{ marginBottom: 5 }}>
                <span style={{ color: "#3182ce", fontWeight: 600 }}>{new Date(snap.created_at).toLocaleString()}</span>
                <button style={{
                  marginLeft: 12, background: "#3182ce", color: "#fff",
                  padding: "2px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600
                }} onClick={() => handleRestoreSnapshot(snap.snapshot_id)}>
                  Restore
                </button>
              </li>
            )}
          </ul>
        }
      </div>
      <button
        style={{
          marginTop: 8,
          padding: "5px 20px",
          fontSize: "15px",
          borderRadius: 8,
          background: "#275c9e",
          color: "#fff",
          fontWeight: 600,
          border: "none",
          cursor: "pointer"
        }}
        onClick={handleSaveSnapshot}
      >
        Save as New Snapshot
      </button>
    </div>
  );

  const renderOwnerButtons = () => isOwner && (
    <button
      style={{
        margin: "10px 0",
        padding: "6px 20px",
        fontSize: "16px",
        borderRadius: 8,
        background: "#da3448",
        color: "#fff",
        fontWeight: 700,
        border: "none",
        cursor: "pointer"
      }}
      onClick={handleClearCanvas}
    >
      Clear Canvas (Owner Only)
    </button>
  );

  const renderRoomMembers = () => {
    const myName = currentUser?.fullName || currentUser?.email || "anonymous";
    const members = [
      { name: myName, tool: myCursor.tool || 'brush' },
      ...Object.values(remoteCursors)
        .reduce((arr, c) => {
          if (c.name && !arr.some(item => item.name === c.name)) arr.push(c);
          return arr;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name))
    ];
    return (
      <div style={{
        marginBottom: 10,
        background: '#f7fafc',
        padding: '8px 24px',
        borderRadius: 8,
        fontWeight: 500,
        fontSize: 16,
        minWidth: 200,
        boxShadow: '0 2px 8px #e1e1e1'
      }}>
        <div style={{marginBottom: 8, fontWeight: 700}}>Members online</div>
        <ul style={{listStyle: "none", padding: 0, margin: 0}}>
          {members.map((m, i) => (
            <li key={m.name + i} style={{margin: "3px 0", display: "flex", alignItems: "center"}}>
              <span style={{fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "#2b6cb0" : "#2d3748"}}>
                {m.name}
              </span>
              <span style={{marginLeft: 10, fontSize: 14, color: "#718096"}}>
                {TOOL_LABELS[m.tool] || m.tool}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderOtherCursors = () =>
    Object.entries(remoteCursors).map(([uid, c]) =>
      c.x != null && c.y != null ? (
        <div
          key={uid}
          style={{
            position: 'absolute',
            left: c.x,
            top: c.y,
            pointerEvents: 'none',
            zIndex: 10,
            transform: 'translate(-50%, -75%)'
          }}
        >
          <div
            style={{
              background: '#fff',
              border: `2px solid ${c.color || '#3182ce'}`,
              borderRadius: 10,
              padding: '1px 8px',
              fontSize: 14,
              minWidth: 24,
              color: '#2d3748',
              boxShadow: '0 0 8px #bbb5'
            }}
          >
            {c.name ? c.name.split('@')[0] : uid} <span style={{marginLeft:7, fontWeight:400, fontSize:13, color:"#718096"}}>{TOOL_LABELS[c.tool] || c.tool}</span>
          </div>
          <div
            style={{
              width: 15,
              height: 15,
              background: c.color || '#3182ce',
              borderRadius: '50%',
              margin: '2px auto 0 auto',
              border: '2px solid #fff'
            }}
          />
        </div>
      ) : null
    );

  const renderMyCursor = () => (
    myCursor.x !== null && myCursor.y !== null && (
      <div
        style={{
          position: 'absolute',
          left: myCursor.x,
          top: myCursor.y,
          pointerEvents: 'none',
          zIndex: 100,
          transform: 'translate(-50%, -90%)'
        }}
      >
        <div style={{
          background: collision ? '#ffeaea' : '#fff',
          border: '2px solid ' + (collision ? '#ff384b' : color),
          borderRadius: 10,
          padding: '1px 8px',
          fontSize: 14,
          minWidth: 24,
          color: collision ? '#a11' : '#2d3748',
          boxShadow: '0 0 8px #bbb5'
        }}>
          {(currentUser?.fullName || currentUser?.email || "You").split('@')[0]}
          <span style={{marginLeft:7, fontWeight:400, fontSize:13, color:collision?'#a11':"#718096"}}>
            {TOOL_LABELS[myCursor.tool] || myCursor.tool}
          </span>
        </div>
        <div style={{
          width: 15, height: 15,
          background: collision ? '#ff384b' : color,
          borderRadius: '50%',
          margin: '2px auto 0 auto',
          border: '2px solid #fff'
        }}/>
        {collision && (
          <div style={{
            margin: '4px auto 0 auto',
            color: "#fff",
            background: "#ff384be6",
            padding: "2px 15px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            textShadow: "0 1px 4px #9003"
          }}>
            Another user is drawing here!
          </div>
        )}
      </div>
    )
  );

  const renderUserInfo = () => (
    <div style={{
      width: '100%',
      marginBottom: 10,
      background: '#f4f6fa',
      padding: '10px 0',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 18,
      textAlign: 'center',
      boxShadow: '0 2px 8px #e1e1e1',
    }}>
      Logged in as: {currentUser?.fullName || currentUser?.username || currentUser?.email || 'Guest'}
    </div>
  );

  const renderCallNotification = () => incomingCall && (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#2d3748',
      color: '#fff',
      padding: '16px 24px',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      zIndex: 1001,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      animation: 'slideDown 0.3s ease'
    }}>
      <div style={{ fontSize: 24 }}>📞</div>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{incomingCall.from} started a video call</div>
        <div style={{ fontSize: 13, color: '#cbd5e0' }}>Join the call to chat with everyone!</div>
      </div>
      <button onClick={handleJoinCall} style={{
        padding: '8px 20px',
        borderRadius: 8,
        border: 'none',
        background: '#38a169',
        color: '#fff',
        fontWeight: 600,
        cursor: 'pointer'
      }}>Join</button>
      <button onClick={handleRejectCall} style={{
        padding: '8px 20px',
        borderRadius: 8,
        border: 'none',
        background: '#e53e3e',
        color: '#fff',
        fontWeight: 600,
        cursor: 'pointer'
      }}>Ignore</button>
    </div>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      {renderUserInfo()}
      {renderRoomMembers()}
      {renderSnapshots()}
      {renderCallNotification()}

      <button
        style={{
          margin: "10px 0",
          padding: "6px 16px",
          fontSize: "16px",
          borderRadius: 8,
          background: "#3182ce",
          color: "#fff",
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
        }}
        onClick={handleSaveCanvas}
      >
        Save Canvas State
      </button>
      {renderOwnerButtons()}

      <div className="canvas-toolbar">
        <span style={{ fontSize: 14 }}>Tool</span>
        <select
          value={tool}
          style={{ marginLeft: 8, padding: '3px 7px', borderRadius: 8, border: '1px solid #bbb', fontSize: 14 }}
          onChange={e => setTool(e.target.value)}
        >
          {TOOLS.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 14, marginLeft: 8 }}>Color</span>
        {COLORS.map(c =>
          <button
            key={c}
            className={'canvas-btn-color' + (color === c ? ' selected' : '')}
            style={{ background: c, border: color === c ? '2px solid #000' : '1px solid #bbb', marginLeft: 4, width: 24, height: 24, borderRadius: 6, cursor: 'pointer' }}
            onClick={() => { setColor(c); setTool('brush'); }}
          />
        )}
        <span style={{ fontSize: 14, marginLeft: 8 }}>Line</span>
        <select
          value={thickness}
          style={{ marginLeft: 8, padding: '3px 7px', borderRadius: 8, border: '1px solid #bbb', fontSize: 14 }}
          onChange={e => setThickness(Number(e.target.value))}
        >
          {THICKNESS.map(t =>
            <option key={t} value={t}>{t}px</option>
          )}
        </select>

        <span style={{ fontSize: 14, marginLeft: 20, fontWeight: 600 }}>Features:</span>
        <button
          style={{
            marginLeft: 8,
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            background: showVideoCall ? '#e53e3e' : '#38a169',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => showVideoCall ? setShowVideoCall(false) : handleStartVideoCall()}
        >
          📹 {showVideoCall ? 'End' : 'Start'} Video Call
        </button>
        <button
          style={{
            marginLeft: 8,
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            background: captionsEnabled ? '#e53e3e' : '#f6ad55',
            color: captionsEnabled ? '#fff' : '#2d3748',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => {
            setCaptionsEnabled(!captionsEnabled);
            if (captionsEnabled) setIsMicEnabled(false);
          }}
        >
          🎤 {captionsEnabled ? 'Disable' : 'Enable'} Captions
        </button>
        {captionsEnabled && (
          <button
            style={{
              marginLeft: 8,
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: isMicEnabled ? '#38a169' : '#718096',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={() => setIsMicEnabled(!isMicEnabled)}
          >
            {isMicEnabled ? '🎙️ Mic On' : '🔇 Mic Off'}
          </button>
        )}
      </div>

      <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H, border: '2px solid #eee', borderRadius: 14, boxShadow: '0 8px 28px #3383f022' }}>
        <canvas
          ref={canvasRef}
          className="canvas-canvas-area"
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ cursor: CURSORS[tool] || 'crosshair', borderRadius: 12, background: '#fcfcfc' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={stop}
          onMouseLeave={stop}
        />
        {renderMyCursor()}
        {renderOtherCursors()}
      </div>

      {showVideoCall && (
        <VideoCall
          roomId={roomId}
          token={token}
          currentUser={currentUser}
          wsUrl={useDrawingCanvas.WS_URL || ''}
          isMinimized={isVideoMinimized}
          onToggleMinimize={() => setIsVideoMinimized(!isVideoMinimized)}
          onClose={() => setShowVideoCall(false)}
        />
      )}

      <LiveCaptions
        websocket={wsRef.current}
        isEnabled={captionsEnabled}
        isMicEnabled={isMicEnabled}
        currentUser={currentUser}
        isMinimized={isCaptionsMinimized}
        onToggle={() => setIsCaptionsMinimized(!isCaptionsMinimized)}
      />

      <ChatBox
        websocket={wsRef.current}
        currentUser={currentUser}
        isMinimized={isChatMinimized}
        onToggle={() => setIsChatMinimized(!isChatMinimized)}
      />
    </div>
  );
}

export default DrawingCanvas;
