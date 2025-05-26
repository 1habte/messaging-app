import React from 'react';
import './ConversationList.css';

const ConversationList = ({ conversations, selectedConversation, onSelectConversation }) => {
  return (
    <div className="conversation-list">
      {conversations.map((conversation) => (
        <div
          key={conversation._id}
          className={`conversation-item ${selectedConversation?._id === conversation._id ? 'selected' : ''}`}
          onClick={() => onSelectConversation(conversation)}
        >
          <div className="conversation-avatar">
            {conversation.isGroup ? (
              conversation.groupAvatar ? (
                <img src={conversation.groupAvatar} alt={conversation.groupName} />
              ) : (
                conversation.groupName.charAt(0)
              )
            ) : (
              conversation.participants
                .find(p => p._id !== conversation.participants[0]._id)
                ?.avatar ? (
                <img
                  src={conversation.participants.find(p => p._id !== conversation.participants[0]._id).avatar}
                  alt={conversation.participants.find(p => p._id !== conversation.participants[0]._id).username}
                />
              ) : (
                conversation.participants
                  .find(p => p._id !== conversation.participants[0]._id)
                  ?.username.charAt(0)
              )
            )}
          </div>
          <div className="conversation-content">
            <div className="conversation-header">
              <span className="conversation-name">
                {conversation.isGroup
                  ? conversation.groupName
                  : conversation.participants.find(p => p._id !== conversation.participants[0]._id)?.username}
              </span>
              <span className="conversation-time">
                {new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="conversation-preview">
              <span className="conversation-message">{conversation.lastMessage}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationList; 