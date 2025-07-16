import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Shield, Edit, Trash2, Eye, ChevronDown, Filter } from 'lucide-react';

// 定義用戶介面 - 根據後端API結構調整
interface User {
  account: string;
  func_permissions: string[];
  company: string;
}

// 定義新用戶介面
interface NewUser {
  account: string;
  password: string;
  func_permissions: string[];
  company: string;
}

const AdminManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 新增用戶表單狀態
  const [newUser, setNewUser] = useState<NewUser>({
    account: '',
    password: '',
    func_permissions: [],
    company: ''
  });

  // 權限選項
  const permissionOptions = [
    { value: 'admin', label: '管理員' },
    { value: 'user', label: '一般用戶' },
    { value: 'lab_manager', label: '實驗室管理員' },
    { value: 'data_viewer', label: '數據查看者' }
  ];

  // 獲取用戶列表
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('http://13.211.240.55/api/getUsers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('無法獲取用戶列表');
      }

      const data = await response.json();
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '獲取用戶列表失敗');
      console.error('獲取用戶列表失敗:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 組件加載時獲取用戶列表
  useEffect(() => {
    fetchUsers();
  }, []);

  // 篩選用戶
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.func_permissions.includes(filterRole);
    const matchesCompany = filterCompany === 'all' || user.company === filterCompany;
    
    return matchesSearch && matchesRole && matchesCompany;
  });

  // 獲取用戶角色顯示
  const getUserRoleDisplay = (permissions: string[]) => {
    if (permissions.includes('admin')) return '管理員';
    if (permissions.includes('lab_manager')) return '實驗室管理員';
    if (permissions.includes('data_viewer')) return '數據查看者';
    return '一般用戶';
  };

  // 獲取用戶角色類型
  const getUserRoleType = (permissions: string[]) => {
    if (permissions.includes('admin')) return 'admin';
    if (permissions.includes('lab_manager')) return 'lab_manager';
    if (permissions.includes('data_viewer')) return 'data_viewer';
    return 'user';
  };

  // 修改用戶權限
  const modifyUserPermissions = async (account: string, newPermissions: string[]) => {
    try {
      const response = await fetch('http://13.211.240.55/api/modifyPermissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          account: account,
          func_permissions: newPermissions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '修改權限失敗');
      }

      alert('權限修改成功！');
      fetchUsers(); // 重新獲取用戶列表
    } catch (err) {
      alert(err instanceof Error ? err.message : '修改權限失敗');
      console.error('修改權限失敗:', err);
    }
  };

  // 角色切換
  const toggleUserRole = async (user: User) => {
    const currentRole = getUserRoleType(user.func_permissions);
    let newPermissions: string[];
    
    switch (currentRole) {
      case 'admin':
        newPermissions = ['user'];
        break;
      case 'user':
        newPermissions = ['admin'];
        break;
      case 'lab_manager':
        newPermissions = ['user'];
        break;
      case 'data_viewer':
        newPermissions = ['user'];
        break;
      default:
        newPermissions = ['admin'];
    }
    
    await modifyUserPermissions(user.account, newPermissions);
  };

  // 新增用戶
  const handleAddUser = async () => {
    // 基本驗證
    if (!newUser.account || !newUser.password || !newUser.company) {
      alert('請填寫所有必填欄位');
      return;
    }
    
    try {
      const response = await fetch('http://13.211.240.55/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          account: newUser.account,
          password: newUser.password,
          func_permissions: newUser.func_permissions,
          company: newUser.company
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '創建用戶失敗');
      }

      alert('用戶創建成功！');
      setNewUser({ account: '', password: '', func_permissions: [], company: '' });
      setShowAddModal(false);
      fetchUsers(); // 重新獲取用戶列表
    } catch (err) {
      alert(err instanceof Error ? err.message : '創建用戶失敗');
      console.error('創建用戶失敗:', err);
    }
  };

  // 刪除用戶
  const deleteUser = (account: string) => {
    if (window.confirm('確定要刪除此用戶嗎？')) {
      // 注意：後端API文檔中沒有刪除用戶的API，這裡只是從前端狀態中移除
      setUsers(users.filter(user => user.account !== account));
    }
  };

  // 編輯用戶
  const handleEditUser = (user: User) => {
    setEditingUser({...user});
    setShowEditModal(true);
  };

  // 保存編輯
  const handleSaveEdit = async () => {
    if (!editingUser || !editingUser.account || !editingUser.company) {
      alert('請填寫所有必填欄位');
      return;
    }
    
    try {
      const response = await fetch('http://13.211.240.55/api/modifyPermissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          account: editingUser.account,
          func_permissions: editingUser.func_permissions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '修改用戶失敗');
      }

      alert('用戶修改成功！');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers(); // 重新獲取用戶列表
    } catch (err) {
      alert(err instanceof Error ? err.message : '修改用戶失敗');
      console.error('修改用戶失敗:', err);
    }
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  // 顯示加載狀態
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">載入中...</div>
        </div>
      </div>
    );
  }

  // 顯示錯誤狀態
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">管理員設置</h1>
        <p className="text-gray-600">管理系統用戶權限和角色分配</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總用戶數</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">管理員</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.func_permissions.includes('admin')).length}
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">一般用戶</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.func_permissions.includes('user')).length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">實驗室管理員</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.func_permissions.includes('lab_manager')).length}
              </p>
            </div>
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* 搜索和篩選 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索用戶名稱或郵箱..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* 篩選器 */}
          <div className="flex gap-2">
            <select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有角色</option>
              {permissionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            
            <select 
              value={filterCompany} 
              onChange={(e) => setFilterCompany(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有公司</option>
              {/* 假設後端返回公司列表 */}
              <option value="公司A">公司A</option>
              <option value="公司B">公司B</option>
              <option value="公司C">公司C</option>
            </select>
          </div>
          
          {/* 新增用戶按鈕 */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            新增用戶
          </button>
        </div>
      </div>

      {/* 用戶列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用戶信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  公司
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.account} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.account}</div>
                      <div className="text-sm text-gray-500">{user.company}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.func_permissions.includes('admin') 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getUserRoleDisplay(user.func_permissions)}
                      </span>
                      <button
                        onClick={() => toggleUserRole(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        切換
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => deleteUser(user.account)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增用戶模態框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">新增用戶</h3>
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    帳號
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.account}
                    onChange={(e) => setNewUser({...newUser, account: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密碼
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公司
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.company}
                    onChange={(e) => setNewUser({...newUser, company: e.target.value})}
                  >
                    <option value="">請選擇公司</option>
                    {/* 假設後端返回公司列表 */}
                    <option value="公司A">公司A</option>
                    <option value="公司B">公司B</option>
                    <option value="公司C">公司C</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    權限
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {permissionOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={newUser.func_permissions.includes(option.value)}
                          onChange={(e) => {
                            const newPermissions = [...newUser.func_permissions];
                            if (e.target.checked) {
                              newPermissions.push(option.value);
                            } else {
                              newPermissions.splice(newPermissions.indexOf(option.value), 1);
                            }
                            setNewUser({...newUser, func_permissions: newPermissions});
                          }}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  新增
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 編輯用戶模態框 */}
{showEditModal && editingUser && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 className="text-lg font-semibold mb-4">編輯用戶</h3>
      <div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              帳號
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
              value={editingUser.account}
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              公司
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.company}
              onChange={(e) => setEditingUser({...editingUser, company: e.target.value})}
            >
              <option value="">請選擇公司</option>
              {/* 假設後端返回公司列表 */}
              <option value="公司A">公司A</option>
              <option value="公司B">公司B</option>
              <option value="公司C">公司C</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              權限
            </label>
            <div className="grid grid-cols-2 gap-2">
              {permissionOptions.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={editingUser.func_permissions.includes(option.value)}
                    onChange={(e) => {
                      const newPermissions = [...editingUser.func_permissions];
                      if (e.target.checked) {
                        newPermissions.push(option.value);
                      } else {
                        newPermissions.splice(newPermissions.indexOf(option.value), 1);
                      }
                      setEditingUser({...editingUser, func_permissions: newPermissions});
                    }}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};



export default AdminManagement;