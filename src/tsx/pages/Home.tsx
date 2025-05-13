import React, { useState, useEffect } from 'react';

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

const Home: React.FC = () => {
  // 只保留實驗室數據相關的狀態
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
  
  // 獲取實驗室數據 (保持不變)
  useEffect(() => {
    const fetchLabData = async () => {
      try {
        setIsLoading(true);
        // 需要替換成實際的API地址
        const response = await fetch('http://your-server-address:port/api/lab-data', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('無法獲取實驗室數據');
        }
        
        // 檢查內容類型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('伺服器返回的不是JSON格式');
        }
        
        // 檢查回應是否為空
        const text = await response.text();
        if (!text) {
          throw new Error('伺服器返回空回應');
        }
        
        // 安全地解析JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('JSON解析錯誤:', parseError, '原始文本:', text);
          throw new Error('無法解析JSON回應');
        }
        
        // 設置數據
        setLabData({
          co2: data.co2 ?? 0,
          o2: data.o2 ?? 0,
          ch2o: data.ch2o ?? 0,
          co: data.co ?? 0,
          nh3: data.nh3 ?? 0,
          humidity: data.humidity ?? 0,
          o3: data.o3 ?? 0
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '獲取數據失敗');
        console.error('獲取數據失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabData();
    
    // 設置定時器每分鐘更新一次數據
    const intervalId = setInterval(fetchLabData, 60000);
    
    // 清除effect
    return () => clearInterval(intervalId);
  }, []);

  // 返回主內容
  return (
    <>
      {/* 頂部標題欄 */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-medium">實驗室監測儀表板</h1>
        <div className="flex items-center">
          {/* 可以在這裡添加其他頂部工具欄項目，如通知圖標等 */}
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