import { useState, useEffect } from 'react';
import { Bell, Settings, Save, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { generateBindingCode, getThresholdBySensor, setThresholds, deleteThresholds } from '../services/api';
import { getUserAllowNotify } from '../utils/accessControl';
import botQR from '../../assets/bot QR.png';

// 警報介面定義
interface AlertItem {
  id: number;
  name: string;
  parameter: string;
  unit: string;
  minValue: number;
  maxValue: number;
  enabled: boolean;
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
  const allowNotify = getUserAllowNotify();
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
  // LINE 官方帳號連結（可由 .env 設定 VITE_LINE_ACCOUNT_URL）
  const lineAccountUrl =
    (import.meta as any).env?.VITE_LINE_ACCOUNT_URL ||
    'https://line.me/R/ti/p/@933ncchb';
  // 綁定狀態（若已綁定，顯示「已綁定完成」）
  const [isBound, setIsBound] = useState<boolean>(() => {
    try {
      return localStorage.getItem('line_bound') === 'true';
    } catch {
      return false;
    }
  });
  
  // 新增警報設定相關狀態
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [newAlertSensor, setNewAlertSensor] = useState<string>('temperature');
  const [newAlertMin, setNewAlertMin] = useState<number>(0);
  const [newAlertMax, setNewAlertMax] = useState<number>(100);
  
  // 可用的檢測項目列表（感測器類型，不是檢測器機器類型）
  // 這些是具體的檢測項目，如溫度、濕度、CO2 等，而不是檢測器機器（如 "aq"）
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

  // 簡化：直接從 localStorage 獲取 lab 和 sensor 信息（登入時已保存）
  // 獲取用戶的 lab 信息（優先級：user_lab > company_lab > 從 company 推導）
  const getUserLab = (): string => {
    // 優先使用 user_lab（登入時後端返回）
    try {
      const userLabStr = localStorage.getItem('user_lab');
      if (userLabStr) {
        const parsed = JSON.parse(userLabStr);
        const labValue = Array.isArray(parsed) ? parsed[0] : parsed;
        if (labValue && typeof labValue === 'string') {
          return labValue;
        }
      }
    } catch (e) {
      // 忽略解析錯誤
    }
    
    // 後備：使用 lab（移除 _lab 後綴）
    const storedLab = localStorage.getItem('lab');
    if (storedLab) {
      return storedLab.replace(/_lab$/i, '');
    }
    
    // 最後後備：從 company 推導
    const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
    return company.trim().replace(/\s+/g, '_');
  };
  
  // 獲取機器類型（sensor），用於後端 API 的 sensor 參數
  const getUserSensor = (): string => {
    // 可以從 localStorage 獲取，或使用默認值
    return localStorage.getItem('machine') || 'aq';
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
      
      // 獲取檢測器機器類型（從 API 獲取，如 "aq"）
      const machineType = getUserSensor();
      
      // 調試：檢查發送的參數
      console.log('📤 loadAlerts: 發送 getThresholdBySensor 請求:', {
        company,
        lab,
        sensor: machineType // sensor 是機器類型，如 "aq"
      });
      
      // 調用一次 API 獲取所有檢測項目的閾值
      // 後端的 sensor 參數應該是檢測器機器類型（如 "aq"），而不是具體的檢測項目類型（如 "temperature"）
      // 注意：lab 名稱應該使用從 API 獲取的原始格式（小寫），而不是從 localStorage 推導的大寫格式
      const result = await getThresholdBySensor({ company, lab, sensor: machineType });
      
      // 調試：檢查返回的數據結構
      if (result && result.threshold) {
        console.log('✅ getThresholdBySensor 返回的數據:', {
          company: result.company,
          lab: result.lab,
          sensor: result.sensor,
          threshold: result.threshold
        });
      }
      
      if (!result || !result.threshold) {
        // 沒有數據，顯示空狀態
        setAlerts([]);
        setLastSync(new Date());
        return;
      }
      
      // 後端返回的 threshold 對象包含所有感測器的閾值
      // 例如：{"temperature": {"min": 20, "max": 30, "enabled": true}, "humidity": {...}}
      const thresholdData = result.threshold;
      
      // 定義所有可能的感測器類型
      const allSensorTypes = ['temperature', 'humidity', 'co2', 'pm25', 'pm10', 'pm25_average', 'pm10_average', 'tvoc'];
      
      const unitOf = (sensorType: string): string => {
        switch (sensorType) {
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

      // 從 threshold 對象中提取所有感測器的閾值
      const mapped: AlertItem[] = [];
      allSensorTypes.forEach((sensorType, idx) => {
        // 檢查 threshold 對象中是否有該感測器的數據
        if (thresholdData && typeof thresholdData === 'object' && sensorType in thresholdData) {
          const sensorThreshold = (thresholdData as any)[sensorType];
          if (sensorThreshold && typeof sensorThreshold === 'object') {
            mapped.push({
              id: idx + 1,
              name: `${sensorType} 監控`,
              parameter: sensorType,
              unit: unitOf(sensorType),
              minValue: typeof sensorThreshold.min === 'number' ? sensorThreshold.min : 0,
              maxValue: typeof sensorThreshold.max === 'number' ? sensorThreshold.max : 0,
              enabled: typeof sensorThreshold.enabled === 'boolean' ? sensorThreshold.enabled : true,
            });
          }
        }
      });
      
      if (mapped.length === 0) {
        // 沒有任何設定，顯示空狀態
        setAlerts([]);
        setLastSync(new Date());
        return;
      }

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
    }
  };

  // 組件載入時執行
  useEffect(() => {
    if (!allowNotify) {
      setLoading(false);
      setAlerts([]);
      setNotifications({
        email: false,
        sms: false,
        sound: false,
        push: false
      });
      return;
    }
    loadAlerts();
    loadNotifications();
  }, [allowNotify]);

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
      const machineType = getUserSensor(); // 從 API 獲取檢測器機器類型（如 "aq"）
      
      // 調試：檢查發送的參數
      console.log('📤 setThresholds 發送的參數:', {
        company,
        lab,
        machineType, // 檢測器機器類型（如 "aq"）
        sensorType: updated.parameter, // 檢測項目類型（如 "temperature", "co2"）
        min: updated.minValue,
        max: updated.maxValue,
        enabled: updated.enabled
      });
      
      // 先獲取當前的所有閾值，確保不會覆蓋其他感測器的設置
      let currentThresholds: any = null;
      try {
        const currentResult = await getThresholdBySensor({ company, lab, sensor: machineType });
        if (currentResult && currentResult.threshold) {
          currentThresholds = currentResult.threshold;
          console.log('📥 獲取當前閾值:', currentThresholds);
        }
      } catch (e) {
        console.warn('⚠️ 獲取當前閾值失敗，將只更新目標感測器:', e);
      }
      
      // machineType 是檢測器機器類型（從 API 獲取，如 "aq"）
      // updated.parameter 是檢測項目類型（如 "temperature", "co2", "pm25" 等）
      // 傳入 currentThresholds 以保留其他感測器的設置
      await setThresholds({ 
        company, 
        lab, 
        sensor: machineType, 
        sensorType: updated.parameter, 
        min: updated.minValue, 
        max: updated.maxValue, 
        enabled: updated.enabled 
      }, currentThresholds);
      
      // 等待一小段時間，確保後端數據已更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 成功後重新載入警報設定以確保數據同步
      await loadAlerts();
    } catch (error: any) {
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
      
      const machineType = getUserSensor(); // 從 API 獲取檢測器機器類型（如 "aq"）
      
      // 先獲取當前的所有閾值，確保不會覆蓋其他感測器的設置
      let currentThresholds: any = null;
      try {
        const currentResult = await getThresholdBySensor({ company, lab, sensor: machineType });
        if (currentResult && currentResult.threshold) {
          currentThresholds = currentResult.threshold;
        }
      } catch (e) {
        // 獲取當前閾值失敗，將只新增目標感測器
      }
      
      // machineType 是檢測器機器類型（從 API 獲取，如 "aq"）
      // newAlertSensor 是檢測項目類型（從 availableSensors 選擇，如 "temperature", "co2" 等）
      // 傳入 currentThresholds 以保留其他感測器的設置
      await setThresholds({
        company,
        lab,
        sensor: machineType,
        sensorType: newAlertSensor,
        min: newAlertMin,
        max: newAlertMax,
        enabled: true
      }, currentThresholds);
      
      // 關閉模態框並重置表單
      setShowAddAlertModal(false);
      setNewAlertSensor('temperature');
      setNewAlertMin(0);
      setNewAlertMax(100);
      
      // 重新載入警報列表
      await loadAlerts();
    } catch (error: any) {
      setError(error?.message || '新增警報設定失敗');
    }
  };
  
  // 刪除警報設定（將特定感測器的閾值設為 null，實現刪除效果）
  const handleDeleteAlert = async (sensorType: string) => {
    try {
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      const lab = getUserLab();
      const machineType = getUserSensor(); // 機器類型，如 "aq"
      
      if (!lab) {
        setError('無法獲取 lab 信息，無法刪除警報設定');
        return;
      }
      
      // 取得現有閾值，以便刪除指定感測器並保留其他設定
      let currentThresholds: Record<string, any> | null = null;
      try {
        const currentResult = await getThresholdBySensor({ company, lab, sensor: machineType });
        if (currentResult && currentResult.threshold) {
          currentThresholds = currentResult.threshold as Record<string, any>;
        }
      } catch (thresholdError) {
        console.warn('取得閾值資料失敗，仍嘗試刪除指定項目', thresholdError);
      }

      if (!currentThresholds || !(sensorType in currentThresholds)) {
        await loadAlerts();
        return;
      }

      const remainingThresholds = Object.fromEntries(
        Object.entries(currentThresholds).filter(([key]) => key !== sensorType)
      );

      // 刪除整份閾值文件
      await deleteThresholds({ company, lab, sensor: machineType });

      // 若還有其他感測器設定，需要重新寫回資料庫，避免全數遺失
      const remainingEntries = Object.entries(remainingThresholds).filter(
        ([, value]) => !!value && typeof value === 'object'
      );

      if (remainingEntries.length > 0) {
        const [nextSensorKey, nextConfig] = remainingEntries[0];
      await setThresholds({
        company,
        lab,
          sensor: machineType,
          sensorType: nextSensorKey,
          min: typeof nextConfig?.min === 'number' ? nextConfig.min : null,
          max: typeof nextConfig?.max === 'number' ? nextConfig.max : null,
          enabled: typeof nextConfig?.enabled === 'boolean' ? nextConfig.enabled : true
        }, remainingThresholds);
      }
      
      // 重新載入警報列表
      await loadAlerts();
    } catch (error: any) {
      setError(error?.message || '刪除警報設定失敗');
    }
  };

  // 通知設定已簡化為 LINE 專用，此函數保留以相容既有結構

  // 保存設置（所有設置已經通過 updateAlert 實時保存，這裡只顯示提示）
  const saveSettings = async () => {
    // 所有警報設置已經通過 updateAlert 函數實時保存到後端
    // 這裡只需要顯示成功提示
    setShowSaveModal(true);
    setLastSync(new Date());
    setTimeout(() => setShowSaveModal(false), 2000);
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
      // 若後端回傳已綁定完成，直接標記狀態
      if (res?.message && res.message.includes('已綁定完成')) {
        setIsBound(true);
        try {
          localStorage.setItem('line_bound', 'true');
        } catch {}
      }
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
        localStorage.getItem('lab') ||
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
      setError('發送測試通知失敗');
    } finally {
      setSaving(false);
    }
  };

  // 已移除優先級功能

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

  if (!allowNotify) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center border border-red-200">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">權限不足</h2>
          <p className="text-gray-600 mb-4">此帳號尚未啟用通知功能，無法進入警報設置。</p>
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
                          {!alert.enabled && (
                            <span className="inline-block px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                              已停用
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">LINE 綁定</h3>
                {isBound && (
                  <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    ✅ 已綁定完成
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {isBound ? '此帳號已完成 LINE 綁定，可接收通知。' : '點擊產生綁定碼，5 分鐘內至 LINE 輸入以完成綁定。'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateBindingCode}
                  disabled={bindingLoading || isBound}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded"
                >
                  {bindingLoading ? '產生中...' : '產生綁定碼'}
                </button>
                {!isBound && bindingCode && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">綁定碼：</span>
                    <span className="text-lg font-mono font-semibold tracking-wider">{bindingCode}</span>
                    <span className="text-sm text-gray-500">倒數 {Math.floor(bindingCountdown / 60)}:{String(bindingCountdown % 60).padStart(2, '0')}</span>
                  </div>
                )}
              </div>
              {!isBound && bindingCode && bindingCountdown === 0 && (
                <div className="mt-2 text-sm text-red-600">綁定碼已過期，請重新產生。</div>
              )}
              {/* 官方 LINE 帳號連結與 QRCode */}
              <div className="mt-6 border-t pt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-2">官方 LINE 帳號</h4>
                <p className="text-gray-600 text-sm mb-4">
                  掃描 QR Code 或點擊下方按鈕加入官方 LINE。
                </p>
                <div className="flex items-center gap-6 flex-wrap">
                  <img
                    src={botQR}
                    alt="LINE 官方帳號 QR Code"
                    className="w-40 h-40 border rounded"
                  />
                  <a
                    href={lineAccountUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                  >
                    前往加入 LINE
                  </a>
                </div>
              </div>
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