import React, { useState, useEffect } from 'react';
import { wsService, getRecentData } from '../services/api';

// 保留數據介面定義
interface LabData {
  co2: number;
  humidity: number;
  pm10: number;
  pm10_average: number;
  pm25: number;
  pm25_average: number;
  temperature: number;
  tvoc: number;
}

// 移除未使用的 Sensor 介面

// 移除未使用的 Laboratory 介面

const Home: React.FC = () => {
  // 彙總所有實驗室感測器的平均值
  const [labData, setLabData] = useState<LabData>({
    co2: 0,
    humidity: 0,
    pm10: 0,
    pm10_average: 0,
    pm25: 0,
    pm25_average: 0,
    temperature: 0,
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

    // 初始數據獲取
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // 獲取最近的數據（使用正確格式的 lab：公司名大寫 + _lab）
        const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
        const companyLab = localStorage.getItem('company_lab') || `${company.toUpperCase()}_lab`;
        const recentData = await getRecentData({
          company_lab: companyLab,
          machine: 'aq',
          number: 1
        });
        
        if (recentData.length > 0) {
          const latestData = recentData[0];
          // 處理轉換後的數據格式（getRecentData 返回的是轉換後的 SensorData）
          // 但也要處理可能包含 values 對象的格式
          const values = (latestData as any).values || latestData;
          
          // 安全地轉換數值，避免 NaN
          const toNumber = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined || value === '') {
              return defaultValue;
            }
            const num = typeof value === 'number' ? value : parseFloat(String(value));
            return isNaN(num) ? defaultValue : num;
          };
          
          setLabData({
            co2: Math.round(toNumber(values.co2, 0)),
            humidity: Math.round(toNumber(values.humidity, 0) * 10) / 10, // 保留一位小數
            pm10: Math.round(toNumber(values.pm10, 0)),
            pm10_average: Math.round(toNumber(values.pm10_average, 0)),
            pm25: Math.round(toNumber(values.pm25, 0)),
            pm25_average: Math.round(toNumber(values.pm25_average, 0)),
            temperature: Math.round(toNumber(values.temperature || values.temperatu, 0) * 10) / 10, // 保留一位小數
            tvoc: Math.round(toNumber(values.tvoc, 0) * 1000) / 1000 // 保留三位小數
          });
          setLastUpdate(new Date());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '獲取初始數據失敗');
        console.error('獲取初始數據失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // 設置 WebSocket 連接
    const setupWebSocket = () => {
      // 獲取公司名稱並生成正確的 lab 格式（公司名大寫 + _lab）
      const company = localStorage.getItem('company') || localStorage.getItem('company_name') || 'NCCU';
      let companyLab = localStorage.getItem('company_lab');
      
      // 確保 lab 格式使用大寫公司名（例如：NCCU_lab，不是 nccu_lab）
      if (!companyLab) {
        companyLab = `${company.toUpperCase()}_lab`;
      } else {
        // 如果 localStorage 中的 company_lab 可能是小寫，確保轉換為大寫格式
        const companyUpper = company.toUpperCase();
        // 移除可能的 _lab 後綴，然後重新組合為大寫格式
        const labNameWithoutSuffix = companyLab.replace(/_lab$/i, '');
        companyLab = `${companyUpper}_lab`;
      }
      
      const sensor = 'aq'; // 感測器名稱
      const currentToken = localStorage.getItem('token') || token;
      
      // 確保使用最新的 token 和正確格式的 lab（大寫公司名 + _lab）
      wsService.connect(currentToken, companyLab, sensor);
      
      wsService.on('connected', () => {
        setWsConnected(true);
        setError(''); // 連接成功時清除錯誤
      });
      
      wsService.on('disconnected', () => {
        setWsConnected(false);
      });
      
      wsService.on('data', (data: any) => {
        // 安全地轉換數值，避免 NaN
        const toNumber = (value: any, defaultValue: number = 0): number => {
          if (value === null || value === undefined || value === '') {
            return defaultValue;
          }
          const num = typeof value === 'number' ? value : parseFloat(String(value));
          return isNaN(num) ? defaultValue : num;
        };

        // 數據可能在 values 對象中（WebSocket 格式），也可能直接在頂層（API 格式）
        const values = data.values || data;
        
        // 更新即時數據，使用安全的數值轉換
        // 將現有數據映射到對應字段
        setLabData({
            co2: Math.round(toNumber(values.co2, 0)),
            humidity: Math.round(toNumber(values.humidity, 0) * 10) / 10, // 保留一位小數
            pm10: Math.round(toNumber(values.pm10, 0)),
            pm10_average: Math.round(toNumber(values.pm10_average, 0)),
            pm25: Math.round(toNumber(values.pm25, 0)),
            pm25_average: Math.round(toNumber(values.pm25_average, 0)),
            temperature: Math.round(toNumber(values.temperature || values.temperatu, 0) * 10) / 10, // 保留一位小數
            tvoc: Math.round(toNumber(values.tvoc, 0) * 1000) / 1000 // 保留三位小數
          });
        setLastUpdate(new Date());
        setError(''); // 接收到數據時清除錯誤
        
        // 調試：記錄接收到的數據（僅在開發模式下）
        if (import.meta.env.DEV) {
        }
      });
      
      wsService.on('error', (error: any) => {
        console.error('WebSocket 錯誤:', error);
        setError('WebSocket 連接錯誤');
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
        
        {/* 圓形數據顯示 */}
        <div className="flex flex-wrap justify-around mb-6">
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-green-500 bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg">
            <div className="text-2xl font-bold text-center">
              CO₂<br />
              {isLoading ? '載入中...' : `${labData.co2} ppm`}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-blue-500 bg-gradient-to-t from-blue-50 to-white m-4 shadow-lg">
            <div className="text-2xl font-bold text-center">
              溫度<br />
              {isLoading ? '載入中...' : `${labData.temperature} °C`}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-cyan-500 bg-gradient-to-t from-cyan-50 to-white m-4 shadow-lg">
            <div className="text-2xl font-bold text-center">
              溼度<br />
              {isLoading ? '載入中...' : `${labData.humidity}%`}
            </div>
          </div>
        </div>
        
        {/* 網格數據顯示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">PM2.5</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.pm25} μg/m³`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">PM2.5 平均值</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.pm25_average} μg/m³`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">PM10</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.pm10} μg/m³`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">PM10 平均值</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.pm10_average} μg/m³`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center md:col-span-2 lg:col-span-4">
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