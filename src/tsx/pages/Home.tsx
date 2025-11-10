import { useState, useEffect } from 'react';
import { wsService, getRecentData, SensorData } from '../services/api';

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到認證令牌');
      setIsLoading(false);
      return;
    }

    // 獲取公司實驗室信息（從 localStorage）
    const getCompanyLab = (): string => {
      // 優先使用 company_lab
      const companyLab = localStorage.getItem('company_lab');
      if (companyLab) {
        return companyLab;
      }
      
      // 後備：從 company 推導
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      return `${company.replace(/\s+/g, '_')}_lab`;
    };

    const companyLab = getCompanyLab();
    const machine = 'aq'; // 機器類型

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

    // 設置 WebSocket 連接
    const setupWebSocket = () => {
      wsService.connect(token, companyLab, machine);
      
      wsService.on('connected', () => {
        setWsConnected(true);
        setError(''); // 連接成功時清除錯誤
        console.log('WebSocket 已連接');
      });
      
      wsService.on('disconnected', () => {
        setWsConnected(false);
        console.log('WebSocket 已斷開');
      });
      
      wsService.on('data', (data: any) => {
        try {
          // WebSocket 數據可能在 values 對象中，也可能直接在頂層
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

          // 更新即時數據
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
      });
      
      wsService.on('error', (error: any) => {
        console.error('WebSocket 錯誤:', error);
        setError('WebSocket 連接錯誤');
        setWsConnected(false);
      });
    };

    fetchInitialData();
    setupWebSocket();

    // 清理函數
    return () => {
      wsService.disconnect();
    };
  }, []);

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
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-green-500 bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg">
            <div className="text-2xl font-bold text-center">
              CO₂<br />
              {isLoading ? '載入中...' : `${labData.co2} ppm`}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-blue-400 bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg">
            <div className="text-2xl font-bold text-center">
              溫度<br />
              {isLoading ? '載入中...' : `${labData.temperature} °C`}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-purple-400 bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg">
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