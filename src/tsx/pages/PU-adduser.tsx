import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Shield, Edit, Trash2, Eye, ChevronDown, Filter } from 'lucide-react';
import { 
  getPermissionOptions, 
  validatePermissions, 
  isValidPermission,
  testPermissionSystem,
  type Permission 
} from '../utils/permissions';

// 定義用戶介面 - 根據後端API結構調整
interface User {
  account: string;
  func_permissions: Permission[];
  company: string;
  irole?: string;
}

// 定義新用戶介面
interface NewUser {
  account: string;
  password: string;
  func_permissions: Permission[];
  company: string;
  irole?: string;
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

  // 角色選項
  const roleOptions = [
    { value: 'basic_user', label: '基本用戶', permissions: ['view_data', 'change_password'] as Permission[] },
    { value: 'admin', label: '管理員', permissions: ['create_user', 'modify_user', 'get_users', 'view_data', 'change_password'] as Permission[] },
    { value: 'lab_manager', label: '實驗室管理員', permissions: ['modify_lab', 'get_labs', 'view_data', 'change_password'] as Permission[] }
  ];

  // 權限選項（用於手動調整）
  const permissionOptions = [
    { value: 'view_data', label: '查看數據' },
    { value: 'change_password', label: '修改密碼' },
    { value: 'create_user', label: '創建用戶' },
    { value: 'modify_user', label: '修改用戶' },
    { value: 'get_users', label: '查看用戶列表' },
    { value: 'modify_lab', label: '修改實驗室' },
    { value: 'get_labs', label: '查看實驗室' },
    { value: 'control_machine', label: '控制機器 (謹慎使用)' }
  ];

  // 獲取用戶列表
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/getUsers', {
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
    const matchesRole = filterRole === 'all' || user.func_permissions.includes(filterRole as Permission);
    const matchesCompany = filterCompany === 'all' || user.company === filterCompany;
    
