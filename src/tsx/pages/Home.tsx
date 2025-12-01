import { useState, useEffect } from 'react';
import { wsService, getRecentData, SensorData, machineOn, machineOff } from '../services/api';
import { isSuperUserAccount } from '../utils/accessControl';

const MACHINE_TYPE = 'aq';

const formatLabName = (value: string): string => {
  if (!value) return 'NCCU_lab';
  const trimmed = value.trim().replace(/\s+/g, '_');
  if (!trimmed) return 'NCCU_lab';
  if (trimmed.toLowerCase().endsWith('_lab')) {
    const base = trimmed.slice(0, -4).replace(/[_-]+$/g, '');
    return `${base || trimmed.slice(0, -4)}_lab`;
  }
  return `${trimmed.replace(/[_-]+$/g, '') || trimmed}_lab`;
};

const resolveCompanyName = (): string => {
  if (typeof window === 'undefined') return 'NCCU';
  return localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
};

const resolveCompanyLab = (): string => {
  if (typeof window === 'undefined') return 'NCCU_lab';
  const storedLab = localStorage.getItem('lab');
  if (storedLab) return storedLab;
  return formatLabName(resolveCompanyName());
};

// 實驗室數據介面 - 使用實際的 SensorData 欄位
interface LabData {
  temperature: number;  // 溫度
  humidity: number;     // 濕度
  pm25: number;         // PM2.5
  pm10: number;         // PM10
  pm25_ave: number;     // PM2.5 平均值
  pm10_ave: number;     // PM10 平均值
  co2: number;          // 二氧化碳
  tvoc: number;         // 總揮發性有機化合物
}

