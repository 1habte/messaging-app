import React, { useState, useEffect } from 'react';
import './MessageSearch.css';

const MessageSearch = ({ onSelectMessage, token, currentConversation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const searchMessages = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const url = new URL('http://localhost:5000/api/messages/search');
        url.searchParams.append('query', searchQuery);
        if (currentConversation) {
          url.searchParams.append('conversationId', currentConversation._id);
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to search messages');
        }

        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        setError(error.message);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMessages, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, token, currentConversation]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="message-search">
      <div className="search-input-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="search-input"
        />
        {isLoading && <div className="search-spinner"></div>}
      </div>

      {error && <div className="search-error">{error}</div>}

      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map(message => (
            <div
              key={message._id}
              className="search-result-item"
              onClick={() => onSelectMessage(message)}
            >
              <div className="result-header">
                <div className="result-sender">
                  {message.sender.avatar ? (
                    <img src={message.sender.avatar} alt={message.sender.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {message.sender.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="sender-name">{message.sender.username}</span>
                </div>
                <div className="result-conversation">
                  {message.conversationId.isGroup
                    ? `in ${message.conversationId.groupName}`
                    : 'in direct message'}
                </div>
                <div className="result-time">{formatDate(message.timestamp)}</div>
              </div>
              <div className="result-content">
                {message.text}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="result-attachments">
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

      {searchQuery && !isLoading && searchResults.length === 0 && (
        <div className="no-results">No messages found</div>
      )}
    </div>
  );
};

export default MessageSearch; 