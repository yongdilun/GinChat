import React from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

interface ChatLayoutProps {
  children: React.ReactNode;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ children }) => {
  return (
    <div className={`bg-gray-50 dark:bg-gray-900 ${inter.className}`}>
      {children}
    </div>
  );
};

export default ChatLayout; 