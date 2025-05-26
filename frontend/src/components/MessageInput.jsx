import React, { useState, useRef } from 'react';
import './MessageInput.css';

const MessageInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    setIsUploading(true);
    try {
      // Upload attachments first
      const uploadedAttachments = await Promise.all(
        attachments.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('Failed to upload file');
          }

          const data = await response.json();
          return {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            url: data.url,
            name: file.name
          };
        })
      );

      // Send message with attachments
      onSendMessage(message, uploadedAttachments);
      setMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((file, index) => (
            <div key={index} className="attachment-preview">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt={file.name} />
              ) : (
                <div className="file-preview">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{file.name}</span>
                </div>
              )}
              <button
                type="button"
                className="remove-attachment"
                onClick={() => removeAttachment(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="input-container">
        <button
          type="button"
          className="attach-button"
          onClick={triggerFileInput}
          disabled={isUploading}
        >
          📎
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          style={{ display: 'none' }}
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={isUploading}
        />
        <button
          type="submit"
          className="send-button"
          disabled={isUploading || (!message.trim() && attachments.length === 0)}
        >
          {isUploading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
};

export default MessageInput; 