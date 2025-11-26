import { useRef, useEffect, useState } from "react";

export const CANVAS_W = 1200;
export const CANVAS_H = 700;
export const COLLISION_RADIUS = 24;
export const COLORS = ['#e53e3e', '#3182ce', '#38a169', '#f6ad55', '#2d3748', '#555'];
export const THICKNESS = [2, 4, 6, 8, 12];
export const TOOLS = [
  { key: 'brush', label: 'Brush' },
  { key: 'eraser', label: 'Eraser' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'ellipse', label: 'Ellipse' },
  { key: 'text', label: 'Text' },
  { key: 'undo', label: 'Undo' }
];
export const TOOL_LABELS = {
  brush: "Brush", eraser: "Eraser", rectangle: "Rectangle", ellipse: "Ellipse", text: "Text", undo: "Undo"
};
export const CURSORS = {
  brush: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='8' fill='white' stroke='blue' stroke-width='3'/></svg>\") 16 16, crosshair",
  eraser: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='7' y='10' width='18' height='8' rx='4' fill='pink' stroke='gray' stroke-width='2'/></svg>\") 16 14, pointer",
  rectangle: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='8' y='8' width='16' height='10' stroke='red' fill='white' stroke-width='3'/></svg>\") 16 16, crosshair",
  ellipse: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><ellipse cx='16' cy='16' rx='8' ry='5' stroke='green' fill='white' stroke-width='3'/></svg>\") 16 16, crosshair",
  text: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text x='4' y='22' font-size='18' font-family='Arial' fill='black'>T</text></svg>\") 6 22, text",
  undo: "crosshair"
};

