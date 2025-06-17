import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register: React.FC = () => {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [funcPermissions, setFuncPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
<<<<<<<< Updated upstream:laboratory-frontend/src/tsx/pages/Register.tsx

    if (!email || !password) {
      setError('請填寫所有欄位');
========
    if (!account || !password || !company) {
      setError('請填寫所有必要欄位');
>>>>>>>> Stashed changes:src/tsx/pages/Register.tsx
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[email]) {
      setError('此帳號已被註冊');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
<<<<<<<< Updated upstream:laboratory-frontend/src/tsx/pages/Register.tsx
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 1000));

      users[email] = { password };
      localStorage.setItem('users', JSON.stringify(users));

========
      const response = await fetch('http://13.211.240.55/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account,
          password,
          company,
          func_permissions: funcPermissions
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '註冊失敗');
      }
      
>>>>>>>> Stashed changes:src/tsx/pages/Register.tsx
      alert('註冊成功！請登入');
      navigate('/login');
    } catch (err) {
      setError('註冊失敗，請稍後再試');
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

          <div className="mb-4">
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

          <div className="mb-4">
            <label htmlFor="company" className="block text-gray-700 text-sm font-bold mb-2">
              公司名稱
            </label>
            <input
              id="company"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入公司名稱"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              功能權限
            </label>
            <div className="space-y-2">
              {['superuser', 'admin', 'user', 'viewer'].map((permission) => (
                <label key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={funcPermissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFuncPermissions([...funcPermissions, permission]);
                      } else {
                        setFuncPermissions(funcPermissions.filter(p => p !== permission));
                      }
                    }}
                  />
                  <span className="ml-2 text-gray-700">{permission}</span>
                </label>
              ))}
            </div>
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
