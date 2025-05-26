import React, { useState, useEffect } from 'react';
import './PinnedMessages.css';

const PinnedMessages = ({ conversationId, token, onClose, onSelectMessage }) => {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPinnedMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}/pinned`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch pinned messages');
        }

        const data = await response.json();
        setPinnedMessages(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPinnedMessages();
  }, [conversationId, token]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="pinned-messages-overlay">
        <div className="pinned-messages-modal">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pinned-messages-overlay">
      <div className="pinned-messages-modal">
        <div className="pinned-messages-header">
          <h3>Pinned Messages</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {pinnedMessages.length === 0 ? (
          <div className="no-pinned-messages">No pinned messages</div>
        ) : (
          <div className="pinned-messages-list">
            {pinnedMessages.map(message => (
              <div
                key={message._id}
                className="pinned-message"
                onClick={() => onSelectMessage(message)}
              >
                <div className="pinned-message-header">
                  <div className="sender-info">
                    {message.sender.avatar ? (
                      <img src={message.sender.avatar} alt={message.sender.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {message.sender.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="sender-name">{message.sender.username}</span>
                  </div>
                  <div className="pinned-info">
                    Pinned by {message.pinnedBy.username} • {formatDate(message.pinnedAt)}
                  </div>
                </div>
                <div className="pinned-message-content">
                  {message.text}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="pinned-attachments">
                      {message.attachments.map((attachment, index) => (
                        <div key={index} className="attachment-preview">
                          {attachment.type === 'image' ? (
                            <img src={attachment.url} alt={attachment.name} />
                          ) : (
                            <span className="file-icon">📎 {attachment.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinnedMessages; 