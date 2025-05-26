import React, { useState, useEffect } from 'react';
import './UserList.css';

const UserList = ({ onStartConversation, token }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('http://localhost:5000/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  const handleStartConversation = async (userId) => {
    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: userId })
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const conversation = await response.json();
      onStartConversation(conversation);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="user-list-loading">Loading users...</div>;
  }

  if (error) {
    return <div className="user-list-error">{error}</div>;
  }

  return (
    <div className="user-list">
      <h3>All Users</h3>
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
  );
};

export default UserList; 