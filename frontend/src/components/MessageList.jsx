import React, { useState } from 'react';
import './MessageList.css';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];

const MessageList = ({ messages, currentUser, onEditMessage, onDeleteMessage, onSelectMessage, selectedMessages }) => {
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'sent':
        return 'status-sent';
      case 'delivered':
        return 'status-delivered';
      case 'read':
        return 'status-read';
      default:
        return '';
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message._id);
    setEditText(message.text);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;

    try {
      await onEditMessage(editingMessage, editText);
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDelete = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await onDeleteMessage(messageId);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }

      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const getReactionCount = (message, emoji) => {
    return message.reactions.filter(r => r.emoji === emoji).length;
  };

  const hasReacted = (message, emoji) => {
    return message.reactions.some(
      r => r.emoji === emoji && r.user._id === currentUser._id
    );
  };

  const handleMessageClick = (messageId) => {
    if (selectedMessages.length > 0) {
      onSelectMessage(messageId);
    }
  };

  const handleMessageLongPress = (messageId) => {
    onSelectMessage(messageId);
  };

  const handlePinMessage = async (messageId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${messageId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to pin/unpin message');
      }

      const updatedMessage = await response.json();
      setMessages(prev => prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      ));
    } catch (error) {
      console.error('Error pinning/unpinning message:', error);
    }
  };

  const renderMessage = (message) => {
    const isCurrentUser = message.sender._id === currentUser._id;
    const isSelected = selectedMessages.includes(message._id);

    return (
      <div
        id={`message-${message._id}`}
        key={message._id}
        className={`message ${isCurrentUser ? 'sent' : 'received'} ${isSelected ? 'selected' : ''} ${message.pinned ? 'pinned' : ''}`}
        onClick={() => handleMessageClick(message._id)}
        onContextMenu={(e) => {
          e.preventDefault();
          handleMessageLongPress(message._id);
        }}
      >
        {!isCurrentUser && (
          <div className="message-avatar">
            {message.sender.avatar ? (
              <img src={message.sender.avatar} alt={message.sender.username} />
            ) : (
              message.sender.username.charAt(0).toUpperCase()
            )}
          </div>
        )}
        <div className="message-content">
          {message.pinned && (
            <div className="pinned-indicator">
              📌 Pinned by {message.pinnedBy.username}
            </div>
          )}
          {editingMessage === message._id ? (
            <form onSubmit={handleEditSubmit} className="edit-form">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div className="edit-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingMessage(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              {message.attachments && message.attachments.length > 0 && (
                <div className="message-attachments">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="attachment">
                      {attachment.type === 'image' ? (
                        <img src={attachment.url} alt={attachment.name} />
                      ) : (
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="file-attachment">
                          <span className="file-icon">📎</span>
                          <span className="file-name">{attachment.name}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="message-text">{message.text}</div>
              <div className="message-meta">
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.edited && (
                  <span className="edited-indicator">(edited)</span>
                )}
                {message.sender._id === currentUser._id && (
                  <span className={`message-status ${getStatusClass(message.status)}`}>
                    {getStatusIcon(message.status)}
                  </span>
                )}
              </div>
              {message.reactions && message.reactions.length > 0 && (
                <div className="message-reactions">
                  {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => (
                    <button
                      key={emoji}
                      className={`reaction-button ${hasReacted(message, emoji) ? 'reacted' : ''}`}
                      onClick={() => handleReaction(message._id, emoji)}
                    >
                      <span className="emoji">{emoji}</span>
                      <span className="count">{getReactionCount(message, emoji)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="message-actions">
                <button onClick={() => setShowReactionPicker(message._id)} className="reaction-button">
                  😀
                </button>
                <button onClick={() => handlePinMessage(message._id)} className="pin-button">
                  {message.pinned ? '📌' : '📍'}
                </button>
                {message.sender._id === currentUser._id && (
                  <>
                    <button onClick={() => handleEdit(message)} className="edit-button">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(message._id)} className="delete-button">
                      🗑️
                    </button>
                  </>
                )}
              </div>
              {showReactionPicker === message._id && (
                <div className="reaction-picker">
                  {EMOJI_LIST.map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-button"
                      onClick={() => handleReaction(message._id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="message-list">
      {messages.map(renderMessage)}
    </div>
  );
};

export default MessageList; 