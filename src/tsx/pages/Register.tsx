import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PERMISSIONS } from '../utils/permissions';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !company) {
      setError('請填寫所有欄位');
      return;
    }
  
    setIsLoading(true);
    setError('');
  
    try {
      
      // 確保請求體的格式與後端期望的完全匹配
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: email, // 確保字段名是 account 而不是 email
          password: password,
          func_permissions: [PERMISSIONS.VIEW_DATA, PERMISSIONS.CHANGE_PASSWORD], // 默認基本權限
          company: company
        }),
      });
      
  
      // 檢查響應是否為 JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || '註冊失敗');
        }
        
        alert('註冊成功！請登入');
        navigate('/login');
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('伺服器回應格式錯誤');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : '註冊失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">註冊帳號</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              e-mail
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入電子郵件"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <div className="mb-6">
            <label htmlFor="company" className="block text-gray-700 text-sm font-bold mb-2">
              公司/組織
            </label>
            <input
              id="company"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入公司或組織名稱"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? '註冊中...' : '註冊'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            已經有帳號了嗎？ <Link to="/login" className="text-blue-600 hover:underline">回到登入</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
