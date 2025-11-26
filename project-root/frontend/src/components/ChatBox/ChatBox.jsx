import React from 'react';
import './ChatBox.css';
import { useChatBox } from './ChatBox.hook';

function ChatBox({ websocket, currentUser, isMinimized, onToggle }) {
  const {
    messages,
    inputMessage,
    setInputMessage,
    messagesEndRef,
    sendMessage,
    handleKeyPress,
  } = useChatBox({ websocket, currentUser });

  return (
    <div className={`chat-box ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header" onClick={onToggle}>
        <h3>💬 Chat</h3>
        <button className="toggle-btn">{isMinimized ? '▲' : '▼'}</button>
      </div>

      {!isMinimized && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="no-messages">No messages yet. Start chatting!</div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.user_id === currentUser?.id ? 'own-message' : 'other-message'}`}
              >
                <div className="message-header">
                  <strong className="message-user">{msg.user}</strong>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="message-text">{msg.message}</div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={!websocket || websocket.readyState !== WebSocket.OPEN}
            />
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={!inputMessage.trim() || !websocket || websocket.readyState !== WebSocket.OPEN}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatBox;
