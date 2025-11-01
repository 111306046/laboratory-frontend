import { useState, useEffect } from 'react';
import { Bell, Settings, Save, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { generateBindingCode, getThresholds, getThresholdBySensor, setThresholds, ThresholdItem, getUsers, UserInfo, getLabs, deleteThresholds } from '../services/api';

// 警報介面定義
interface AlertItem {
  id: number;
  name: string;
  parameter: string;
  unit: string;
  minValue: number;
  maxValue: number;
  enabled: boolean;
  priority: string;
}

interface NotificationSettings {
  email: boolean;
  sms: boolean;
  sound: boolean;
  push: boolean;
}

// 停用本地 mock 通知 API，避免連線錯誤影響頁面
const API_BASE_URL = '';

const Alert = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    sound: true,
    push: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [lastSync, setLastSync] = useState(new Date());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bindingCode, setBindingCode] = useState<string | null>(null);
  const [bindingExpiresAt, setBindingExpiresAt] = useState<number | null>(null);
  const [bindingCountdown, setBindingCountdown] = useState<number>(0);
  const [bindingLoading, setBindingLoading] = useState<boolean>(false);
  
  // 新增警報設定相關狀態
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [newAlertSensor, setNewAlertSensor] = useState<string>('temperature');
  const [newAlertMin, setNewAlertMin] = useState<number>(0);
  const [newAlertMax, setNewAlertMax] = useState<number>(100);
  
  // 可用的感測器列表
  const availableSensors = [
    { value: 'temperature', label: '溫度', unit: '°C' },
    { value: 'humidity', label: '濕度', unit: '%' },
    { value: 'co2', label: 'CO2', unit: 'ppm' },
    { value: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
    { value: 'pm10', label: 'PM10', unit: 'µg/m³' },
    { value: 'pm25_average', label: 'PM2.5 平均', unit: 'µg/m³' },
    { value: 'pm10_average', label: 'PM10 平均', unit: 'µg/m³' },
    { value: 'tvoc', label: 'TVOC', unit: 'ppm' }
  ];

  // API 函數
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    // 本頁的通知相關 API 僅作為示意，若未啟動本地 mock，直接回傳預設值，避免報錯
    if (!API_BASE_URL) {
      if (endpoint === '/notifications') {
        return Promise.resolve(notifications);
      }
      return Promise.resolve({});
    }
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      setConnectionStatus('connected');
      return await response.json();
    } catch (error: any) {
      setConnectionStatus('error');
      setError(error.message);
      throw error;
    }
  };

  // 當前用戶的 lab 信息（從 API 獲取）
  const [userLab, setUserLab] = useState<string | null>(null);
  
  // 從 API 獲取當前用戶的 lab 信息
  // 注意：lab 信息存儲在實驗室數據中，不是用戶數據中
  // 需要從所有實驗室中查找包含該用戶的實驗室
  const fetchUserLab = async () => {
    try {
      const userAccount = localStorage.getItem('user_account');
      if (!userAccount) {
        return;
      }
      
      // 獲取所有實驗室列表
      const labs = await getLabs();
      
      // 查找包含該用戶的實驗室
      // 後端的 lab 數據結構中應該有 users 或 accounts 字段來存儲用戶列表
      // 遍歷所有實驗室，查找包含當前用戶帳號的實驗室
      let foundLab: string | null = null;
      
      for (const lab of labs) {
        // 檢查 lab 數據中是否包含該用戶
        // 可能的字段名稱：users, accounts, user_accounts 等
        const labData = lab as any; // 使用 any 以訪問可能存在的字段
        
        // 檢查各種可能的用戶字段
        if (labData.users && Array.isArray(labData.users)) {
          if (labData.users.includes(userAccount)) {
            foundLab = lab.name;
            break;
          }
        } else if (labData.accounts && Array.isArray(labData.accounts)) {
          if (labData.accounts.includes(userAccount)) {
            foundLab = lab.name;
            break;
          }
        } else if (labData.user_accounts && Array.isArray(labData.user_accounts)) {
          if (labData.user_accounts.includes(userAccount)) {
            foundLab = lab.name;
            break;
          }
        }
      }
      
      if (foundLab) {
        // 直接使用後端返回的實驗室名稱，不做任何轉換
        setUserLab(foundLab);
      } else {
        // 如果找不到，嘗試使用 localStorage 中的值作為後備
        const fallbackLab = localStorage.getItem('user_lab') || localStorage.getItem('company_lab');
        if (fallbackLab) {
          try {
            const parsed = JSON.parse(fallbackLab);
            const labValue = Array.isArray(parsed) ? parsed[0] : parsed;
            if (labValue && typeof labValue === 'string') {
              setUserLab(labValue);
            }
          } catch {
            if (typeof fallbackLab === 'string') {
              setUserLab(fallbackLab);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 獲取用戶 lab 信息失敗:', error);
    }
  };
  
  // 獲取用戶的 lab 信息（優先級：從 API 獲取的 userLab > localStorage 中的 user_lab > company_lab > 默認值）
  const getUserLab = (): string => {
    // 首先使用從 API 獲取的 lab
    if (userLab) {
      return userLab;
    }
    
    // 其次嘗試從 localStorage 中的 user_lab 獲取
    try {
      const userLabStr = localStorage.getItem('user_lab');
      if (userLabStr) {
        const parsedLab = JSON.parse(userLabStr);
        if (Array.isArray(parsedLab) && parsedLab.length > 0) {
          return parsedLab[0];
        } else if (typeof parsedLab === 'string' && parsedLab) {
          return parsedLab;
        }
      }
    } catch (e) {
      // 忽略解析錯誤
    }
    
    // 再次嘗試從 company_lab 獲取
    const companyLab = localStorage.getItem('company_lab');
    if (companyLab) {
      return companyLab;
    }
    
    // 最後使用默認值（不應該發生，因為應該已經從 API 獲取）
    console.error('❌ 未找到 lab 信息，使用默認值');
    console.error('  這不應該發生！請檢查：');
    console.error('  1. 後端 /getUsers API 是否返回用戶的 lab 字段');
    console.error('  2. 用戶帳號是否正確保存在 localStorage (user_account)');
    console.error('  3. fetchUserLab 函數是否成功執行');
    return 'nccu_lab';
  };

  // 載入警報設定
  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      const lab = getUserLab();
      
      if (!lab) {
        setAlerts([]); // 顯示空狀態
        return;
      }
      
      // 後端對 getThresholds 可能要求 sensor，這裡以所有感測器清單並行請求
      const sensors = ['temperature', 'humidity', 'co2', 'pm25', 'pm10', 'pm25_average', 'pm10_average', 'tvoc'];
      const fetched = await Promise.all(
        sensors.map(async (s) => {
          const one = await getThresholdBySensor({ company, lab, sensor: s });
          // 如果沒有數據（返回 null），返回一個標記為「未設定」的項目
          return one;
        })
      );

      const unitOf = (sensor: string): string => {
        switch (sensor) {
          case 'temperature': return '°C';
          case 'humidity': return '%';
          case 'co2': return 'ppm';
          case 'pm25': return 'µg/m³';
          case 'pm10': return 'µg/m³';
          case 'pm25_average': return 'µg/m³';
          case 'pm10_average': return 'µg/m³';
          case 'tvoc': return 'ppm';
          default: return '';
        }
      };

      // 只顯示有設定過的警報（過濾掉 null）
      const itemsWithData = fetched.filter((it): it is ThresholdItem => it !== null);
      
      if (itemsWithData.length === 0) {
        // 沒有任何設定，顯示空狀態
        setAlerts([]);
        setLastSync(new Date());
        return;
      }

      const mapped: AlertItem[] = itemsWithData.map((it, idx) => ({
        id: idx + 1,
        name: `${it.sensor} 監控`,
        parameter: it.sensor,
        unit: unitOf(it.sensor),
        minValue: typeof (it.threshold?.min) === 'number' ? it.threshold.min : 0,
        maxValue: typeof (it.threshold?.max) === 'number' ? it.threshold.max : 0,
        enabled: (it.threshold?.enabled) ?? true,
        priority: 'medium'
      }));

      setAlerts(mapped);
      setLastSync(new Date());
    } catch (error: any) {
      console.error('載入警報設定失敗:', error);
      const errorMessage = error?.message || '載入警報設定失敗';
      setError(errorMessage);
      // 載入失敗時顯示空狀態，不顯示預設數據
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // 載入通知設定
  const loadNotifications = async () => {
    try {
      const data = await apiCall('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('載入通知設定失敗:', error);
    }
  };

  // 組件載入時執行
  useEffect(() => {
    // 首先獲取用戶的 lab 信息
    fetchUserLab();
    loadNotifications();
  }, []);
  
  // 當 userLab 更新時，重新載入警報設定
  useEffect(() => {
    if (userLab) {
      loadAlerts();
    } else {
      // 如果還沒有 userLab，嘗試使用 localStorage 中的值載入（作為後備）
      const fallbackLab = localStorage.getItem('user_lab') || localStorage.getItem('company_lab');
      if (fallbackLab) {
        try {
          const parsedLab = JSON.parse(fallbackLab);
          const labValue = Array.isArray(parsedLab) ? parsedLab[0] : parsedLab;
          if (labValue && typeof labValue === 'string') {
            loadAlerts();
          }
        } catch {
          if (typeof fallbackLab === 'string') {
            loadAlerts();
          }
        }
      }
    }
  }, [userLab]);

  // 倒數計時效果
  useEffect(() => {
    if (!bindingExpiresAt) return;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remain = Math.max(bindingExpiresAt - now, 0);
      setBindingCountdown(remain);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bindingExpiresAt]);

  const updateAlert = async (id: number, field: string, value: any) => {
    const updatedAlerts = alerts.map(alert => 
      alert.id === id ? { ...alert, [field]: value } : alert
    );
    setAlerts(updatedAlerts);

    try {
      const updated = updatedAlerts.find(a => a.id === id);
      if (!updated) return;
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      const lab = getUserLab();
      await setThresholds({ company, lab, sensor: updated.parameter, min: updated.minValue, max: updated.maxValue, enabled: updated.enabled });
    } catch (error: any) {
      console.error('更新警報失敗:', error);
      // 失敗時回退
      loadAlerts();
    }
  };

  const toggleAlert = async (id: number) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      await updateAlert(id, 'enabled', !alert.enabled);
    }
  };
  
  // 新增警報設定
  const handleAddAlert = async () => {
    try {
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      const lab = getUserLab();
      
      if (!lab) {
        setError('無法獲取 lab 信息，無法新增警報設定');
        return;
      }
      
      await setThresholds({
        company,
        lab,
        sensor: newAlertSensor,
        min: newAlertMin,
        max: newAlertMax,
        enabled: true
      });
      
      // 關閉模態框並重置表單
      setShowAddAlertModal(false);
      setNewAlertSensor('temperature');
      setNewAlertMin(0);
      setNewAlertMax(100);
      
      // 重新載入警報列表
      await loadAlerts();
    } catch (error: any) {
      console.error('新增警報設定失敗:', error);
      setError(error?.message || '新增警報設定失敗');
    }
  };
  
  // 刪除警報設定
  const handleDeleteAlert = async (sensor: string) => {
    try {
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      const lab = getUserLab();
      
      if (!lab) {
        setError('無法獲取 lab 信息，無法刪除警報設定');
        return;
      }
      
      await deleteThresholds({ company, lab, sensor });
      
      // 重新載入警報列表
      await loadAlerts();
    } catch (error: any) {
      console.error('刪除警報設定失敗:', error);
      setError(error?.message || '刪除警報設定失敗');
    }
  };

  // 通知設定已簡化為 LINE 專用，此函數保留以相容既有結構

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      await apiCall('/alerts/bulk', {
        method: 'PUT',
        body: JSON.stringify({ alerts, notifications })
      });
      
      setShowSaveModal(true);
      setLastSync(new Date());
      setTimeout(() => setShowSaveModal(false), 2000);
    } catch (error) {
      console.error('保存設定失敗:', error);
      setError('保存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const refreshData = () => {
    loadAlerts();
    loadNotifications();
  };

  // 產生 LINE 綁定碼
  const handleGenerateBindingCode = async () => {
    try {
      setBindingLoading(true);
      setError(null);
      const res = await generateBindingCode();
      if (res.binding_code) {
        setBindingCode(res.binding_code);
        // 有些後端會在插入時設定 5 分鐘，這裡用前端 5 分鐘倒數作為視覺提示
        const expireTs = Math.floor(Date.now() / 1000) + 300;
        setBindingExpiresAt(expireTs);
      }
    } catch (e: any) {
      setError(e?.message || '產生綁定碼失敗');
    } finally {
      setBindingLoading(false);
    }
  };

  // 發送 LINE 測試通知（假後端）
  const sendTestLineNotify = async () => {
    try {
      setSaving(true);
      const company =
        localStorage.getItem('company_name') ||
        localStorage.getItem('company') ||
        localStorage.getItem('company_lab') ||
        'NCCU';
      const message = `【警報測試】${company} 實驗室\n` +
        alerts
          .filter(a => a.enabled)
          .map(a => `${a.name}: ${a.minValue} ~ ${a.maxValue} ${a.unit}`)
          .join('\n');

      // 呼叫假後端接口（本地 mock），若無後端則不報錯
      try {
        await apiCall('/alerts/notify', {
          method: 'POST',
          body: JSON.stringify({ message, priority: 'medium', company_lab: company })
        });
      } catch (e) {
        // 若本地 mock 不存在，視為成功（純前端 demo）
      }

      setShowSaveModal(true);
      setTimeout(() => setShowSaveModal(false), 1500);
    } catch (err) {
      console.error('發送測試通知失敗:', err);
      setError('發送測試通知失敗');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">載入警報設定中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-full">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">實驗室警報設置系統</h1>
                <p className="text-gray-600">配置環境參數監控與警報通知</p>
              </div>
            </div>
            
            {/* 連線狀態 */}
            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                title="重新整理"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span className={`text-sm ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionStatus === 'connected' ? '已連線' : '連線異常'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 錯誤訊息 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 警報參數設置 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  監控參數設置
                </h2>
                <button
                  onClick={() => setShowAddAlertModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <span>+</span>
                  新增警報設定
                </button>
              </div>
              
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">尚未設定任何警報</p>
                    <p className="text-sm">點擊「新增警報設定」按鈕開始設定</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                  <div key={alert.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${alert.enabled ? '' : 'opacity-60'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleAlert(alert.id)}
                          className={`w-10 h-6 rounded-full p-1 transition-colors ${
                            alert.enabled ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            alert.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                        <div>
                          <h3 className="font-medium text-gray-900">{alert.name}</h3>
                          {alert.enabled ? (
                            <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getPriorityColor(alert.priority)}`}>
                              {alert.priority === 'high' ? '高優先級' : 
                               alert.priority === 'medium' ? '中優先級' : '低優先級'}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                              已停用
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <select
                          value={alert.priority}
                          onChange={(e) => updateAlert(alert.id, 'priority', e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                          disabled={!alert.enabled}
                        >
                          <option value="low">低優先級</option>
                          <option value="medium">中優先級</option>
                          <option value="high">高優先級</option>
                        </select>
                        <button
                          onClick={() => handleDeleteAlert(alert.parameter)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="刪除此警報設定"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          最小值 ({alert.unit})
                        </label>
                        <input
                          type="number"
                          value={alert.minValue}
                          onChange={(e) => updateAlert(alert.id, 'minValue', parseFloat(e.target.value))}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                          disabled={!alert.enabled}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          最大值 ({alert.unit})
                        </label>
                        <input
                          type="number"
                          value={alert.maxValue}
                          onChange={(e) => updateAlert(alert.id, 'maxValue', parseFloat(e.target.value))}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                          disabled={!alert.enabled}
                        />
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>

          {/* 通知設置 & 狀態面板 */}
          <div className="space-y-6">
            {/* LINE 綁定區塊 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">LINE 綁定</h3>
              <p className="text-gray-600 text-sm mb-4">點擊產生綁定碼，5 分鐘內至 LINE 輸入以完成綁定。</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateBindingCode}
                  disabled={bindingLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded"
                >
                  {bindingLoading ? '產生中...' : '產生綁定碼'}
                </button>
                {bindingCode && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">綁定碼：</span>
                    <span className="text-lg font-mono font-semibold tracking-wider">{bindingCode}</span>
                    <span className="text-sm text-gray-500">倒數 {Math.floor(bindingCountdown / 60)}:{String(bindingCountdown % 60).padStart(2, '0')}</span>
                  </div>
                )}
              </div>
              {bindingCode && bindingCountdown === 0 && (
                <div className="mt-2 text-sm text-red-600">綁定碼已過期，請重新產生。</div>
              )}
            </div>
            {/* 通知方式設置（精簡為 LINE 專用） */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">通知方式</h3>
              <p className="text-gray-600 text-sm mb-3">本系統僅透過 LINE 發送警報通知</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <span className="text-gray-800">LINE 通知</span>
              </div>
            </div>

            {/* 系統狀態 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">系統狀態</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connected' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm text-gray-700">
                    {connectionStatus === 'connected' ? '監控系統運行中' : '系統連線異常'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">
                    啟用警報: {alerts.filter(a => a.enabled).length}個
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-700">
                    上次同步: {lastSync.toLocaleTimeString('zh-TW')}
                  </span>
                </div>
              </div>
            </div>

            {/* 保存與測試通知按鈕 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? '保存中...' : '保存設置'}
              </button>
              <button
                onClick={sendTestLineNotify}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                發送 LINE 測試
              </button>
            </div>
          </div>
        </div>

        {/* 保存成功模態框 */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">設置已保存</h3>
                <p className="text-gray-600">警報設置已成功更新</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 新增警報設定模態框 */}
        {showAddAlertModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">新增警報設定</h3>
                <button
                  onClick={() => setShowAddAlertModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    感測器類型
                  </label>
                  <select
                    value={newAlertSensor}
                    onChange={(e) => {
                      setNewAlertSensor(e.target.value);
                      const sensor = availableSensors.find(s => s.value === e.target.value);
                      if (sensor) {
                        // 根據感測器類型設定預設範圍
                        if (sensor.value === 'temperature') {
                          setNewAlertMin(18);
                          setNewAlertMax(25);
                        } else if (sensor.value === 'humidity') {
                          setNewAlertMin(40);
                          setNewAlertMax(60);
                        } else if (sensor.value === 'co2') {
                          setNewAlertMin(0);
                          setNewAlertMax(1000);
                        } else {
                          setNewAlertMin(0);
                          setNewAlertMax(100);
                        }
                      }
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {availableSensors.map(sensor => (
                      <option key={sensor.value} value={sensor.value}>
                        {sensor.label} ({sensor.unit})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最小值 ({availableSensors.find(s => s.value === newAlertSensor)?.unit})
                    </label>
                    <input
                      type="number"
                      value={newAlertMin}
                      onChange={(e) => setNewAlertMin(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大值 ({availableSensors.find(s => s.value === newAlertSensor)?.unit})
                    </label>
                    <input
                      type="number"
                      value={newAlertMax}
                      onChange={(e) => setNewAlertMax(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddAlertModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddAlert}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  新增
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;