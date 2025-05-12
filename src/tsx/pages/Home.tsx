import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// 導入圖標 (需要先安裝 react-icons: npm install react-icons)
import { FiHome, FiUser, FiSettings, FiMenu, FiLogOut, FiDatabase, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';

// 數據介面定義
interface LabData {
  co2: number;
  o2: number;
  ch2o: number;
  co: number;
  nh3: number;
  humidity: number;
  o3: number;
}

// 導航項目介面
interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

const Home: React.FC = () => {
  // 側邊欄狀態控制
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // 從 localStorage 獲取之前的狀態 (如果有)
    const saved = localStorage.getItem('sidebarOpen');
    return saved ? JSON.parse(saved) : true;
  });
  
  // 實驗室數據狀態
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
  
  const navigate = useNavigate();

  // 導航項目配置
  const navItems: NavItem[] = [
    { title: '首頁', path: '/dashboard', icon: <FiHome size={20} /> },
    { title: '數據記錄', path: '/data-records', icon: <FiDatabase size={20} /> },
    { title: '警報設置', path: '/alerts', icon: <FiAlertCircle size={20} /> },
    { title: '統計圖表', path: '/statistics', icon: <FiBarChart2 size={20} /> },
    { title: '用戶管理', path: '/users', icon: <FiUser size={20} /> },
    { title: '系統設置', path: '/settings', icon: <FiSettings size={20} /> }
  ];

  // 切換側邊欄狀態
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    // 保存到 localStorage
    localStorage.setItem('sidebarOpen', JSON.stringify(newState));
  };

  // 登出處理
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // 獲取實驗室數據
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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 側邊欄 */}
      <div 
        className={`bg-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* 標題和漢堡按鈕 */}
        <div className="flex items-center justify-between p-6 border-b border-blue-700">
            <button 
            onClick={toggleSidebar}
            className="p-0 rounded-full hover:bg-blue-700 focus:outline-none"
            aria-label="Toggle Sidebar"
          >
                <FiMenu size={20} />
          </button>
          {sidebarOpen ? (
            <h3 className="text-xl font-bold">NCCU Laboratory</h3>
          ) : (
            <h3 className="text-xl font-bold"></h3>
          )}

        </div>
        
        {/* 導航菜單 */}
        <nav className="flex-1 overflow-y-auto pt-4">
          <ul>
            {navItems.map((item, index) => (
              <li key={index}>
                <Link 
                  to={item.path} 
                  className="flex items-center p-4 hover:bg-blue-700 rounded-lg mx-2 mb-1"
                >
                  <span className="inline-flex">{item.icon}</span>
                  {sidebarOpen && <span className="ml-3">{item.title}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* 用戶資訊 */}
        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                className="h-10 w-10 rounded-full bg-blue-300" 
                src="/avatar-placeholder.png" 
                alt="User avatar" 
              />
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <p className="text-base font-medium">張三</p>
                <p className="text-sm text-blue-200">管理員</p>
              </div>
            )}
          </div>
          
          {/* 登出按鈕 */}
          <button 
            onClick={handleLogout}
            className={`mt-3 flex items-center p-2 rounded-lg hover:bg-blue-700 w-full ${
              sidebarOpen ? 'justify-start' : 'justify-center'
            }`}
          >
            <FiLogOut size={20} />
            {sidebarOpen && <span className="ml-3">登出</span>}
          </button>
        </div>
      </div>
      
      {/* 主內容區域 */}
      <div className="flex-1 overflow-auto">
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
              <h3 className="text-2xl font-medium mb-2">CO</h3>
              <p className="text-3xl font-bold">
                {isLoading ? '載入中...' : `${labData.co}%`}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
              <h3 className="text-2xl font-medium mb-2">NH₃</h3>
              <p className="text-3xl font-bold">
                {isLoading ? '載入中...' : `${labData.nh3} ppm`}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
              <h3 className="text-2xl font-medium mb-2">溼度</h3>
              <p className="text-3xl font-bold">
                {isLoading ? '載入中...' : `${labData.humidity} ppm`}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
              <h3 className="text-2xl font-medium mb-2">O₃</h3>
              <p className="text-3xl font-bold">
                {isLoading ? '載入中...' : `${labData.o3} ppm`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;