const Home: React.FC = () => {
  // 實驗室感測器數據
  const [labData, setLabData] = useState<LabData>({
    temperature: 0,
    humidity: 0,
    pm25: 0,
    pm10: 0,
    pm25_ave: 0,
    pm10_ave: 0,
    co2: 0,
    tvoc: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [hasMachineControl, setHasMachineControl] = useState(false);
  const [machineControlLoading, setMachineControlLoading] = useState<'on' | 'off' | null>(null);
  const [machineControlMessage, setMachineControlMessage] = useState<string | null>(null);
  const [machineControlError, setMachineControlError] = useState<string | null>(null);

  // 顏色判斷：紅=偏離正常，橘=接近邊界，綠=正常
  const getStatusBorder = (value: number, min: number, max: number, nearMargin: number) => {
    if (Number.isNaN(value)) return 'border-gray-300';
    if (value < min || value > max) return 'border-red-500';
    if (value <= min + nearMargin || value >= max - nearMargin) return 'border-orange-400';
    return 'border-green-500';
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedPermissions = localStorage.getItem('user_permissions');
      const permissions = storedPermissions ? JSON.parse(storedPermissions) : [];
      const account = localStorage.getItem('user_account');
      const hasPermission = Array.isArray(permissions) && permissions.includes('control_machine');
      setHasMachineControl(hasPermission || isSuperUserAccount(account));
    } catch (error) {
      console.warn('解析使用者權限失敗:', error);
      setHasMachineControl(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到認證令牌');
      setIsLoading(false);
      return;
    }

    const companyLab = resolveCompanyLab();
    const machine = MACHINE_TYPE; // 機器類型

    // 初始數據獲取
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // 獲取最近的數據
        const recentData = await getRecentData({
          company_lab: companyLab,
          machine: machine,
          number: 1
        });
        
        if (recentData.length > 0) {
          const latestData = recentData[0];
          setLabData({
            temperature: Math.round(latestData.temperatu * 10) / 10,
            humidity: Math.round(latestData.humidity * 10) / 10,
            pm25: Math.round(latestData.pm25 * 10) / 10,
            pm10: Math.round(latestData.pm10 * 10) / 10,
            pm25_ave: Math.round(latestData.pm25_ave * 10) / 10,
            pm10_ave: Math.round(latestData.pm10_ave * 10) / 10,
            co2: Math.round(latestData.co2),
            tvoc: Math.round(latestData.tvoc * 1000) / 1000
          });
          setLastUpdate(new Date());
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '獲取初始數據失敗';
        setError(errorMessage);
        console.error('獲取初始數據失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
    
    const handleConnected = () => {
      setWsConnected(true);
      setError('');
    };

    const handleDisconnected = () => {
      setWsConnected(false);
    };

    const handleWsError = (error: any) => {
      console.error('WebSocket 錯誤:', error);
      setError('WebSocket 連接錯誤');
      setWsConnected(false);
    };

    const handleWsData = (data: any) => {
      try {
        const sensorData: SensorData = data.values ? {
          timestamp: data.timestamp || new Date().toISOString(),
          machine: data.machine || machine,
          temperatu: data.values.temperature ?? data.values.temperatu ?? data.temperatu ?? 0,
          humidity: data.values.humidity ?? data.humidity ?? 0,
          pm25: data.values.pm25 ?? data.pm25 ?? 0,
          pm10: data.values.pm10 ?? data.pm10 ?? 0,
          pm25_ave: data.values.pm25_average ?? data.values.pm25_ave ?? data.pm25_ave ?? 0,
          pm10_ave: data.values.pm10_average ?? data.values.pm10_ave ?? data.pm10_ave ?? 0,
          co2: data.values.co2 ?? data.co2 ?? 0,
          tvoc: data.values.tvoc ?? data.tvoc ?? 0
        } : {
          timestamp: data.timestamp || new Date().toISOString(),
          machine: data.machine || machine,
          temperatu: data.temperatu ?? data.temperature ?? 0,
          humidity: data.humidity ?? 0,
          pm25: data.pm25 ?? 0,
          pm10: data.pm10 ?? 0,
          pm25_ave: data.pm25_ave ?? data.pm25_average ?? 0,
          pm10_ave: data.pm10_ave ?? data.pm10_average ?? 0,
          co2: data.co2 ?? 0,
          tvoc: data.tvoc ?? 0
        };

        setLabData({
          temperature: Math.round(sensorData.temperatu * 10) / 10,
          humidity: Math.round(sensorData.humidity * 10) / 10,
          pm25: Math.round(sensorData.pm25 * 10) / 10,
          pm10: Math.round(sensorData.pm10 * 10) / 10,
          pm25_ave: Math.round(sensorData.pm25_ave * 10) / 10,
          pm10_ave: Math.round(sensorData.pm10_ave * 10) / 10,
          co2: Math.round(sensorData.co2),
          tvoc: Math.round(sensorData.tvoc * 1000) / 1000
        });
        setLastUpdate(new Date());
      } catch (err) {
        console.error('處理 WebSocket 數據失敗:', err);
      }
    };

    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);
    wsService.on('data', handleWsData);
    wsService.on('error', handleWsError);
    wsService.connect(token, companyLab, machine);

    if (wsService.isConnected) {
      handleConnected();
    }

    // 清理函數
    return () => {
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.off('data', handleWsData);
      wsService.off('error', handleWsError);
      wsService.disconnect();
    };
  }, []);

  const handleMachineControl = async (action: 'on' | 'off') => {
    const company = resolveCompanyName();
    if (!company) {
      setMachineControlError('無法取得公司資訊，請重新登入後再試。');
      return;
    }
    setMachineControlLoading(action);
    setMachineControlError(null);
    setMachineControlMessage(null);
    try {
      const payload = { company, machine: MACHINE_TYPE };
      const response = action === 'on' ? await machineOn(payload) : await machineOff(payload);
      const defaultMsg = action === 'on' ? '機台已啟動' : '機台已關閉';
      const message = typeof response?.message === 'string' ? response.message : defaultMsg;
      setMachineControlMessage(message);
    } catch (err: any) {
      setMachineControlError(err?.message || '操作失敗，請稍後再試');
    } finally {
      setMachineControlLoading(null);
    }
  };

  // 返回主內容
  return (
    <>
      {/* 頂部標題欄 */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-medium">實驗室監測儀表板</h1>
        <div className="flex items-center space-x-4">
          {/* WebSocket 連接狀態 */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {wsConnected ? '即時連接' : '連接中斷'}
            </span>
          </div>
          {/* 最後更新時間 */}
          <div className="text-sm text-gray-500">
            最後更新: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {hasMachineControl && (
        <div className="bg-white shadow-sm p-4 mt-6 rounded-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">遠端機台控制</h2>
              <p className="text-sm text-gray-600">擁有 control_machine 權限的使用者可以直接操作機台電源</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleMachineControl('on')}
                disabled={machineControlLoading !== null}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded transition-colors"
              >
                {machineControlLoading === 'on' ? '啟動中...' : '啟動機台'}
              </button>
              <button
                onClick={() => handleMachineControl('off')}
                disabled={machineControlLoading !== null}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded transition-colors"
              >
                {machineControlLoading === 'off' ? '關閉中...' : '關閉機台'}
              </button>
            </div>
          </div>
          {machineControlMessage && (
            <div className="mt-3 text-sm text-emerald-600">{machineControlMessage}</div>
          )}
          {machineControlError && (
            <div className="mt-3 text-sm text-red-600">{machineControlError}</div>
          )}
        </div>
      )}
      
      {/* 內容區域 */}
      <div className="p-6">
        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* 主要數據顯示 - 圓形卡片 */}
        <div className="flex flex-wrap justify-around mb-6">
          {/* CO2：正常 0~1000，靠近邊界 ±100 */}
          <div className={`flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] ${getStatusBorder(labData.co2, 0, 1000, 100)} bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg`}>
            <div className="text-2xl font-bold text-center">
              CO₂<br />
              {isLoading ? '載入中...' : `${labData.co2} ppm`}
            </div>
          </div>
          
          {/* 溫度：正常 18~25°C，靠近邊界 ±1°C */}
          <div className={`flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] ${getStatusBorder(labData.temperature, 18, 25, 1)} bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg`}>
            <div className="text-2xl font-bold text-center">
              溫度<br />
              {isLoading ? '載入中...' : `${labData.temperature} °C`}
            </div>
          </div>
          
          {/* 濕度：正常 40~60%，靠近邊界 ±5% */}
          <div className={`flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] ${getStatusBorder(labData.humidity, 40, 60, 5)} bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg`}>
            <div className="text-2xl font-bold text-center">
              濕度<br />
              {isLoading ? '載入中...' : `${labData.humidity} %`}
            </div>
          </div>
        </div>
        
        {/* 詳細數據顯示 - 網格卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">PM2.5</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.pm25} μg/m³`}
            </p>
            {!isLoading && labData.pm25_ave > 0 && (
              <p className="text-sm text-gray-500 mt-1">平均: {labData.pm25_ave} μg/m³</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">PM10</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.pm10} μg/m³`}
            </p>
            {!isLoading && labData.pm10_ave > 0 && (
              <p className="text-sm text-gray-500 mt-1">平均: {labData.pm10_ave} μg/m³</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">TVOC</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.tvoc} ppm`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;