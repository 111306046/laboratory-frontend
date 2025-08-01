import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
    
    setIsLoading(true);
    setError('');
    
    try {
      
      //調用api
      const response = await fetch('http://13.211.240.55/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: account,  // *後端API使用'account'
          password: password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '登入失敗');
      }
      
      const data = await response.json();
      
      // 存儲登入token
      localStorage.setItem('token', data.access_token);
      
      // 登入成功導到主頁
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
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
              id="accoint"
              type="account"
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
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            還沒有帳號？ <Link to="/register" className="text-blue-600 hover:underline">註冊帳號</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;