import React, { useState, useEffect } from 'react';
import { wsService, getRecentData, SensorData } from '../services/api';

// 保留數據介面定義
interface LabData {
  co2: number;
  o2: number;
  ch2o: number;
  co: number;
  nh3: number;
  humidity: number;
  o3: number;
}

// 移除未使用的 Sensor 介面

// 移除未使用的 Laboratory 介面

const Home: React.FC = () => {
  // 彙總所有實驗室感測器的平均值
  const [labData, setLabData] = useState<LabData>({
    co2: 0,
    o2: 0,
    ch2o: 0,
    co: 0,
    nh3: 0,
    humidity: 0,
    o3: 0
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
        
        // 獲取最近的數據
        const recentData = await getRecentData({
          company_lab: localStorage.getItem('company_lab') || 'nccu_lab',
          machine: 'aq',
          number: 1
        });
        
        if (recentData.length > 0) {
          const latestData = recentData[0];
          setLabData({
            co2: Math.round(latestData.co2),
            o2: Math.round(latestData.o2 * 100) / 100,
            ch2o: Math.round(latestData.ch2o * 100) / 100,
            co: Math.round(latestData.co * 1000) / 1000,
            nh3: Math.round(latestData.nh3 * 100) / 100,
            humidity: Math.round(latestData.humidity),
            o3: Math.round(latestData.o3 * 100) / 100
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
      wsService.connect(token, 'nccu_lab');
      
      wsService.on('connected', () => {
        setWsConnected(true);
        console.log('WebSocket 已連接');
      });
      
      wsService.on('disconnected', () => {
        setWsConnected(false);
        console.log('WebSocket 已斷開');
      });
      
      wsService.on('data', (data: SensorData) => {
        // 更新即時數據
        setLabData({
          co2: Math.round(data.co2),
          o2: Math.round(data.o2 * 100) / 100,
          ch2o: Math.round(data.ch2o * 100) / 100,
          co: Math.round(data.co * 1000) / 1000,
          nh3: Math.round(data.nh3 * 100) / 100,
          humidity: Math.round(data.humidity),
          o3: Math.round(data.o3 * 100) / 100
        });
        setLastUpdate(new Date());
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
          
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-yellow-400 bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg">
            <div className="text-2xl font-bold text-center">
              O₂<br />
              {isLoading ? '載入中...' : `${labData.o2}%`}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center w-64 h-64 rounded-full border-[15px] border-orange-400 bg-gradient-to-t from-yellow-50 to-white m-4 shadow-lg">
            <div className="text-2xl font-bold text-center">
              CH₂O<br />
              {isLoading ? '載入中...' : `${labData.ch2o} ppm`}
            </div>
          </div>
        </div>
        
        {/* 網格數據顯示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">CO</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.co}%`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">NH₃</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.nh3} ppm`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">溼度</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.humidity} ppm`}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-medium mb-2">O₃</h3>
            <p className="text-3xl font-bold">
              {isLoading ? '載入中...' : `${labData.o3} ppm`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;