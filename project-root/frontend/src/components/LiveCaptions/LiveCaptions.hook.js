import { useState, useEffect, useRef } from 'react';

export const CAPTION_DURATION = 35000; // ms

export function useLiveCaptions({ websocket, isEnabled, isMicEnabled, currentUser }) {
  const [captions, setCaptions] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [recognitionReady, setRecognitionReady] = useState(true); // false if SpeechRecognition is not supported
  const recognitionRef = useRef(null);
  const captionsEndRef = useRef(null);

  // Auto-scroll to newest caption
  useEffect(() => {
    if (captionsEndRef.current) {
      captionsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [captions, currentTranscript]);

  // Remove old captions after CAPTION_DURATION
  useEffect(() => {
    if (captions.length === 0) return;
    const timer = setInterval(() => {
      setCaptions(prev => {
        const now = Date.now();
        return prev.filter(caption => {
          const captionTime = new Date(caption.timestamp).getTime();
          return now - captionTime < CAPTION_DURATION;
        });
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [captions]);

  // Speech recognition logic
  useEffect(() => {
    if (!isMicEnabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setCurrentTranscript('');
      return;
    }
    if (!isEnabled) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionReady(false);
      return;
    }
    setRecognitionReady(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = event => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      setCurrentTranscript(interimTranscript);

      if (finalTranscript && websocket && websocket.readyState === WebSocket.OPEN) {
        const captionData = {
          text: finalTranscript.trim(),
          timestamp: new Date().toISOString(),
        };

        setCaptions(prev => [
          ...prev,
          {
            ...captionData,
            id: Date.now() + Math.random(),
            user: currentUser?.fullName || currentUser?.email || 'You',
            isOwn: true,
          },
        ]);
        websocket.send(
          JSON.stringify({
            type: 'caption',
            text: finalTranscript.trim(),
          })
        );
        setCurrentTranscript('');
      }
    };

    recognition.onerror = event => {
      // Try to restart if possible, deal with common errors
      if (event.error === 'no-speech') {
      } else if (event.error === 'aborted') {
        setTimeout(() => {
          if (isMicEnabled && recognitionRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        }, 100);
      }
    };

    recognition.onend = () => {
      if (isMicEnabled && recognitionRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isEnabled, isMicEnabled, websocket, currentUser]);

  // Listen for captions from other users
  useEffect(() => {
    if (!websocket) return;

    const handleMessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'caption' && data.data) {
          setCaptions(prev => [
            ...prev,
            {
              text: data.data.text,
              user: data.data.user,
              timestamp: data.data.timestamp,
              id: Date.now() + Math.random(),
              isOwn: false,
            },
          ]);
        }
      } catch {}
    };

    websocket.addEventListener('message', handleMessage);
    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket]);

  return {
    captions,
    currentTranscript,
    captionsEndRef,
    recognitionReady,
  };
}
