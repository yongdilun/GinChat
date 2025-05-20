import React from 'react';
import { Inter } from 'next/font/google';
import Navbar from './Navbar';

const inter = Inter({ subsets: ['latin'] });

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={`min-h-screen flex flex-col ${inter.className}`}>
      <Navbar />
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
};

export default Layout;