export function useDrawingCanvas({ currentUser, roomId, token }) {
  // Environment variables
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

  // Refs
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  // State
  const [drawing, setDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: null, y: null });
  const [color, setColor] = useState(COLORS[1]);
  const [thickness, setThickness] = useState(4);
  const [tool, setTool] = useState('brush');
  const [shapeStart, setShapeStart] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [myCursor, setMyCursor] = useState({ x: null, y: null, tool: 'brush' });
  const [collision, setCollision] = useState(false);
  const [localStrokes, setLocalStrokes] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Feature states
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCaptionsMinimized, setIsCaptionsMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Auth header
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Owner check
  const isOwner = currentUser?.role === 'OWNER' || (
    currentUser && currentUser.user_id && currentUser.user_id === currentUser.owner_id
  );

  // --- Utility functions ---

  function isColliding(x, y) {
    return Object.values(remoteCursors).some(
      c => c.x !== null && c.y !== null &&
        Math.abs(c.x - x) < COLLISION_RADIUS &&
        Math.abs(c.y - y) < COLLISION_RADIUS
    );
  }

  const clearAndRedraw = (strokes) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    strokes.forEach(drawStroke);
  };

  function drawStroke(stroke) {
    const ctx = canvasRef.current.getContext('2d');
    if (['draw', 'brush', 'eraser'].includes(stroke.type)) {
      ctx.beginPath();
      ctx.moveTo(stroke.fromX, stroke.fromY);
      ctx.lineTo(stroke.toX, stroke.toY);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.stroke();
    }
    if (stroke.type === 'rectangle') {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.strokeRect(
        stroke.fromX, stroke.fromY,
        stroke.toX - stroke.fromX, stroke.toY - stroke.fromY
      );
    }
    if (stroke.type === 'ellipse') {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.beginPath();
      ctx.ellipse(
        (stroke.fromX + stroke.toX) / 2,
        (stroke.fromY + stroke.toY) / 2,
        Math.abs((stroke.toX - stroke.fromX) / 2),
        Math.abs((stroke.toY - stroke.fromY) / 2),
        0, 0, 2 * Math.PI
      );
      ctx.stroke();
    }
    if (stroke.type === 'text') {
      ctx.fillStyle = stroke.color;
      ctx.font = `${stroke.fontSize || 20}px sans-serif`;
      ctx.fillText(stroke.value, stroke.x, stroke.y);
    }
  }

  // --- Effects and async handlers ---

  useEffect(() => {
    async function loadCanvasState() {
      try {
        const resp = await fetch(`${API_URL}/canvas/load/${roomId}`, {
          headers: { ...authHeaders }
        });
        if (resp.ok) {
          const data = await resp.json();
          const strokes = JSON.parse(data.state_json || "[]");
          setLocalStrokes(strokes);
          clearAndRedraw(strokes);
        } else {
          setLocalStrokes([]);
          clearAndRedraw([]);
        }
      } catch (e) {
        setLocalStrokes([]);
        clearAndRedraw([]);
      }
    }
    loadCanvasState();
  }, [roomId, token, clearing]);

  const fetchSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const result = await fetch(`${API_URL}/canvas/snapshots/${roomId}`, {
        headers: { ...authHeaders }
      });
      if (result.ok) {
        const arr = await result.json();
        setSnapshots(arr);
      }
    } catch (e) {}
    setLoadingSnapshots(false);
  };

  useEffect(() => {
    fetchSnapshots();
    // eslint-disable-next-line
  }, [roomId, token]);

  const handleSaveSnapshot = async () => {
    try {
      const r = await fetch(`${API_URL}/canvas/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          room_id: roomId,
          state_json: JSON.stringify(localStrokes)
        })
      });
      if (r.ok) {
        alert("Snapshot/version saved!");
        fetchSnapshots();
      } else {
        alert("Failed to save snapshot.");
      }
    } catch (e) {
      alert("Failed to save snapshot.");
    }
  };

  const handleRestoreSnapshot = async (snapshot_id) => {
    try {
      const r = await fetch(`${API_URL}/canvas/snapshot/${snapshot_id}`, {
        headers: { ...authHeaders }
      });
      if (r.ok) {
        const snap = await r.json();
        const strokes = JSON.parse(snap.state_json || "[]");
        setLocalStrokes(strokes);
        clearAndRedraw(strokes);
        alert(`Loaded version from ${new Date(snap.created_at).toLocaleString()}`);
      } else {
        alert("Failed to load snapshot.");
      }
    } catch (e) {
      alert("Failed to load snapshot.");
    }
  };

  const handleSaveCanvas = async () => {
    try {
      await fetch(`${API_URL}/canvas/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          room_id: roomId,
          state_json: JSON.stringify(localStrokes)
        })
      });
      alert("Canvas state saved!");
    } catch (e) {
      alert("Failed to save canvas state.");
    }
  };

  const handleClearCanvas = async () => {
    if (!window.confirm('Are you sure you want to clear the canvas for everyone?')) return;
    setClearing(true);
    try {
      const response = await fetch(`${API_URL}/canvas/clear/${roomId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        alert('Canvas cleared!');
        setClearing(false);
        const data = await response.json();
        setLocalStrokes([]);
        clearAndRedraw([]);
      } else {
        setClearing(false);
        const error = await response.json();
        alert(`Failed to clear canvas: ${error.detail}`);
      }
    } catch (error) {
      setClearing(false);
      alert('Error clearing canvas');
    }
  };

  const handleStartVideoCall = () => {
    setShowVideoCall(true);
    setIsVideoMinimized(false);
    sendWS({
      type: 'video_call_started',
      userId: currentUser?.email || 'anonymous',
      userName: currentUser?.fullName || currentUser?.email || 'Anonymous'
    });
  };

  const handleJoinCall = () => {
    setShowVideoCall(true);
    setIsVideoMinimized(false);
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    setIncomingCall(null);
  };

  useEffect(() => {
    wsRef.current = new window.WebSocket(`${WS_URL}/ws/${roomId}?token=${token}`);
    const ws = wsRef.current;
    ws.onopen = () => {};
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (
        ['draw', 'brush', 'eraser', 'rectangle', 'ellipse', 'text'].includes(msg.type)
      ) {
        drawStroke(msg);
        setLocalStrokes(prev => [...prev, msg]);
      }
      if (msg.type === "undo") {
        clearAndRedraw(msg.shapes || []);
        setLocalStrokes(msg.shapes || []);
      }
      if (msg.type === "cursor" && msg.userId !== (currentUser?.email || "anonymous")) {
        setRemoteCursors(prev => ({
          ...prev,
          [msg.userId]: {
            x: msg.x,
            y: msg.y,
            name: msg.name,
            color: msg.cursorColor,
            tool: msg.tool
          }
        }));
      }

      if (msg.type === 'video_call_started' && msg.userId !== (currentUser?.email || 'anonymous')) {
        if (!showVideoCall) {
          setIncomingCall({
            from: msg.userName,
            userId: msg.userId
          });
        }
      }
    };
    ws.onclose = () => {};
    return () => ws.close();
    // eslint-disable-next-line
  }, [roomId, currentUser, showVideoCall]);

  const sendWS = (obj) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(obj));
    }
  };

  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_H)
    };
  };

  const handleUndo = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    sendWS({ type: 'undo' });
    setLocalStrokes([]);
  };

  const start = e => {
    const { x, y } = getCanvasCoords(e);
    if (tool === 'undo') {
      handleUndo();
      setTool('brush');
      return;
    }
    if (tool === 'text') {
      const value = window.prompt("Enter your text:");
      if (value) {
        const stroke = { type: 'text', x, y, value, color, fontSize: 20 };
        drawStroke(stroke);
        sendWS(stroke);
        setLocalStrokes(prev => [...prev, stroke]);
      }
      return;
    }
    if (tool === 'rectangle' || tool === 'ellipse') {
      setShapeStart({ x, y });
      setDrawing(true);
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = tool === 'eraser' ? '#f9fafb' : color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    setLastPosition({ x, y });
  };

  const move = e => {
    const { x, y } = getCanvasCoords(e);
    setMyCursor({ x, y, tool });

    if (drawing && isColliding(x, y)) {
      setCollision(true);
      return;
    } else {
      setCollision(false);
    }
    sendWS({
      type: "cursor",
      userId: currentUser?.email || "anonymous",
      name: currentUser?.fullName || currentUser?.email || "anonymous",
      x, y,
      cursorColor: color,
      tool: tool
    });

    if (!drawing) return;
    if (tool === 'rectangle' || tool === 'ellipse') return;

    const ctx = canvasRef.current.getContext('2d');
    const drawColor = tool === 'eraser' ? '#f9fafb' : color;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = thickness;
    ctx.lineTo(x, y);
    ctx.stroke();
    if (lastPosition.x !== null) {
      const payload = {
        type: tool,
        fromX: lastPosition.x,
        fromY: lastPosition.y,
        toX: x,
        toY: y,
        color: drawColor,
        thickness
      };
      sendWS(payload);
      setLocalStrokes(prev => [...prev, payload]);
    }
    setLastPosition({ x, y });
  };

  useEffect(() => {
    if (myCursor.x !== null && myCursor.y !== null) {
      sendWS({
        type: "cursor",
        userId: currentUser?.email || "anonymous",
        name: currentUser?.fullName || currentUser?.email || "anonymous",
        x: myCursor.x,
        y: myCursor.y,
        cursorColor: color,
        tool: tool
      });
    }
    setMyCursor(cur => ({ ...cur, tool }));
    // eslint-disable-next-line
  }, [tool]);

  const stop = e => {
    setDrawing(false);
    setLastPosition({ x: null, y: null });
    if (tool === 'rectangle' || tool === 'ellipse') {
      if (!shapeStart) return;
      const { x, y } = getCanvasCoords(e);

      const newShape = {
        type: tool,
        fromX: shapeStart.x,
        fromY: shapeStart.y,
        toX: x,
        toY: y,
        color,
        thickness
      };
      drawStroke(newShape);
      sendWS(newShape);
      setLocalStrokes(prev => [...prev, newShape]);
      setShapeStart(null);
    }
  };

  // Expose all states & handlers for the component
  return {
    canvasRef,
    wsRef,
    drawing, setDrawing,
    lastPosition, setLastPosition,
    color, setColor,
    thickness, setThickness,
    tool, setTool,
    shapeStart, setShapeStart,
    remoteCursors, setRemoteCursors,
    myCursor, setMyCursor,
    collision, setCollision,
    localStrokes, setLocalStrokes,
    snapshots, setSnapshots,
    loadingSnapshots, setLoadingSnapshots,
    clearing, setClearing,

    isChatMinimized, setIsChatMinimized,
    showVideoCall, setShowVideoCall,
    isVideoMinimized, setIsVideoMinimized,
    captionsEnabled, setCaptionsEnabled,
    isMicEnabled, setIsMicEnabled,
    isCaptionsMinimized, setIsCaptionsMinimized,
    incomingCall, setIncomingCall,

    isOwner,
    API_URL, WS_URL,
    authHeaders,

    clearAndRedraw,
    isColliding,
    drawStroke,
    fetchSnapshots,
    handleSaveSnapshot,
    handleRestoreSnapshot,
    handleSaveCanvas,
    handleClearCanvas,
    handleStartVideoCall,
    handleJoinCall,
    handleRejectCall,
    sendWS,
    getCanvasCoords,
    handleUndo,
    start,
    move,
    stop
  };
}
