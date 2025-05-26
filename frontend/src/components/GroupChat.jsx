import React, { useState, useEffect } from 'react';
import './GroupChat.css';

const GroupChat = ({ onClose, onGroupCreated, token }) => {
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchQuery) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/search?q=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setSearchResults(data.filter(user => !selectedUsers.find(u => u._id === user._id)));
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
  };

  const handleUserRemove = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user._id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (selectedUsers.length < 2) {
      setError('Please select at least 2 participants');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/conversations/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupName,
          participants: selectedUsers.map(user => user._id)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const group = await response.json();
      onGroupCreated(group);
      onClose();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="group-chat-overlay">
      <div className="group-chat-modal">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="group-chat-header">
          <h2>Create New Group</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        {step === 1 ? (
          <div className="group-name-step">
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <button
              className="next-button"
              onClick={() => setStep(2)}
              disabled={!groupName.trim()}
            >
              Next
            </button>
          </div>
        ) : (
          <div className="participants-step">
            <div className="form-group">
              <label>Add Participants</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
              />
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(user => (
                  <div
                    key={user._id}
                    className="user-item"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="user-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="user-info">
                      <div className="username">{user.username}</div>
                      <div className="email">{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedUsers.length > 0 && (
              <div className="selected-users">
                <h3>Selected Participants ({selectedUsers.length})</h3>
                {selectedUsers.map(user => (
                  <div key={user._id} className="selected-user">
                    <div className="user-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="username">{user.username}</div>
                    <button
                      className="remove-user"
                      onClick={() => handleUserRemove(user._id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="group-actions">
              <button
                className="back-button"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className="create-button"
                onClick={handleCreateGroup}
                disabled={selectedUsers.length < 2}
              >
                Create Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChat; 