import { useState, useRef, useEffect } from 'react';
import Peer from 'simple-peer';

export function useVideoCall({ roomId, token, currentUser, wsUrl, onClose }) {
  const [peers, setPeers] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);
  const [userLeftNotification, setUserLeftNotification] = useState(null);

  const localVideoRef = useRef();
  const peerRefs = useRef({});
  const wsRef = useRef(null);

  useEffect(() => {
    const initVideoCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        connectToSignaling(stream);
      } catch (err) {
        setError('Camera/microphone access denied. Please allow access and refresh.');
      }
    };
    initVideoCall();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerRefs.current).forEach(peer => {
        if (peer && peer.destroy) peer.destroy();
      });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line
  }, []);

  const connectToSignaling = (stream) => {
    const ws = new WebSocket(
      `${wsUrl}/webrtc/${roomId}?token=${encodeURIComponent(token)}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        userName: currentUser?.fullName || currentUser?.email || 'Anonymous',
        userId: currentUser?.email || currentUser?.user_id || 'anonymous'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message, stream);
      } catch (e) {}
    };

    ws.onerror = () => setError('Connection error. Please try again.');
    ws.onclose = () => {};
  };

  const handleSignalingMessage = (message, stream) => {
    switch (message.type) {
      case 'user-joined':
        createPeer(message.userId, message.userName, true, stream);
        break;
      case 'offer':
        handleOffer(message.fromUserId, message.userName, message.sdp, stream);
        break;
      case 'answer':
        handleAnswer(message.fromUserId, message.sdp);
        break;
      case 'ice-candidate':
        handleIceCandidate(message.fromUserId, message.candidate);
        break;
      case 'user-left':
        if (message.userName) {
          setUserLeftNotification(message.userName);
          setTimeout(() => setUserLeftNotification(null), 4000);
        }
        removePeer(message.userId);
        break;
      default:
    }
  };

  const createPeer = (userId, userName, initiator, stream) => {
    if (peerRefs.current[userId]) return;
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: initiator ? 'offer' : 'answer',
          targetUserId: userId,
          userName: currentUser?.fullName || currentUser?.email || 'Anonymous',
          sdp: signal
        }));
      }
    });

    peer.on('stream', (remoteStream) => {
      setPeers(prev => ({
        ...prev,
        [userId]: { stream: remoteStream, userId, userName: userName || userId }
      }));
    });

    peer.on('error', () => {});
    peer.on('close', () => removePeer(userId));

    peerRefs.current[userId] = peer;
  };

  const handleOffer = (userId, userName, offerSignal, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'answer',
          targetUserId: userId,
          userName: currentUser?.fullName || currentUser?.email || 'Anonymous',
          sdp: signal
        }));
      }
    });

    peer.on('stream', (remoteStream) => {
      setPeers(prev => ({
        ...prev,
        [userId]: { stream: remoteStream, userId, userName: userName || userId }
      }));
    });

    peer.on('error', () => {});
    peer.signal(offerSignal);

    peerRefs.current[userId] = peer;
  };

  const handleAnswer = (userId, answerSignal) => {
    const peer = peerRefs.current[userId];
    if (peer) {
      peer.signal(answerSignal);
    }
  };

  const handleIceCandidate = (userId, candidate) => {
    const peer = peerRefs.current[userId];
    if (peer) {
      peer.signal(candidate);
    }
  };

  const removePeer = (userId) => {
    if (peerRefs.current[userId]) {
      if (peerRefs.current[userId].destroy) {
        peerRefs.current[userId].destroy();
      }
      delete peerRefs.current[userId];
    }
    setPeers(prev => {
      const newPeers = { ...prev };
      delete newPeers[userId];
      return newPeers;
    });
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        userName: currentUser?.fullName || currentUser?.email || 'User'
      }));
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    Object.values(peerRefs.current).forEach(peer => {
      if (peer && peer.destroy) peer.destroy();
    });
    onClose();
  };

  return {
    peers,
    localVideoRef,
    isMuted,
    isVideoOff,
    error,
    userLeftNotification,
    toggleMute,
    toggleVideo,
    handleEndCall,
  };
}
