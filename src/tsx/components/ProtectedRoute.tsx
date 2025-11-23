import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { canAccessAlertFeature, isSuperUserAccount } from '../utils/accessControl';
import { getProtectedStatus } from '../services/api';

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
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'checking' | 'active' | 'expired'>('idle');
  const [sessionError, setSessionError] = useState<string | null>(null);

  // 檢查是否有 token
  const token = localStorage.getItem('token');

  const handleSessionLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_account');
      localStorage.removeItem('user_permissions');
    }
    window.location.href = '/login';
  };

  // 獲取用戶資訊和權限
  useEffect(() => {
    // 如果沒有 token，不需要獲取用戶資訊
    if (!token) {
      setIsLoading(false);
      setSessionStatus('idle');
      return;
    }

    let isMounted = true;

    const fetchUserInfo = () => {
      try {
        const userAccount = localStorage.getItem('user_account') || '用戶';
        const userPermissions = localStorage.getItem('user_permissions');
        
        let userRole = '一般用戶';
        const isSuperUser = isSuperUserAccount(userAccount);
        if (userPermissions) {
          const permissions = JSON.parse(userPermissions);
          if (permissions.includes('create_user')) {
            userRole = isSuperUser ? '超級使用者' : '管理員';
          } else if (permissions.includes('modify_lab')) {
            userRole = '實驗室管理員';
          } else if (permissions.includes('view_data')) {
            userRole = '數據查看者';
          }
        }
        
        if (!isMounted) return;
        setUserInfo({
          user_id: userAccount,
          name: userAccount,
          role: userRole,
          permissions: userPermissions ? JSON.parse(userPermissions) : []
        });
      } catch (error) {
        console.error('獲取用戶資訊失敗:', error);
        if (!isMounted) return;
        setUserInfo(null);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    const verifySession = async () => {
      setSessionStatus('checking');
      try {
        await getProtectedStatus();
        if (!isMounted) return;
        setSessionStatus('active');
        setSessionError(null);
      } catch (error: any) {
        if (!isMounted) return;
        const message = error?.message || '登入狀態驗證失敗，請重新登入';
        setSessionStatus('expired');
        setSessionError(message);
      }
    };

    fetchUserInfo();
    verifySession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 如果沒有 token，重定向到登入頁面（在 hooks 之後檢查）
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 載入中顯示載入畫面
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (sessionStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">登入狀態已失效</h2>
          <p className="text-gray-600 mb-4">{sessionError || '請重新登入以繼續使用系統'}</p>
          <button
            onClick={handleSessionLogout}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重新登入
          </button>
        </div>
      </div>
    );
  }

  // 如果沒有用戶資訊，顯示錯誤提示而不是跳轉
  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">無法獲取用戶資訊</h2>
          <p className="text-gray-600 mb-4">請檢查您的登入狀態或聯繫管理員</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            前往登入頁面
          </button>
        </div>
      </div>
    );
  }

  // 檢查權限
  if (requiredPermission) {
    let hasAccess = false;
    const isSuperUser = isSuperUserAccount(userInfo.user_id);
    // 特殊處理：公司管理需要 create_user 權限（管理員才能管理公司）
    // 或者 yezyez 帳號也可以訪問
    if (requiredPermission === 'superuser') {
      hasAccess = isSuperUser;
    } else if (requiredPermission === 'create_user') {
      hasAccess = userInfo.permissions.includes('create_user') || isSuperUser;
    }
    // 特殊處理：警報設置允許 set_thresholds 或 modify_lab 權限
    else if (requiredPermission === 'set_thresholds') {
      hasAccess = canAccessAlertFeature(userInfo.permissions, userInfo.user_id);
    } else {
      hasAccess = userInfo.permissions.includes(requiredPermission);
    }
    
    if (!hasAccess) {
      // 沒有權限，顯示權限不足提示而不是跳轉
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">權限不足</h2>
            <p className="text-gray-600 mb-4">您沒有權限訪問此頁面</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              返回首頁
            </button>
          </div>
        </div>
      );
    }
  }

  // 有權限，渲染子組件
  return <>{children}</>;
};

export default ProtectedRoute; 