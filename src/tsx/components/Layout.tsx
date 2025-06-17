// components/Layout.tsx
import React, { useState } from 'react';
import Sidebar from './sidebar';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;