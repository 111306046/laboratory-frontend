import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Shield, Edit, Trash2, Eye, ChevronDown, Filter } from 'lucide-react';

const PUAdduser = () => {
  const [users, setUsers] = useState([
    { 
      id: 1, 
      name: 'Alice Chen', 
      email: 'alice@lab.com', 
      role: 'admin', 
      lab: '生化實驗室',
      status: 'active',
      createdAt: '2024-01-15',
      lastLogin: '2024-06-15 09:30'
    },
    { 
      id: 2, 
      name: 'Bob Lin', 
      email: 'bob@lab.com', 
      role: 'user', 
      lab: '物理實驗室',
      status: 'active',
      createdAt: '2024-02-20',
      lastLogin: '2024-06-14 14:22'
    },
    { 
      id: 3, 
      name: 'Carol Wu', 
      email: 'carol@lab.com', 
      role: 'user', 
      lab: '生化實驗室',
      status: 'active',
      createdAt: '2024-03-10',
      lastLogin: '2024-06-13 16:45'
    },
    { 
      id: 4, 
      name: 'David Zhang', 
      email: 'david@lab.com', 
      role: 'admin', 
      lab: '化學實驗室',
      status: 'inactive',
      createdAt: '2024-01-25',
      lastLogin: '2024-05-20 11:15'
    }
  ]);

  const [laboratories] = useState([
    '生化實驗室',
    '物理實驗室', 
    '化學實驗室',
    '材料實驗室'
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterLab, setFilterLab] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 新增用戶表單狀態
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user',
    lab: '',
    password: ''
  });

  // 篩選用戶
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesLab = filterLab === 'all' || user.lab === filterLab;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesLab && matchesStatus;
  });

  // 角色切換
  const toggleUserRole = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, role: user.role === 'admin' ? 'user' : 'admin' }
        : user
    ));
  };

  // 狀態切換
  const toggleUserStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  // 新增用戶
  const handleAddUser = () => {
    // 基本驗證
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.lab) {
      alert('請填寫所有必填欄位');
      return;
    }
    
    const newId = Math.max(...users.map(u => u.id)) + 1;
    const userToAdd = {
      ...newUser,
      id: newId,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: '-'
    };
    setUsers([...users, userToAdd]);
    setNewUser({ name: '', email: '', role: 'user', lab: '', password: '' });
    setShowAddModal(false);
  };

  // 刪除用戶
  const deleteUser = (userId) => {
    if (window.confirm('確定要刪除此用戶嗎？')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  // 編輯用戶
const handleEditUser = (user) => {
  setEditingUser({...user});
  setShowEditModal(true);
};

// 保存編輯
const handleSaveEdit = () => {
  if (!editingUser.name || !editingUser.email || !editingUser.lab) {
    alert('請填寫所有必填欄位');
    return;
  }
  
  setUsers(users.map(user => 
    user.id === editingUser.id ? editingUser : user
  ));
  setShowEditModal(false);
  setEditingUser(null);
};

// 取消編輯
const handleCancelEdit = () => {
  setShowEditModal(false);
  setEditingUser(null);
};

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
                {users.filter(u => u.role === 'admin').length}
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
                {users.filter(u => u.role === 'user').length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">停用用戶</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'inactive').length}
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
              <option value="admin">管理員</option>
              <option value="user">一般用戶</option>
            </select>
            
            <select 
              value={filterLab} 
              onChange={(e) => setFilterLab(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有實驗室</option>
              {laboratories.map(lab => (
                <option key={lab} value={lab}>{lab}</option>
              ))}
            </select>
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有狀態</option>
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
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
                  實驗室
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最後登入
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' ? '管理員' : '一般用戶'}
                      </span>
                      <button
                        onClick={() => toggleUserRole(user.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        切換
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.lab}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? '啟用' : '停用'}
                      </span>
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        切換
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin}
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
                        onClick={() => deleteUser(user.id)}
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
                    姓名
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    郵箱
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
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
                    角色
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="user">一般用戶</option>
                    <option value="admin">管理員</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    實驗室
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUser.lab}
                    onChange={(e) => setNewUser({...newUser, lab: e.target.value})}
                  >
                    <option value="">請選擇實驗室</option>
                    {laboratories.map(lab => (
                      <option key={lab} value={lab}>{lab}</option>
                    ))}
                  </select>
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
              姓名
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.name}
              onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              郵箱
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.email}
              onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.role}
              onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
            >
              <option value="user">一般用戶</option>
              <option value="admin">管理員</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              實驗室
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.lab}
              onChange={(e) => setEditingUser({...editingUser, lab: e.target.value})}
            >
              <option value="">請選擇實驗室</option>
              {laboratories.map(lab => (
                <option key={lab} value={lab}>{lab}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              狀態
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingUser.status}
              onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
            >
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
            </select>
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



export default PUAdduser;