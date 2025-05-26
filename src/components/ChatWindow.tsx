import React, { useState } from 'react';
import ChatMessage from './ChatMessage';
import { Message } from '../types';

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} chatMessage={message} />
        ))}
      </div>
    </div>
  );
};

export default ChatWindow; 