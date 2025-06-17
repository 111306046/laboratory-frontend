import React, { useState, useEffect } from 'react';

interface User {
  account: string;
  func_permissions: string[];
  company: string;
}

const UserManagement: React.FC = () => {
  // 新增用戶表單狀態
  const [newAccount, setNewAccount] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newFuncPermissions, setNewFuncPermissions] = useState<string[]>([]);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 獲取用戶列表
  const fetchUsers = async () => {
    try {
      const response = await fetch('http://13.211.240.55/api/getUsers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('獲取用戶列表失敗');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '獲取用戶列表失敗');
    }
  };

  // 新增用戶
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSuccess('');
    if (!newAccount || !newPassword || !newCompany) {
      setCreateUserError('請填寫所有欄位');
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('http://13.211.240.55/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          account: newAccount,
          password: newPassword,
          company: newCompany,
          func_permissions: newFuncPermissions
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '新增失敗');
      }
      setCreateUserSuccess('新增成功');
      setNewAccount('');
      setNewPassword('');
      setNewCompany('');
      setNewFuncPermissions([]);
      fetchUsers();
    } catch (err) {
      setCreateUserError(err instanceof Error ? err.message : '新增失敗');
    } finally {
      setIsCreating(false);
    }
  };

  // 修改用戶權限
  const handleModifyPermissions = async () => {
    if (!selectedUser) {
      setError('請選擇用戶');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://13.211.240.55/api/modifyPermissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          account: selectedUser,
          func_permissions: selectedPermissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '修改權限失敗');
      }

      setSuccess('權限修改成功');
      fetchUsers(); // 重新獲取用戶列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改權限失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 當選擇用戶時更新權限
  useEffect(() => {
    if (selectedUser) {
      const user = users.find(u => u.account === selectedUser);
      if (user) {
        setSelectedPermissions(user.func_permissions);
      }
    }
  }, [selectedUser, users]);

  // 初始加載用戶列表
  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">用戶管理</h1>

      {/* 新增用戶表單 */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">新增用戶</h2>
        {createUserError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{createUserError}</div>
        )}
        {createUserSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{createUserSuccess}</div>
        )}
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">帳號</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入帳號"
              value={newAccount}
              onChange={e => setNewAccount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">密碼</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入密碼"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">公司名稱</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入公司名稱"
              value={newCompany}
              onChange={e => setNewCompany(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">功能權限</label>
            <div className="flex flex-wrap gap-2">
              {['superuser', 'admin', 'user', 'viewer'].map((permission) => (
                <label key={permission} className="flex items-center mr-4">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={newFuncPermissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewFuncPermissions([...newFuncPermissions, permission]);
                      } else {
                        setNewFuncPermissions(newFuncPermissions.filter(p => p !== permission));
                      }
                    }}
                  />
                  <span className="ml-2 text-gray-700">{permission}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              disabled={isCreating}
            >
              {isCreating ? '新增中...' : '新增用戶'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            選擇用戶
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">請選擇用戶</option>
            {users.map((user) => (
              <option key={user.account} value={user.account}>
                {user.account} ({user.company})
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
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
                    checked={selectedPermissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPermissions([...selectedPermissions, permission]);
                      } else {
                        setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
                      }
                    }}
                  />
                  <span className="ml-2 text-gray-700">{permission}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleModifyPermissions}
          disabled={isLoading || !selectedUser}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
        >
          {isLoading ? '處理中...' : '修改權限'}
        </button>
      </div>
    </div>
  );
};

export default UserManagement; 