import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  chatMessage: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ chatMessage }) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <span className="font-semibold">{chatMessage.sender}</span>
        <span className="text-gray-500 text-sm">
          {new Date(chatMessage.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-gray-800">{chatMessage.content}</p>
    </div>
  );
};

export default ChatMessage; 