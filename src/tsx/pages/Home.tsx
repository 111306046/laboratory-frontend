import React, { useState } from 'react';

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
  // 直接使用假資料
  const [labData] = useState<LabData>({
    co2: 400,
    o2: 21,
    ch2o: 0.01,
    co: 0.1,
    nh3: 0.05,
    humidity: 60,
    o3: 0.02
  });
  const [isLoading] = useState<boolean>(false);
  const [error] = useState<string>('');

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