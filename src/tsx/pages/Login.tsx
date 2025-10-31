import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getUsers } from '../services/api';

// 使用新的 API 服務，移除舊的 api 函數

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
      localStorage.setItem('user_account', account);
      // 清理殘留的公司資訊，避免跨帳號污染
      localStorage.removeItem('company_lab');
      localStorage.removeItem('company');
      localStorage.removeItem('company_name');
      
      // 優先使用後端登入回傳的權限與公司（若提供）
      if (data.func_permissions && Array.isArray(data.func_permissions)) {
        localStorage.setItem('user_permissions', JSON.stringify(data.func_permissions));
      }
      if (data.company) {
        localStorage.setItem('company', data.company);
        localStorage.setItem('company_name', data.company);
      }

      // 若登入回傳沒有包含權限，再從 getUsers 尋找
      if (!localStorage.getItem('user_permissions')) {
        try {
          const usersData = await getUsers();
          const currentUser = usersData.find((user: any) => user.account === account);
          if (currentUser?.func_permissions) {
            localStorage.setItem('user_permissions', JSON.stringify(currentUser.func_permissions));
            if (currentUser.company) {
              localStorage.setItem('company', currentUser.company);
              localStorage.setItem('company_name', currentUser.company);
            }
            if (currentUser.company_lab) {
              localStorage.setItem('company_lab', currentUser.company_lab);
            }
          }
        } catch (permissionError) {
          console.error('獲取用戶權限失敗:', permissionError);
        }
      }

      // 若仍沒有權限，給最小集（避免界面空白）
      if (!localStorage.getItem('user_permissions')) {
        localStorage.setItem('user_permissions', JSON.stringify(['view_data', 'change_password']));
      }
      
      navigate('/dashboard');
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
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                記住我
              </label>
            </div>
            
            <a href="#" className="text-sm text-blue-600 hover:underline">
              忘記密碼？
            </a>
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