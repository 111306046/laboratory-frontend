import React, { useState, useEffect, useCallback } from 'react';
import { manageCompany, getCompany, deleteCompany, getCompanyByName } from '../services/api';
import { Trash2, Building2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const SUPER_USER_ACCOUNT = 'yezyez';

const ManageCompany: React.FC = () => {
  const [isSuperUser, setIsSuperUser] = useState<boolean | null>(null);
  // 右側表單狀態
  const [company, setCompany] = useState('');
  const [extraAuth, setExtraAuth] = useState<boolean>(false);
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompanyDetail, setLoadingCompanyDetail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // 左側列表狀態
  const [companies, setCompanies] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const account = typeof window !== 'undefined' ? localStorage.getItem('user_account') : null;
    setIsSuperUser(account === SUPER_USER_ACCOUNT);
  }, []);

  // 獲取公司列表
  const fetchCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true);
      const data = await getCompany();
      setCompanies(data);
    } catch (err: any) {
      setMessage(err?.message || '獲取公司列表失敗');
      setMessageType('error');
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  // 元件載入時獲取公司列表
  useEffect(() => {
    if (isSuperUser) {
      fetchCompanies();
    }
  }, [isSuperUser, fetchCompanies]);

  // 編輯公司（點擊公司名稱時填充表單）
  const handleEditCompany = async (companyName: string) => {
    setCompany(companyName);
    setEditingCompanyName(companyName);
    setMessage(`正在載入公司 "${companyName}" 的詳細資訊...`);
    setMessageType('info');
    setLoadingCompanyDetail(true);
    try {
      const detail = await getCompanyByName(companyName);
      setExtraAuth(!!detail.extra_auth);
      setIp(detail.IP || '');
      setMessage(null);
    } catch (err: any) {
      setExtraAuth(false);
      setIp('');
      setMessage(err?.message || '無法取得公司詳細資訊，請手動輸入。');
      setMessageType('error');
    } finally {
      setLoadingCompanyDetail(false);
    }
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setCompany('');
    setExtraAuth(false);
    setIp('');
    setEditingCompanyName(null);
    setMessage(null);
  };

  // 刪除公司
  const handleDeleteCompany = async (companyName: string, e?: React.MouseEvent) => {
    // 阻止事件冒泡，避免觸發編輯
    if (e) {
      e.stopPropagation();
    }
    
    if (!window.confirm(`確定要刪除公司 "${companyName}" 嗎？`)) {
      return;
    }

    try {
      setDeletingCompany(companyName);
      await deleteCompany({ company: companyName });
      setMessage(`公司 "${companyName}" 已刪除`);
      setMessageType('success');
      // 如果正在編輯的公司被刪除，清除編輯狀態
      if (editingCompanyName === companyName) {
        handleCancelEdit();
      }
      // 重新獲取列表
      await fetchCompanies();
    } catch (err: any) {
      setMessage(err?.message || '刪除失敗');
      setMessageType('error');
    } finally {
      setDeletingCompany(null);
    }
  };

  // 提交表單（建立/更新公司）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) {
      setMessage('請輸入公司名稱');
      return;
    }
    if (!ip) {
      setMessage('請輸入 IP 地址');
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      setMessageType('info');
      const res = await manageCompany({ company, extra_auth: extraAuth, IP: ip });
      // 確保顯示後端返回的消息（新增成功 或 修改成功）
      const successMessage = res.message || '操作成功';
      setMessage(successMessage);
      setMessageType('success');
      
      // 保存公司的 extra_auth 狀態到 localStorage，供其他頁面使用
      try {
        const extraAuthMapStr = localStorage.getItem('company_extra_auth_map');
        const extraAuthMap = extraAuthMapStr ? JSON.parse(extraAuthMapStr) : {};
        const companyKey = company.toUpperCase();
        extraAuthMap[companyKey] = extraAuth;
        localStorage.setItem('company_extra_auth_map', JSON.stringify(extraAuthMap));
      } catch (error) {
        console.error('保存公司 extra_auth 狀態失敗:', error);
      }
      
      // 重置表單和編輯狀態
      setCompany('');
      setExtraAuth(false);
      setIp('');
      setEditingCompanyName(null);
      // 重新獲取列表
      await fetchCompanies();
    } catch (err: any) {
      setMessage(err?.message || '送出失敗');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (isSuperUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSuperUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">僅限系統管理員</h2>
          <p className="text-gray-600 mb-4">您沒有權限訪問公司管理頁面</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">公司管理</h1>
      
      {message && (
        <div className={`mb-4 p-3 rounded border flex items-center gap-2 ${
          messageType === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : messageType === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : messageType === 'error' ? (
            <XCircle className="w-5 h-5 text-red-600" />
          ) : null}
          <span>{message}</span>
          <button
            onClick={() => {
              setMessage(null);
              setMessageType('info');
            }}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側：公司列表 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              現有公司
            </h2>
            <button
              onClick={fetchCompanies}
              disabled={loadingCompanies}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="重新整理"
            >
              <RefreshCw className={`w-4 h-4 ${loadingCompanies ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingCompanies ? (
            <div className="text-center py-8 text-gray-500">載入中...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">目前沒有公司</div>
          ) : (
            <div className="space-y-2">
              {companies.map((companyName) => (
                <div
                  key={companyName}
                  onClick={() => handleEditCompany(companyName)}
                  className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                    editingCompanyName === companyName
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900 mb-1">
                      {companyName}
                      {editingCompanyName === companyName && (
                        <span className="ml-2 text-sm text-blue-600">(編輯中)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {/* 後端 API 目前只返回公司名稱，無法取得額外購買服務（extra_auth）資訊 */}
                      {/* 建議修改後端 API 返回完整物件陣列以顯示特別權限狀態 */}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCompany(companyName, e)}
                    disabled={deletingCompany === companyName}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="刪除公司"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右側：建立/管理公司表單 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingCompanyName ? `編輯公司: ${editingCompanyName}` : '新增/更新公司'}
            </h2>
            {editingCompanyName && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                取消編輯
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司名稱</label>
              <input
                type="text"
                className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  editingCompanyName ? 'bg-gray-100' : ''
                }`}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="例如：NCCU"
                readOnly={!!editingCompanyName}
              />
              {editingCompanyName && (
                <p className="mt-1 text-xs text-gray-500">公司名稱無法修改</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IP 地址</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="例如：192.168.1.1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="extraAuth"
                type="checkbox"
                className="h-4 w-4"
                checked={extraAuth}
                onChange={(e) => setExtraAuth(e.target.checked)}
              />
              <label htmlFor="extraAuth" className="text-sm text-gray-700 select-none">
                額外購買服務
              </label>
            </div>
            {loadingCompanyDetail && (
              <p className="text-sm text-blue-600">正在載入公司詳細資料...</p>
            )}
            <button
              type="submit"
              disabled={loading || loadingCompanyDetail}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? '送出中...' : loadingCompanyDetail ? '等待載入...' : '送出'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default ManageCompany;
