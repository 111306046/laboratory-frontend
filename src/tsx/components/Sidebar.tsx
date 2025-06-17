import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiSettings, FiMenu, FiLogOut, FiDatabase, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  // 導航項目配置
  const navItems: NavItem[] = [
    { title: '首頁', path: '/dashboard', icon: <FiHome size={20} /> },
    { title: '數據記錄', path: '/data-records', icon: <FiDatabase size={20} /> },
    { title: '警報設置', path: '/alerts', icon: <FiAlertCircle size={20} /> },
    { title: '統計圖表', path: '/statistics', icon: <FiBarChart2 size={20} /> },
    { title: '用戶管理', path: '/PU-addusers', icon: <FiUser size={20} /> },
    { title: '系統設置', path: '/settings', icon: <FiSettings size={20} /> }
  ];

  // 切換側邊欄狀態
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    // 保存到 localStorage
    localStorage.setItem('sidebarOpen', JSON.stringify(newState));
  };

  // 登出處理
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div 
      className={`bg-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col ${
        sidebarOpen ? 'w-45' : 'w-15'
      }`}
    >
      {/* 標題和漢堡按鈕 */}
      <div className="flex items-center justify-between p-4 border-b border-blue-700">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-blue-700 focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          <FiMenu size={20} />
        </button>

        {sidebarOpen ? (
          <h2 className="text-xl font-bold">NCCU 實驗室</h2>
        ) : (
          <h2 className="text-xl font-bold"></h2>
        )}

      </div>
      
      {/* 導航菜單 */}
      <nav className="flex-1 overflow-y-auto pt-4">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <Link 
                to={item.path} 
                className="flex items-center p-4 hover:bg-blue-700 rounded-lg mx-2 mb-1"
              >
                <span className="inline-flex">{item.icon}</span>
                {sidebarOpen && <span className="ml-3">{item.title}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* 用戶資訊 */}
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <img 
              className="h-10 w-10 rounded-full bg-blue-300" 
              src="/avatar-placeholder.png" 
              alt="User avatar" 
            />
          </div>
          {sidebarOpen && (
            <div className="ml-3">
              <p className="text-base font-medium">大張</p>
              <p className="text-sm text-blue-200">管理員</p>
            </div>
          )}
        </div>
        
        {/* 登出按鈕 */}
        <button 
          onClick={handleLogout}
          className={`mt-3 flex items-center p-2 rounded-lg hover:bg-blue-700 w-full ${
            sidebarOpen ? 'justify-start' : 'justify-center'
          }`}
        >
          <FiLogOut size={20} />
          {sidebarOpen && <span className="ml-3">登出</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;