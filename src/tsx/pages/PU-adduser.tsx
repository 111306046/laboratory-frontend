import { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, Trash2,Shield, Edit,  Eye,  FlaskConical } from 'lucide-react';
import { 
  getPermissionOptions, 
  validatePermissions, 
  isValidPermission,
  type Permission 
} from '../utils/permissions';
import { getLabs, type LabInfo, deleteUser as deleteUserAPI } from '../services/api';
import { setUserAllowNotify } from '../utils/accessControl';

// 定義用戶介面 - 根據後端API結構調整
interface User {
  account: string;
  func_permissions: Permission[];
  company: string;
  lab?: string | string[]; // 實驗室，可以是單個字符串或字符串陣列
  allow_notify?: boolean; // 是否允許通知
  irole?: string;
  update_time?: string;
  delete_time?: string;
}

// 定義新用戶介面
interface NewUser {
  account: string;
  password: string;
  func_permissions: Permission[];
  company: string;
  lab?: string[]; // 實驗室陣列，支援多個實驗室
  irole?: string;
  allow_notify?: boolean; // 是否允許通知（影響是否顯示 set_thresholds / modify_notification）
}

const normalizeLabValue = (value: string | undefined | null) => {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[\s_\-]+/g, '');
};

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
    company: '',
    lab: [],
    allow_notify: false
  });

  // 實驗室列表
  const [labs, setLabs] = useState<LabInfo[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);

  // 角色選項
  const roleOptions = [
    { value: 'basic_user', label: '基本用戶', permissions: ['view_data', 'change_password'] as Permission[] },
    { value: 'admin', label: '管理員', permissions: ['create_user', 'modify_user', 'get_users', 'view_data', 'change_password'] as Permission[] },
    { value: 'lab_manager', label: '實驗室管理員', permissions: ['modify_lab', 'get_labs', 'view_data', 'change_password'] as Permission[] }
  ];

  // 從 localStorage 獲取公司 extra_auth 映射（在 ManageCompany 頁面更新時會保存）
  // 每次調用都會重新讀取 localStorage，確保獲取最新值
  const getCompanyExtraAuthMap = (): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem('company_extra_auth_map');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // 判斷公司是否有 extra_auth
  // 優先從 localStorage 讀取，如果沒有則默認判斷（NCCU 預設沒有）
  // 注意：每次調用都會重新讀取 localStorage，確保獲取最新的 extra_auth 狀態
  const getCompanyExtraAuth = (companyName: string): boolean => {
    if (!companyName) {
      // 如果沒有公司名稱，使用當前用戶的公司
      const currentCompany = localStorage.getItem('company') || localStorage.getItem('company_name') || '';
      companyName = currentCompany;
    }
    
    const companyKey = companyName.toUpperCase();
    // 每次都重新讀取 localStorage，確保獲取最新值
    const extraAuthMap = getCompanyExtraAuthMap();
    
    console.log('檢查公司 extra_auth:', {
      companyName,
      companyKey,
      extraAuthMap,
      hasRecord: companyKey in extraAuthMap,
      value: companyKey in extraAuthMap ? extraAuthMap[companyKey] : undefined
    });
    
    // 如果 localStorage 中有記錄，使用記錄的值
    if (companyKey in extraAuthMap) {
      const hasExtraAuth = extraAuthMap[companyKey];
      return hasExtraAuth;
    }
    
    // 否則使用默認判斷（NCCU 預設沒有 extra_auth）
    const defaultCompaniesWithoutExtraAuth = ['NCCU'];
    const defaultResult = !defaultCompaniesWithoutExtraAuth.includes(companyKey);
    return defaultResult;
  };
  
  // 權限選項（用於手動調整）- 根據輸入的公司動態過濾
  // 在創建用戶時，根據 newUser.company 判斷
  // 在編輯用戶時，根據 editingUser.company 判斷
  const getPermissionOptionsForCompany = (companyName?: string, allowNotifyOverride?: boolean) => {
    const companyHasExtraAuth = getCompanyExtraAuth(companyName || '');
    // 只要公司有 extra_auth「或」此使用者啟用了通知功能，就開放 extra 權限項
    const effectiveExtraAuth = companyHasExtraAuth || !!allowNotifyOverride;
    const options = getPermissionOptions(effectiveExtraAuth);
    return options;
  };
  
  // 獲取創建用戶時的權限選項（根據輸入的公司動態計算）
  // 使用 useMemo 確保當公司名稱改變時重新計算
  const permissionOptions = useMemo(() => {
    return getPermissionOptionsForCompany(newUser.company, newUser.allow_notify);
  }, [newUser.company, newUser.allow_notify]);

  // 獲取用戶列表
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/getUsers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true', // 跳過 ngrok 的瀏覽器警告頁面
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

  // 獲取實驗室列表
  const fetchLabs = async () => {
    try {
      setLoadingLabs(true);
      const labsData = await getLabs();
      setLabs(labsData);
    } catch (err) {
      console.error('獲取實驗室列表失敗:', err);
    } finally {
      setLoadingLabs(false);
    }
  };

  // 根據公司過濾實驗室（不區分大小寫）
  const filteredLabs = newUser.company 
    ? labs.filter(lab => lab.company.toLowerCase() === newUser.company.toLowerCase())
    : labs;

  // 組件加載時獲取用戶列表和實驗室列表
  useEffect(() => {
    fetchUsers();
    fetchLabs();
  }, []);

  // 篩選用戶
  const filteredUsers = users.filter(user => {
    if (user.delete_time) return false;
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

  // 新增用戶
  const handleAddUser = async () => {
    // 基本驗證，顯示具體缺失的欄位
    const missingFields: string[] = [];
    if (!newUser.account || newUser.account.trim() === '') {
      missingFields.push('帳號');
    }
    if (!newUser.password || newUser.password.trim() === '') {
      missingFields.push('密碼');
    }
    if (!newUser.company || newUser.company.trim() === '') {
      missingFields.push('公司');
    }
    if (!newUser.lab || newUser.lab.length === 0) {
      missingFields.push('實驗室');
    }
    
    if (missingFields.length > 0) {
      alert(`請填寫以下必填欄位：${missingFields.join('、')}`);
      return;
    }
    
    // 驗證所選實驗室是否屬於所選公司（不區分大小寫）
    const invalidLabs = (newUser.lab || []).filter(labName => {
      const lab = labs.find(l => l.name === labName);
      return !lab || lab.company.toLowerCase() !== newUser.company.toLowerCase();
    });
    
    if (invalidLabs.length > 0) {
      alert(`所選的實驗室不屬於公司 "${newUser.company}"：${invalidLabs.join('、')}`);
      return;
    }
    
    try {
      // 驗證新用戶的權限
      const validatedPermissions = validatePermissions(newUser.func_permissions.map(p => p as string));
      
      
      // 檢查是否為空權限
      if (validatedPermissions.length === 0) {
        console.warn('權限為空，使用默認權限');
        validatedPermissions.push('view_data', 'change_password');
      }
      
      // 檢查權限組合是否合理
      
      if (validatedPermissions.length !== newUser.func_permissions.length) {
        const invalidPermissions = newUser.func_permissions.filter(p => !isValidPermission(p as string));
        console.warn('發現無效權限:', invalidPermissions);
        alert(`發現無效權限: ${invalidPermissions.join(', ')}。已自動過濾。`);
      }
      
      // 確保權限數組是字符串數組
      const permissionsArray = validatedPermissions.map(p => p as string);
      
      // 確保 lab 是有效的陣列且不為空
      if (!newUser.lab || !Array.isArray(newUser.lab) || newUser.lab.length === 0) {
        alert('請至少選擇一個實驗室');
        return;
      }
      
      const labArray = newUser.lab;
      
      // 最後一次驗證：確保所有實驗室都屬於該公司
      const invalidLabs = labArray.filter(labName => {
        const lab = labs.find(l => l.name === labName);
        return !lab || lab.company.toLowerCase() !== newUser.company.toLowerCase();
      });
      
      if (invalidLabs.length > 0) {
        alert(`所選的實驗室不屬於公司 "${newUser.company}"：${invalidLabs.join('、')}`);
        return;
      }
      
      const requestBody = {
        account: newUser.account,
        password: newUser.password,
        func_permissions: permissionsArray,
        company: newUser.company,
        lab: labArray // 發送實驗室名稱陣列
      };
      
      
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true', // 跳過 ngrok 的瀏覽器警告頁面
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });


      if (!response.ok) {
        let errorMessage = '創建用戶失敗';
        let errorDetails = '';
        
        try {
          // 嘗試讀取響應文本
          const responseText = await response.text();
          
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
      setNewUser({ account: '', password: '', func_permissions: [], company: '', lab: [] });
      setShowAddModal(false);
      fetchUsers(); // 重新獲取用戶列表
    } catch (err) {
      alert(err instanceof Error ? err.message : '創建用戶失敗');
      console.error('創建用戶失敗:', err);
    }
  };

  // 刪除用戶
  const deleteUser = async (account: string) => {
    if (window.confirm('確定要刪除此用戶嗎？')) {
      try {
        await deleteUserAPI({ account }); // 調用後端 API
        setUsers(users.filter(user => user.account !== account));
        alert('用戶刪除成功');
        // 重新獲取用戶列表以確保數據同步
        await fetchUsers();
      } catch (error) {
        alert('刪除失敗: ' + (error instanceof Error ? error.message : '未知錯誤'));
        console.error('刪除用戶失敗:', error);
      }
    }
  };

  // 編輯用戶
  const handleEditUser = (user: User) => {
    const normalizedLabs = user.lab
      ? (Array.isArray(user.lab) ? user.lab : [user.lab]).map(l => l ?? '').filter(Boolean)
      : [];
    setEditingUser({
      ...user,
      lab: normalizedLabs.length > 0 ? normalizedLabs : []
    });
    setShowEditModal(true);
    // 在控制台輸出當前 localStorage 中的數據
    console.log('打開編輯用戶，檢查 localStorage:', {
      company: user.company,
      companyKey: user.company?.toUpperCase(),
      localStorageMap: getCompanyExtraAuthMap(),
      hasRecord: user.company ? user.company.toUpperCase() in getCompanyExtraAuthMap() : false,
      extraAuthValue: user.company ? getCompanyExtraAuthMap()[user.company.toUpperCase()] : undefined
    });
  };

  // 保存編輯
  const handleSaveEdit = async () => {
    if (!editingUser || !editingUser.account || !editingUser.company) {
      alert('請填寫所有必填欄位');
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      
      // 準備請求體，確保包含所有必需字段
      // 驗證並轉換權限為字符串數組
      const validatedPermissions = validatePermissions(editingUser.func_permissions.map(p => p as string));
      const permissionsArray = validatedPermissions.map(p => p as string);
      
      const requestBody: any = {
        account: editingUser.account,
        func_permissions: permissionsArray, // 確保是字符串數組
        company: editingUser.company
      };
      
      // 添加 lab 字段（如果存在）
      if (editingUser.lab !== undefined) {
        requestBody.lab = Array.isArray(editingUser.lab) ? editingUser.lab : [editingUser.lab];
      } else {
        // 如果沒有 lab，設置為空陣列
        requestBody.lab = [];
      }
      
      // 添加 allow_notify 字段（如果存在，否則默認為 false）
      requestBody.allow_notify = editingUser.allow_notify !== undefined ? editingUser.allow_notify : false;
      
      const response = await fetch('https://group14.site/api/modifyPermissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true', // 跳過 ngrok 的瀏覽器警告頁面
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 錯誤回應:', errorText);
        
        let errorMessage = '修改用戶失敗';
        try {
          const errorData = JSON.parse(errorText);
          // FastAPI 錯誤格式處理
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // detail 是陣列格式
              errorMessage = errorData.detail.map((e: any) => {
                const field = e.loc?.join('.') || '未知字段';
                return `${field}: ${e.msg}`;
              }).join(', ');
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else {
              errorMessage = JSON.stringify(errorData.detail);
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          errorMessage = `修改用戶失敗 (${response.status})`;
        }
        
        throw new Error(errorMessage);
      }

      const currentAccount = localStorage.getItem('user_account');
      const editedAccount = editingUser.account;
      const allowNotifyValue = editingUser.allow_notify ?? false;

      alert('用戶修改成功！');
      setShowEditModal(false);
      setEditingUser(null);
      if (currentAccount && currentAccount === editedAccount) {
        setUserAllowNotify(Boolean(allowNotifyValue));
      }
      fetchUsers(); // 重新獲取用戶列表
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '修改用戶失敗';
      alert(errorMsg);
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
            <FlaskConical className="w-8 h-8 text-red-500" />
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
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">
                          {user.account}
                        </div>
                        <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          使用中
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        更新時間：{user.update_time ?? '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.func_permissions.includes('create_user' as Permission) 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getUserRoleDisplay(user.func_permissions)}
                    </span>
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
                    onChange={(e) => {
                      const company = e.target.value;
                      // 當公司改變時，清空已選的實驗室（因為可能不屬於新公司）
                      const currentLabs = newUser.lab || [];
                      const validLabs = currentLabs.filter(labName => {
                        const lab = labs.find(l => l.name === labName);
                        return lab && lab.company.toLowerCase() === company.toLowerCase();
                      });
                      setNewUser({
                        ...newUser,
                        company: company,
                        lab: validLabs // 只保留屬於新公司的實驗室
                      });
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    實驗室 <span className="text-red-500">*</span>
                  </label>
                  {loadingLabs ? (
                    <div className="text-sm text-gray-500">載入實驗室列表中...</div>
                  ) : (
                    <div className="border border-gray-300 rounded px-3 py-2 max-h-32 overflow-y-auto">
                      {filteredLabs.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          {newUser.company ? `該公司暫無可用實驗室` : '請先輸入公司名稱'}
                        </div>
                      ) : (
                  <div className="space-y-2">
                      {(() => {
                        const currentLabs = newUser.lab || [];
                        const normalizedCurrentLabs = currentLabs.map(normalizeLabValue);
                        return filteredLabs.map((lab) => {
                          const labKey = normalizeLabValue(lab.name);
                          const isChecked = normalizedCurrentLabs.includes(labKey);
                          return (
                            <label key={lab.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const labsArray = newUser.lab || [];
                                  if (e.target.checked) {
                                    if (!isChecked) {
                                      setNewUser({
                                        ...newUser,
                                        lab: [...labsArray, lab.name]
                                      });
                                    }
                                  } else {
                                    setNewUser({
                                      ...newUser,
                                      lab: labsArray.filter(l => normalizeLabValue(l) !== labKey)
                                    });
                                  }
                                }}
                                className="mr-2"
                              />
                              <span className="text-sm">{lab.name}</span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                      )}
                    </div>
                  )}
                  {newUser.lab && newUser.lab.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      已選擇: {newUser.lab.join(', ')}
                    </div>
                  )}
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
              onChange={(e) => {
                const company = e.target.value;
                // 當公司改變時，清空已選的實驗室（因為可能不屬於新公司）
                const currentLabs = editingUser.lab ? (Array.isArray(editingUser.lab) ? editingUser.lab : [editingUser.lab]) : [];
                const validLabs = currentLabs.filter(labName => {
                  const lab = labs.find(l => l.name === labName);
                  return lab && lab.company.toLowerCase() === company.toLowerCase();
                });
                setEditingUser({
                  ...editingUser,
                  company: company,
                  lab: validLabs.length > 0 ? validLabs : []
                });
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              實驗室 <span className="text-red-500">*</span>
            </label>
            {loadingLabs ? (
              <div className="text-sm text-gray-500">載入實驗室列表中...</div>
            ) : (
              <div className="border border-gray-300 rounded px-3 py-2 max-h-32 overflow-y-auto">
                {(() => {
                  // 過濾出屬於當前公司的實驗室
                  const companyLabs = labs.filter(lab => 
                    lab.company.toLowerCase() === (editingUser.company || '').toLowerCase()
                  );
                  
                  if (companyLabs.length === 0) {
                    return (
                      <div className="text-sm text-gray-500">
                        {editingUser.company ? `該公司暫無可用實驗室` : '請先輸入公司名稱'}
                      </div>
                    );
                  }
                  
                  const currentLabs = editingUser.lab ? (Array.isArray(editingUser.lab) ? editingUser.lab : [editingUser.lab]) : [];
                  const normalizedCurrentLabs = currentLabs.map(normalizeLabValue);
                  
                  return (
                    <div className="space-y-2">
                      {companyLabs.map((lab) => {
                        const labKey = normalizeLabValue(lab.name);
                        const isChecked = normalizedCurrentLabs.includes(labKey);
                        return (
                          <label key={lab.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const labsArray = currentLabs;
                                if (e.target.checked) {
                                  if (!isChecked) {
                                    setEditingUser({
                                      ...editingUser,
                                      lab: [...labsArray, lab.name]
                                    });
                                  }
                                } else {
                                  setEditingUser({
                                    ...editingUser,
                                    lab: labsArray.filter(l => normalizeLabValue(l) !== labKey)
                                  });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{lab.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            {editingUser.lab && (Array.isArray(editingUser.lab) ? editingUser.lab : [editingUser.lab]).length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                已選擇: {(Array.isArray(editingUser.lab) ? editingUser.lab : [editingUser.lab]).join(', ')}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              允許通知
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editingUser.allow_notify || false}
                onChange={(e) => setEditingUser({...editingUser, allow_notify: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">啟用通知功能</span>
            </label>
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
              {getPermissionOptionsForCompany(editingUser.company || '', editingUser.allow_notify).map(option => (
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