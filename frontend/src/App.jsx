import React, { useState, useEffect } from 'react';
import './App.css';
import ConversationList from './components/ConversationList';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import Auth from './components/Auth';
import Profile from './components/Profile';
import GroupChat from './components/GroupChat';
import MessageSearch from './components/MessageSearch';
import io from 'socket.io-client';
import UserSearch from './components/UserSearch';
import PinnedMessages from './components/PinnedMessages';
import UserList from './components/UserList';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
      });

      newSocket.on('message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('message updated', (updatedMessage) => {
        setMessages(prev => prev.map(msg => 
          msg._id === updatedMessage._id ? updatedMessage : msg
        ));
      });

      newSocket.on('message deleted', (messageId) => {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token]);

  useEffect(() => {
    if (selectedConversation && token) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation, token]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleAuth = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setSelectedConversation(null);
    setMessages([]);
    setConversations([]);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (socket) {
      socket.disconnect();
    }
  };

  const handleSendMessage = async (content, attachments = []) => {
    if (!selectedConversation || (!content.trim() && attachments.length === 0)) return;

    try {
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: selectedConversation._id,
          content,
          attachments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const message = await response.json();
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStartConversation = (conversation) => {
    setSelectedConversation(conversation);
    setConversations(prev => {
      const exists = prev.some(c => c._id === conversation._id);
      if (!exists) {
        return [conversation, ...prev];
      }
      return prev.map(c => c._id === conversation._id ? conversation : c);
    });
  };

  const handleUpdateProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleEditMessage = async (messageId, newText) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newText })
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      const updatedMessage = await response.json();
      setMessages(prev => prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      ));
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  const handleCreateGroup = (group) => {
    setConversations(prev => [group, ...prev]);
    setSelectedConversation(group);
  };

  const handleMessageSelect = (messageId) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      }
      return [...prev, messageId];
    });
  };

  const handleForwardMessages = async (conversationIds) => {
    try {
      const response = await fetch('http://localhost:5000/api/messages/forward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageIds: selectedMessages,
          conversationIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to forward messages');
      }

      setSelectedMessages([]);
      setShowForwardModal(false);
    } catch (error) {
      console.error('Error forwarding messages:', error);
    }
  };

  const handleSearchMessage = (message) => {
    setShowSearch(false);
    if (message.conversationId._id !== selectedConversation?._id) {
      setSelectedConversation(message.conversationId);
    }
    // Scroll to the message in the conversation
    const messageElement = document.getElementById(`message-${message._id}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight-message');
      setTimeout(() => {
        messageElement.classList.remove('highlight-message');
      }, 2000);
    }
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="user-info">
          <div 
            className="user-avatar"
            onClick={() => setShowProfile(true)}
            style={{ cursor: 'pointer' }}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="user-details">
            <div className="username">{user.username}</div>
            <div className="email">{user.email}</div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className="sidebar-actions">
          <button
            className="new-group-button"
            onClick={() => setShowGroupChat(true)}
          >
            New Group
          </button>
        </div>
        {token && (
          <>
            <UserList onStartConversation={handleStartConversation} token={token} />
            <UserSearch onStartConversation={handleStartConversation} token={token} />
          </>
        )}
        <ConversationList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
        />
      </div>
      <div className="chat-area">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-title">
                {selectedConversation.isGroup ? (
                  <>
                    {selectedConversation.groupName}
                    <span className="participant-count">
                      ({selectedConversation.participants.length} members)
                    </span>
                  </>
                ) : (
                  selectedConversation.participants
                    .find(p => p._id !== user._id)
                    ?.username
                )}
              </div>
              <div className="chat-actions">
                <button
                  className="pinned-button"
                  onClick={() => setShowPinnedMessages(true)}
                  title="View pinned messages"
                >
                  📌
                </button>
                <button
                  className="search-button"
                  onClick={() => setShowSearch(true)}
                  title="Search messages"
                >
                  🔍
                </button>
              </div>
            </div>
            <MessageList
              messages={messages}
              currentUser={user}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onSelectMessage={handleMessageSelect}
              selectedMessages={selectedMessages}
            />
            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="no-conversation">
            Select a conversation or start a new one
          </div>
        )}
      </div>
      {showProfile && (
        <Profile
          user={user}
          token={token}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
      {showGroupChat && (
        <GroupChat
          onClose={() => setShowGroupChat(false)}
          onGroupCreated={handleCreateGroup}
          token={token}
        />
      )}
      {showForwardModal && (
        <div className="forward-modal">
          <div className="forward-content">
            <h3>Forward to</h3>
            <div className="conversation-list">
              {conversations.map(conversation => (
                <div
                  key={conversation._id}
                  className="conversation-item"
                  onClick={() => handleForwardMessages([conversation._id])}
                >
                  <div className="conversation-avatar">
                    {conversation.isGroup ? (
                      conversation.groupAvatar ? (
                        <img src={conversation.groupAvatar} alt={conversation.groupName} />
                      ) : (
                        conversation.groupName.charAt(0).toUpperCase()
                      )
                    ) : (
                      conversation.participants
                        .find(p => p._id !== user._id)
                        ?.avatar ? (
                        <img
                          src={conversation.participants.find(p => p._id !== user._id).avatar}
                          alt={conversation.participants.find(p => p._id !== user._id).username}
                        />
                      ) : (
                        conversation.participants
                          .find(p => p._id !== user._id)
                          ?.username.charAt(0).toUpperCase()
                      )
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">
                      {conversation.isGroup
                        ? conversation.groupName
                        : conversation.participants.find(p => p._id !== user._id)?.username}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="cancel-button"
              onClick={() => setShowForwardModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {showSearch && (
        <MessageSearch
          onSelectMessage={handleSearchMessage}
          token={token}
          currentConversation={selectedConversation}
        />
      )}
      {showPinnedMessages && selectedConversation && (
        <PinnedMessages
          conversationId={selectedConversation._id}
          token={token}
          onClose={() => setShowPinnedMessages(false)}
          onSelectMessage={handleSearchMessage}
        />
      )}
    </div>
  );
}

export default App; 