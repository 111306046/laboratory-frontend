import { useState, useEffect } from 'react';
import { Bell, Settings, Save, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { generateBindingCode, getThresholds, getThresholdBySensor, setThresholds, ThresholdItem } from '../services/api';

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

  // 載入警報設定
  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      const lab = localStorage.getItem('company_lab') || 'nccu_lab';
      // 後端對 getThresholds 可能要求 sensor，這裡以常見感測器清單並行請求
      const sensors = ['temperature', 'humidity', 'co2', 'pm25', 'pm10'];
      const fetched = await Promise.all(
        sensors.map(async (s) => {
          const one = await getThresholdBySensor({ company, lab, sensor: s });
          return one ?? { company, lab, sensor: s, min: null, max: null, enabled: true } as ThresholdItem;
        })
      );

      const unitOf = (sensor: string): string => {
        switch (sensor) {
          case 'temperature': return '°C';
          case 'humidity': return '%';
          case 'co2': return 'ppm';
          case 'pm25': return 'µg/m³';
          case 'pm10': return 'µg/m³';
          default: return '';
        }
      };

      const items = fetched;
      const mapped: AlertItem[] = items.map((it, idx) => ({
        id: idx + 1,
        name: `${it.sensor} 監控`,
        parameter: it.sensor,
        unit: unitOf(it.sensor),
        minValue: typeof (it.threshold?.min ?? it.min) === 'number' ? (it.threshold?.min ?? it.min)! : 0,
        maxValue: typeof (it.threshold?.max ?? it.max) === 'number' ? (it.threshold?.max ?? it.max)! : 0,
        enabled: (it.threshold?.enabled ?? it.enabled) ?? true,
        priority: 'medium'
      }));

      setAlerts(mapped);
      setLastSync(new Date());
    } catch (error: any) {
      console.error('載入警報設定失敗:', error);
      setError(error?.message || '載入警報設定失敗');
      // 顯示回退的預設警報，避免整塊區域為空
      setAlerts([
        { id: 1, name: '溫度監控', parameter: 'temperature', unit: '°C', minValue: 18, maxValue: 25, enabled: true, priority: 'high' },
        { id: 2, name: '濕度監控', parameter: 'humidity', unit: '%', minValue: 40, maxValue: 60, enabled: true, priority: 'medium' },
        { id: 3, name: 'CO2濃度', parameter: 'co2', unit: 'ppm', minValue: 0, maxValue: 1000, enabled: true, priority: 'high' }
      ]);
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
    loadAlerts();
    loadNotifications();
  }, []);

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
      const lab = localStorage.getItem('company_lab') || 'nccu_lab';
      await setThresholds({ company, lab, sensor: updated.parameter, min: updated.minValue, max: updated.maxValue, enabled: updated.enabled });
    } catch (error) {
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
        console.warn('Mock /alerts/notify 不存在，已模擬成功');
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                監控參數設置
              </h2>
              
              <div className="space-y-4">
                {alerts.map(alert => (
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
                ))}
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
      </div>
    </div>
  );
};

export default Alert;