import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { setUserAllowNotify, isSuperUserAccount } from '../utils/accessControl';

// 使用新的 API 服務，移除舊的 api 函數

const normalizeLabName = (value: string): string => {
  if (!value) return '';
  let sanitized = value.trim().replace(/\s+/g, '_');
  if (!sanitized) return '';
  const trimSuffix = (input: string) => input.replace(/[_-]+$/g, '');
  const lowerSanitized = sanitized.toLowerCase();
  if (lowerSanitized.endsWith('_lab')) {
    const base = sanitized.slice(0, -4);
    const cleanedBase = trimSuffix(base);
    return `${cleanedBase || base}_lab`;
  }
  const cleaned = trimSuffix(sanitized);
  return `${cleaned || sanitized}_lab`;
};

const saveCompanyLab = (value?: string | string[] | null): boolean => {
  if (!value) return false;
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return false;
  const normalized = normalizeLabName(candidate);
  if (!normalized) return false;
  localStorage.setItem('lab', normalized);
  localStorage.removeItem('company_lab');
  return true;
};

const Login: React.FC = () => {
  // 添加狀態管理
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  
  // 處理表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 簡單驗證
    if (!account || !password) {
      setError('請填寫帳號');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // 使用新的 API 服務登入
      const data = await login(account, password);
      localStorage.setItem('token', data.access_token);
      // 保存 refresh_token（如果後端提供）
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      } else {
        console.warn('⚠️ 後端未返回 refresh_token，無法使用自動刷新功能');
        console.warn('  請確認後端登入 API 返回了 refresh_token 欄位');
      }
      localStorage.setItem('user_account', account);
      // 清理殘留的公司資訊，避免跨帳號污染
      localStorage.removeItem('lab');
      localStorage.removeItem('company_lab');
      localStorage.removeItem('company');
      localStorage.removeItem('company_name');
      setUserAllowNotify(false);
      
      const companyFromServer = (data as any).company as string | undefined;
      const companyLabFromServer = (data as any).company_lab as string | undefined;
      let resolvedPermissions: string[] = [];

      // 如果後端有提供 company_lab，優先保存
      if (companyLabFromServer) {
        saveCompanyLab(companyLabFromServer);
      }

      // 優先使用後端登入回傳的權限與公司（若提供）
      const isSuperUserLogin = isSuperUserAccount(account);

      if (isSuperUserLogin) {
        // yezyez 擁有所有權限（func_auth + extra_func_auth）
        const superPerms = [
          'view_data', 'create_user', 'modify_user', 'get_users',
          'modify_lab', 'get_labs',
          'change_password',
          'set_thresholds', 'modify_notification','control_machine'
        ];
        localStorage.setItem('user_permissions', JSON.stringify(superPerms));
        localStorage.setItem('is_superuser', 'true');
        resolvedPermissions = superPerms;
        if (!localStorage.getItem('lab')) {
          if (!saveCompanyLab(companyLabFromServer) && !saveCompanyLab(companyFromServer)) {
            saveCompanyLab('nccu');
          }
        }
      } else if ((data as any).permissions && Array.isArray((data as any).permissions)) {
        // 後端若以 permissions 回傳
        const perms = (data as any).permissions as string[];
        localStorage.setItem('user_permissions', JSON.stringify(perms));
        // 判斷是否為管理員（擁有 create_user 權限）
        localStorage.setItem('is_superuser', perms.includes('create_user') ? 'true' : 'false');
        resolvedPermissions = perms;
      } else if (data.func_permissions && Array.isArray(data.func_permissions)) {
        // 後端回傳 func_permissions
        localStorage.setItem('user_permissions', JSON.stringify(data.func_permissions));
        // 判斷是否為管理員（擁有 create_user 權限）
        localStorage.setItem('is_superuser', data.func_permissions.includes('create_user') ? 'true' : 'false');
        resolvedPermissions = data.func_permissions;
      }
      if (companyFromServer) {
        localStorage.setItem('company', companyFromServer);
        localStorage.setItem('company_name', companyFromServer);
        if (!localStorage.getItem('lab')) {
          saveCompanyLab(companyFromServer);
        }
      }

      // 保存用戶的 lab 信息（如果後端提供）
      if ((data as any).lab) {
        const userLab = (data as any).lab;
        // lab 可能是字符串或數組
        localStorage.setItem('user_lab', JSON.stringify(userLab));
      } else if ((data as any).company_lab) {
        // 如果沒有 lab，使用 company_lab
        localStorage.setItem('user_lab', JSON.stringify((data as any).company_lab));
      }

      // 若登入回傳沒有包含權限，不再呼叫 /getUsers（避免 401），改給最小集

      // 若仍沒有權限，給最小集（避免界面空白）
      if (!localStorage.getItem('user_permissions')) {
        const fallbackPerms = ['view_data', 'change_password'];
        localStorage.setItem('user_permissions', JSON.stringify(fallbackPerms));
        if (!localStorage.getItem('is_superuser')) localStorage.setItem('is_superuser', 'false');
        resolvedPermissions = fallbackPerms;
      }
      if (resolvedPermissions.length === 0) {
        try {
          resolvedPermissions = JSON.parse(localStorage.getItem('user_permissions') || '[]');
        } catch {
          resolvedPermissions = [];
        }
      }

      const allowNotifyFromResponse = (data as any).allow_notify;
      if (typeof allowNotifyFromResponse !== 'undefined') {
        setUserAllowNotify(Boolean(allowNotifyFromResponse));
      } else {
        const fallbackAllow = resolvedPermissions.includes('set_thresholds') || resolvedPermissions.includes('modify_notification');
        setUserAllowNotify(fallbackAllow);
      }

      // 確保 superuser 具備預設公司與實驗室，以免 WS 或品牌顯示異常
      const userPerms = JSON.parse(localStorage.getItem('user_permissions') || '[]') as string[];
      if (userPerms.includes('create_user') && !localStorage.getItem('lab')) {
        if (!saveCompanyLab(companyLabFromServer) &&
            !saveCompanyLab(companyFromServer) &&
            !saveCompanyLab(localStorage.getItem('company') || localStorage.getItem('company_name'))) {
          saveCompanyLab('nccu');
        }
      }
      
      navigate(isSuperUserLogin ? '/manage-company' : '/dashboard');
    } catch (err: any) {
      setError(err?.message || '登入失敗');
      console.error('登入失敗:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">帳號登入</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="account" className="block text-gray-700 text-sm font-bold mb-2">
              帳號
            </label>
            <input
              id="account"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入帳號"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              密碼
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? '登錄中...' : '登錄'}
          </button>
        </form>
        

      </div>
    </div>
  );
};

export default Login;