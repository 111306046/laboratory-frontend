import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiSettings, FiMenu, FiLogOut, FiDatabase, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';
import { logout } from '../services/api';
import { canAccessAlertFeature, isSuperUserAccount, setUserAllowNotify } from '../utils/accessControl';

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
          const isSuperUser = isSuperUserAccount(userAccount);
          userRole = isSuperUser ? '系統管理員' : '管理員';
        } else if (permissions.includes('modify_lab') || permissions.includes('get_labs')) {
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
    if (permission === 'none') return true;
    const isSuperUser = isSuperUserAccount(userInfo.user_id);
    if (permission === 'superuser') {
      return isSuperUser;
    }
    // 特殊處理：公司管理允許管理員與超級帳號（目前僅用 superuser，所以保留邏輯以供其他場景）
    if (permission === 'create_user' && isSuperUser) {
      return true;
    }
    // 特殊處理：警報設置僅顯示給具備警報服務資格的帳號
    if (permission === 'set_thresholds') {
      return canAccessAlertFeature(userInfo.permissions, userInfo.user_id);
    }
    return userInfo.permissions.includes(permission);
  };

  // 根據權限過濾導航項目
  const getFilteredNavItems = (): NavItem[] => {
    const isSuperUser = isSuperUserAccount(userInfo.user_id);

    if (isSuperUser) {
      const superNavItems: NavItem[] = [
        { title: '公司管理', path: '/manage-company', icon: <FiSettings size={20} />, requiredPermission: 'superuser' },
        { title: '用戶管理', path: '/PU-addusers', icon: <FiUser size={20} />, requiredPermission: 'get_users' },
        { title: '實驗室管理', path: '/PU-laboratarymnagement', icon: <FiSettings size={20} />, requiredPermission: 'get_labs' },
      ];
      return superNavItems.filter(item => hasPermission(item.requiredPermission));
    }

    const allNavItems: NavItem[] = [
      { title: '首頁', path: '/dashboard', icon: <FiHome size={20} />, requiredPermission: 'none' },
      { title: '數據記錄', path: '/data-records', icon: <FiDatabase size={20} />, requiredPermission: 'view_data' },
      { title: '警報設置', path: '/alert', icon: <FiAlertCircle size={20} />, requiredPermission: 'set_thresholds' },
      { title: '統計圖表', path: '/static-chart', icon: <FiBarChart2 size={20} />, requiredPermission: 'view_data' },
      { title: '用戶管理', path: '/PU-addusers', icon: <FiUser size={20} />, requiredPermission: 'get_users' },
      { title: '實驗室管理', path: '/PU-laboratarymnagement', icon: <FiSettings size={20} />, requiredPermission: 'get_labs' },
      { title: '公司管理', path: '/manage-company', icon: <FiSettings size={20} />, requiredPermission: 'superuser' },
    ];

    return allNavItems.filter(item => {
      if (item.requiredPermission === 'none') return true;
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
  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch (error) {
      console.error('登出 API 調用失敗:', error);
    } finally {
      // 無論 API 調用成功與否，都清除本地存儲並跳轉
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_account');
      localStorage.removeItem('user_permissions');
      setUserAllowNotify(false);
      navigate('/login');
    }
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
          (() => {
            // 以 company_lab 為主，其次 company/company_name
            const fromLab = localStorage.getItem('lab');
            const fallback = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
            let raw = (fromLab || fallback || '').toString().trim();
            // 轉為更友善的顯示：移除 _lab 後綴，底線轉空白
            raw = raw.replace(/_lab$/i, '').replace(/_/g, ' ');
            // 特例：nccu → NCCU
            if (/^nccu$/i.test(raw)) raw = 'NCCU';
            const brand = raw.includes('實驗室') ? raw : `${raw} 實驗室`;
            return <h2 className="text-xl font-bold">{brand}</h2>;
          })()
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
        {sidebarOpen ? (
          <div>
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-blue-200 rounded w-24"></div>
                <div className="h-3 bg-blue-200 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-base font-medium">{userInfo.name}</p>
                <p className="text-sm text-blue-200">{userInfo.role}</p>
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-sm font-semibold text-blue-100">
            {isLoading ? '...' : (userInfo.name?.charAt(0)?.toUpperCase() || 'U')}
          </div>
        )}
        
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