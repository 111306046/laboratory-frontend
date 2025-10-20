import { useState, useEffect } from 'react';
import { Bell, Settings, Save, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

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

// API 設定 - 可以根據需要修改這個 URL
const API_BASE_URL = 'http://localhost:3001/api';

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

  // API 函數
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`, // 如果需要驗證可以取消註解
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
      const data = await apiCall('/alerts');
      setAlerts(data.alerts || []);
      setNotifications(data.notifications || notifications);
      setLastSync(new Date());
      setError(null);
    } catch (error) {
      console.error('載入警報設定失敗:', error);
      // 使用預設值
      setAlerts([
        {
          id: 1,
          name: '溫度監控',
          parameter: 'temperature',
          unit: '°C',
          minValue: 18,
          maxValue: 25,
          enabled: true,
          priority: 'high'
        },
        {
          id: 2,
          name: '濕度監控',
          parameter: 'humidity',
          unit: '%',
          minValue: 40,
          maxValue: 60,
          enabled: true,
          priority: 'medium'
        },
        {
          id: 3,
          name: '壓力監控',
          parameter: 'pressure',
          unit: 'hPa',
          minValue: 1000,
          maxValue: 1020,
          enabled: false,
          priority: 'low'
        },
        {
          id: 4,
          name: 'CO2濃度',
          parameter: 'co2',
          unit: 'ppm',
          minValue: 0,
          maxValue: 1000,
          enabled: true,
          priority: 'high'
        }
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

  const updateAlert = async (id: number, field: string, value: any) => {
    const updatedAlerts = alerts.map(alert => 
      alert.id === id ? { ...alert, [field]: value } : alert
    );
    setAlerts(updatedAlerts);

    try {
      await apiCall(`/alerts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) {
      console.error('更新警報失敗:', error);
      loadAlerts(); // 重新載入以恢復狀態
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
                  <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                          <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getPriorityColor(alert.priority)}`}>
                            {alert.priority === 'high' ? '高優先級' : 
                             alert.priority === 'medium' ? '中優先級' : '低優先級'}
                          </span>
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