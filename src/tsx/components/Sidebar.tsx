import React, { useState, useEffect } from 'react';
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
  requiredPermission: string;
}

interface UserInfo {
  user_id: string;
  name: string;
  role: string;
  permissions: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo>({ 
    user_id: '', 
    name: '用戶', 
    role: '身分', 
    permissions: [] 
  });
  const [isLoading, setIsLoading] = useState(true);

  // 獲取用戶資訊
  const fetchUserInfo = async () => {
    try {
      setIsLoading(true);
      
      // 直接使用 localStorage 中的權限資訊，不呼叫不存在的 API
      const userAccount = localStorage.getItem('user_account') || '用戶';
      const userPermissions = localStorage.getItem('user_permissions');
      
      let userRole = '一般用戶';
      if (userPermissions) {
        const permissions = JSON.parse(userPermissions);
        console.log('用戶權限:', permissions); // 調試用
        
        if (permissions.includes('create_user')) {
          // 如果是 yezyez 且有管理員權限，顯示超級使用者
          if (userAccount === 'yezyez') {
            userRole = '超級使用者';
          } else {
            userRole = '管理員';
          }
        } else if (permissions.includes('modify_lab')) {
          userRole = '實驗室管理員';
        } else if (permissions.includes('view_data')) {
          userRole = '數據查看者';
        }
      }
      
      console.log('判斷的用戶角色:', userRole); // 調試用
      
      setUserInfo({
        user_id: userAccount,
        name: userAccount,
        role: userRole,
        permissions: userPermissions ? JSON.parse(userPermissions) : []
      });
    } catch (error) {
      console.error('獲取用戶資訊失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 組件加載時獲取用戶資訊
  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 檢查用戶是否有特定權限
  const hasPermission = (permission: string): boolean => {
    return userInfo.permissions.includes(permission);
  };

  // 根據權限過濾導航項目
  const getFilteredNavItems = (): NavItem[] => {
    const allNavItems: NavItem[] = [
      { title: '首頁', path: '/dashboard', icon: <FiHome size={20} />, requiredPermission: 'none' }, // 所有人都可以訪問
      { title: '數據記錄', path: '/data-records', icon: <FiDatabase size={20} />, requiredPermission: 'view_data' },
      { title: '警報設置', path: '/alert', icon: <FiAlertCircle size={20} />, requiredPermission: 'view_alerts' },
      { title: '統計圖表', path: '/static-chart', icon: <FiBarChart2 size={20} />, requiredPermission: 'view_statistics' },
      { title: '用戶管理', path: '/PU-addusers', icon: <FiUser size={20} />, requiredPermission: 'get_users' },
      { title: '實驗室管理', path: '/PU-laboratarymnagement', icon: <FiSettings size={20} />, requiredPermission: 'get_labs' },
    ];

    return allNavItems.filter(item => {
      if (item.requiredPermission === 'none') return true; // 首頁所有人都可以訪問
      return hasPermission(item.requiredPermission);
    });
  };

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
    localStorage.removeItem('user_account');
    localStorage.removeItem('user_permissions');
    navigate('/login');
  };

  const filteredNavItems = getFilteredNavItems();

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
          {filteredNavItems.map((item, index) => (
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
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-blue-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-blue-200 rounded w-12"></div>
                </div>
              ) : (
                <>
                  <p className="text-base font-medium">{userInfo.name}</p>
                  <p className="text-sm text-blue-200">{userInfo.role}</p>
                </>
              )}
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