    return matchesSearch && matchesRole && matchesCompany;
  });



  // 獲取用戶角色顯示
  const getUserRoleDisplay = (permissions: Permission[]) => {
    if (permissions.includes('create_user' as Permission)) return '管理員';
    if (permissions.includes('modify_lab' as Permission)) return '實驗室管理員';
    if (permissions.includes('view_data' as Permission)) return '數據查看者';
    return '一般用戶';
  };

  // 獲取用戶角色類型
  const getUserRoleType = (permissions: Permission[]) => {
    if (permissions.includes('create_user' as Permission)) return 'admin';
    if (permissions.includes('modify_lab' as Permission)) return 'lab_manager';
    if (permissions.includes('view_data' as Permission)) return 'data_viewer';
    return 'user';
  };



  // 修改用戶權限
  const modifyUserPermissions = async (account: string, newPermissions: Permission[]) => {
    try {
      // 驗證權限是否在允許列表中
      const permissionStrings = newPermissions.map(p => p as string);
      const validatedPermissions = validatePermissions(permissionStrings);
      
      console.log('修改權限 - 原始權限:', permissionStrings);
      console.log('修改權限 - 驗證後權限:', validatedPermissions);
      
      if (validatedPermissions.length !== newPermissions.length) {
        const invalidPermissions = newPermissions.filter(p => !isValidPermission(p as string));
        console.warn('發現無效權限:', invalidPermissions);
        alert(`發現無效權限: ${invalidPermissions.join(', ')}。已自動過濾。`);
      }
      
      const response = await fetch('/api/modifyPermissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          account: account,
          func_permissions: validatedPermissions.map(p => p as string)
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
    let newPermissions: Permission[];
    
    switch (currentRole) {
      case 'admin':
        newPermissions = ['view_data' as Permission];
        break;
      case 'user':
        newPermissions = ['create_user', 'modify_user', 'get_users', 'modify_lab', 'get_labs', 'view_data', 'control_machine', 'change_password'] as Permission[];
        break;
      case 'lab_manager':
        newPermissions = ['view_data' as Permission];
        break;
      case 'data_viewer':
        newPermissions = ['view_data' as Permission];
        break;
      default:
        newPermissions = ['create_user', 'modify_user', 'get_users', 'modify_lab', 'get_labs', 'view_data', 'control_machine', 'change_password'] as Permission[];
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
      // 驗證新用戶的權限
      const validatedPermissions = validatePermissions(newUser.func_permissions.map(p => p as string));
      
      console.log('原始權限:', newUser.func_permissions);
      console.log('驗證後權限:', validatedPermissions);
      
      // 檢查是否為空權限
      if (validatedPermissions.length === 0) {
        console.warn('權限為空，使用默認權限');
        validatedPermissions.push('view_data', 'change_password');
      }
      
      // 檢查權限組合是否合理
      console.log('權限組合檢查:');
      console.log('- 包含管理權限:', validatedPermissions.includes('create_user') || validatedPermissions.includes('modify_user'));
      console.log('- 包含查看權限:', validatedPermissions.includes('view_data'));
      console.log('- 包含基本權限:', validatedPermissions.includes('change_password'));
      
      if (validatedPermissions.length !== newUser.func_permissions.length) {
        const invalidPermissions = newUser.func_permissions.filter(p => !isValidPermission(p as string));
        console.warn('發現無效權限:', invalidPermissions);
        alert(`發現無效權限: ${invalidPermissions.join(', ')}。已自動過濾。`);
      }
      
      // 確保權限數組是字符串數組
      const permissionsArray = validatedPermissions.map(p => p as string);
      
      const requestBody = {
        account: newUser.account,
        password: newUser.password,
        func_permissions: permissionsArray,
        company: newUser.company
      };
      
      console.log('發送給後端的數據:', requestBody);
      console.log('權限數組類型:', typeof validatedPermissions);
      console.log('權限數組內容:', validatedPermissions);
      console.log('JSON字符串化後:', JSON.stringify(requestBody));
      
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('響應狀態:', response.status);
      console.log('響應頭:', response.headers);

      if (!response.ok) {
        let errorMessage = '創建用戶失敗';
        let errorDetails = '';
        
        try {
          // 嘗試讀取響應文本
          const responseText = await response.text();
          console.log('響應文本:', responseText);
          
          // 檢查是否是HTML錯誤頁面
          if (responseText.includes('Internal Server Error') || responseText.includes('<html>')) {
            errorMessage = '後端服務器內部錯誤';
            errorDetails = '請檢查後端服務器狀態或聯繫管理員';
          } else if (responseText) {
            // 嘗試解析為JSON
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorMessage;
              errorDetails = errorData.details || '';
            } catch (jsonError) {
              console.log('響應不是JSON格式，使用原始文本');
              errorMessage = responseText || errorMessage;
            }
          }
        } catch (e) {
          console.error('無法讀取錯誤響應:', e);
        }
        
        const fullErrorMessage = errorDetails 
          ? `${errorMessage} (狀態碼: ${response.status}) - ${errorDetails}`
          : `${errorMessage} (狀態碼: ${response.status})`;
          
        throw new Error(fullErrorMessage);
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
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const response = await fetch('http://13.211.240.55/api/modifyPermissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: editingUser.account,
          func_permissions: editingUser.func_permissions,
          company: editingUser.company
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 錯誤回應:', errorText);
        
        let errorMessage = '修改用戶失敗';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || '修改用戶失敗';
        } catch (e) {
          errorMessage = `修改用戶失敗 (${response.status})`;
        }
        
        throw new Error(errorMessage);
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
                {users.filter(u => u.func_permissions.includes('create_user' as Permission)).length}
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
                {users.filter(u => u.func_permissions.includes('view_data' as Permission)).length}
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
                {users.filter(u => u.func_permissions.includes('modify_lab' as Permission)).length}
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
                        user.func_permissions.includes('create_user' as Permission) 
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
                  <input
                    type="text"
                    placeholder="請輸入公司名稱"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.company}
                    onChange={(e) => setNewUser({...newUser, company: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.irole || ''}
                    onChange={(e) => {
                      const selectedRole = e.target.value;
                      const role = roleOptions.find(r => r.value === selectedRole);
                      setNewUser({
                        ...newUser,
                        irole: selectedRole,
                        func_permissions: role ? role.permissions : []
                      });
                    }}
                  >
                    <option value="">請選擇角色</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    權限 (根據角色自動分配，可手動調整)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {permissionOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={newUser.func_permissions.includes(option.value as Permission)}
                          onChange={(e) => {
                            const newPermissions = [...newUser.func_permissions];
                            if (e.target.checked) {
                              newPermissions.push(option.value as Permission);
                            } else {
                              newPermissions.splice(newPermissions.indexOf(option.value as Permission), 1);
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
            <input
              type="text"
              placeholder="請輸入公司名稱"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.company}
              onChange={(e) => setEditingUser({...editingUser, company: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.irole || ''}
              onChange={(e) => {
                const selectedRole = e.target.value;
                const role = roleOptions.find(r => r.value === selectedRole);
                setEditingUser({
                  ...editingUser,
                  irole: selectedRole,
                  func_permissions: role ? role.permissions : []
                });
              }}
            >
              <option value="">請選擇角色</option>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              權限 (根據角色自動分配，可手動調整)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {permissionOptions.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={editingUser.func_permissions.includes(option.value as Permission)}
                    onChange={(e) => {
                      const newPermissions = [...editingUser.func_permissions];
                      if (e.target.checked) {
                        newPermissions.push(option.value as Permission);
                      } else {
                        newPermissions.splice(newPermissions.indexOf(option.value as Permission), 1);
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