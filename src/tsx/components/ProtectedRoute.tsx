import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string; // 可選的權限要求
}

interface UserInfo {
  user_id: string;
  name: string;
  role: string;
  permissions: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 檢查是否有 token
  const token = localStorage.getItem('token');
  
  // 如果沒有 token，重定向到登入頁面
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 獲取用戶資訊和權限
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // 直接使用 localStorage 中的權限資訊，不呼叫不存在的 API
        const userAccount = localStorage.getItem('user_account') || '用戶';
        const userPermissions = localStorage.getItem('user_permissions');
        
        let userRole = '一般用戶';
        if (userPermissions) {
          const permissions = JSON.parse(userPermissions);
          if (permissions.includes('create_user')) {
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
        
        setUserInfo({
          user_id: userAccount,
          name: userAccount,
          role: userRole,
          permissions: userPermissions ? JSON.parse(userPermissions) : []
        });
      } catch (error) {
        console.error('獲取用戶資訊失敗:', error);
        // 如果完全無法獲取用戶資訊，重定向到登入頁面
        return <Navigate to="/login" replace />;
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [token]);

  // 載入中顯示載入畫面
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 如果沒有用戶資訊，重定向到登入頁面
  if (!userInfo) {
    return <Navigate to="/login" replace />;
  }

  // 檢查權限
  if (requiredPermission && !userInfo.permissions.includes(requiredPermission)) {
    // 沒有權限，重定向到首頁
    return <Navigate to="/dashboard" replace />;
  }

  // 有權限，渲染子組件
  return <>{children}</>;
};

export default ProtectedRoute; 