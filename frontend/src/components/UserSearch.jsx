import React, { useState, useEffect } from 'react';
import './UserSearch.css';

const UserSearch = ({ onStartConversation, token }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        console.log('Searching users with query:', searchQuery);
        const response = await fetch(
          `http://localhost:5000/api/users/search?q=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to search users');
        }

        const data = await response.json();
        console.log('Search results:', data);
        setUsers(data);
      } catch (err) {
        console.error('Error searching users:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, token]);

  const handleStartConversation = async (userId) => {
    try {
      console.log('Starting conversation with user:', userId);
      const response = await fetch('http://localhost:5000/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation');
      }

      const conversation = await response.json();
      console.log('Created conversation:', conversation);
      onStartConversation(conversation);
      setSearchQuery('');
      setUsers([]);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err.message);
    }
  };

  return (
    <div className="user-search">
      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isLoading && <div className="search-spinner"></div>}
      </div>

      {error && <div className="search-error">{error}</div>}

      {users.length > 0 && (
        <div className="search-results">
          {users.map((user) => (
            <div
              key={user._id}
              className="user-item"
              onClick={() => handleStartConversation(user._id)}
            >
              <div className="user-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch; 