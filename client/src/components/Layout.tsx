import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import FloatingButton from './FloatingButton';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app">
      <Navbar />
      <main className="content">
        {children}
      </main>
      <FloatingButton />
    </div>
  );
};

export default Layout; 