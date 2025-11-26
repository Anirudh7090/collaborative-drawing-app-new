import { useState, useEffect, useRef } from "react";

// Custom hook for ChatBox component
export function useChatBox({ websocket, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for incoming chat messages from WebSocket
  useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Only handle chat messages
        if (data.type === 'chat') {
          setMessages(prev => [...prev, data.data]);
        }
      } catch (e) {
        console.error('Error parsing chat message:', e);
      }
    };

    websocket.addEventListener('message', handleMessage);

    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket]);

  // Send chat message
  const sendMessage = () => {
    if (inputMessage.trim() && websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'chat',
        message: inputMessage.trim()
      }));
      setInputMessage('');
    }
  };

  // Handle Enter key to send message
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Expose everything the component needs
  return {
    messages,
    inputMessage,
    setInputMessage,
    messagesEndRef,
    sendMessage,
    handleKeyPress,
    currentUser,
  };
}
