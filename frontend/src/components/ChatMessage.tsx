import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  chatMessage: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ chatMessage }) => {
  return (
    <div className="flex items-start space-x-2">
      <div className="flex-1 bg-gray-100 rounded-lg p-3">
        <div className="font-semibold">{chatMessage.sender}</div>
        <div className="text-gray-700">{chatMessage.content}</div>
        <div className="text-xs text-gray-500">
          {new Date(chatMessage.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 