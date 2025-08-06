import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { BarChart3, RefreshCw, Calendar, Download, Wifi, WifiOff, CheckCircle, XCircle, AlertTriangle, TrendingUp, Activity, Thermometer } from 'lucide-react';

// 統計數據介面
interface StatisticsData {
  hourlyData: Array<{
    time: string;
    co2: number;
    o2: number;
    humidity: number;
    temperature: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  dailyTrends: Array<{
    date: string;
    avgCO2: number;
    maxCO2: number;
    minCO2: number;
    avgHumidity: number;
  }>;
  parameterRanges: Array<{
    parameter: string;
    normal: number;
    warning: number;
    critical: number;
  }>;
}

const StaticChart: React.FC = () => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24h');
  const [selectedParameter, setSelectedParameter] = useState<string>('co2');

  // 載入統計數據
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('connecting');

        // 模擬數據 - 實際使用時替換為真實 API
        const mockData: StatisticsData = {
          hourlyData: [
            { time: '00:00', co2: 400, o2: 20.9, humidity: 45, temperature: 22 },
            { time: '02:00', co2: 420, o2: 20.8, humidity: 48, temperature: 22.5 },
            { time: '04:00', co2: 450, o2: 20.7, humidity: 52, temperature: 23 },
            { time: '06:00', co2: 480, o2: 20.6, humidity: 55, temperature: 23.5 },
            { time: '08:00', co2: 650, o2: 20.4, humidity: 58, temperature: 24 },
            { time: '10:00', co2: 800, o2: 20.2, humidity: 62, temperature: 25 },
            { time: '12:00', co2: 950, o2: 20.0, humidity: 65, temperature: 26 },
            { time: '14:00', co2: 1100, o2: 19.8, humidity: 68, temperature: 26.5 },
            { time: '16:00', co2: 1050, o2: 19.9, humidity: 66, temperature: 26 },
            { time: '18:00', co2: 850, o2: 20.1, humidity: 63, temperature: 25.5 },
            { time: '20:00', co2: 650, o2: 20.3, humidity: 58, temperature: 24.5 },
            { time: '22:00', co2: 500, o2: 20.6, humidity: 52, temperature: 23 }
          ],
          statusDistribution: [
            { name: '正常', value: 65, color: '#10B981' },
            { name: '警告', value: 25, color: '#F59E0B' },
            { name: '嚴重', value: 10, color: '#EF4444' }
          ],
          dailyTrends: [
            { date: '01-16', avgCO2: 650, maxCO2: 1200, minCO2: 400, avgHumidity: 58 },
            { date: '01-17', avgCO2: 680, maxCO2: 1250, minCO2: 420, avgHumidity: 61 },
            { date: '01-18', avgCO2: 620, maxCO2: 1100, minCO2: 380, avgHumidity: 55 },
            { date: '01-19', avgCO2: 710, maxCO2: 1300, minCO2: 450, avgHumidity: 63 },
            { date: '01-20', avgCO2: 590, maxCO2: 1050, minCO2: 350, avgHumidity: 52 },
            { date: '01-21', avgCO2: 740, maxCO2: 1400, minCO2: 480, avgHumidity: 67 },
            { date: '01-22', avgCO2: 670, maxCO2: 1180, minCO2: 410, avgHumidity: 59 }
          ],
          parameterRanges: [
            { parameter: 'CO₂', normal: 60, warning: 30, critical: 10 },
            { parameter: 'O₂', normal: 85, warning: 12, critical: 3 },
            { parameter: '濕度', normal: 70, warning: 20, critical: 10 },
            { parameter: '溫度', normal: 80, warning: 15, critical: 5 }
          ]
        };

        // 模擬 API 延遲
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setData(mockData);
        setConnectionStatus('connected');
        setLastSync(new Date());
        setError('');

      } catch (err) {
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : '獲取統計數據失敗');
        console.error('獲取統計數據失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedTimeRange, selectedParameter]);

  const handleRefresh = () => {
    setError('');
  };

  const exportChart = () => {
    const csvContent = data?.hourlyData.map(item => 
      Object.values(item).join(',')
    ).join('\n');
    
    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lab-statistics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  // 自定義圓餅圖標籤
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="14" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">載入統計數據中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - 使用統一風格 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-full">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">靜態圖表系統</h1>
                <p className="text-gray-600">實驗室環境數據可視化分析</p>
              </div>
            </div>
            
            {/* 連線狀態和操作按鈕 */}
            <div className="flex items-center gap-3">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">過去 24 小時</option>
                <option value="7d">過去 7 天</option>
                <option value="30d">過去 30 天</option>
              </select>

              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                title="重新整理"
                disabled={isLoading}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={exportChart}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                disabled={!data}
              >
                <Download className="w-4 h-4 mr-2" />
                導出數據
              </button>
              
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : connectionStatus === 'connecting' ? (
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span className={`text-sm ${
                  connectionStatus === 'connected' ? 'text-green-600' : 
                  connectionStatus === 'connecting' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {connectionStatus === 'connected' ? '已連線' : 
                   connectionStatus === 'connecting' ? '連線中' : '連線異常'}
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
                  onClick={() => setError('')}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 主要圖表區域 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 24小時趨勢圖 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    24小時環境參數趨勢
                  </h2>
                  <select
                    value={selectedParameter}
                    onChange={(e) => setSelectedParameter(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="co2">CO₂ 濃度</option>
                    <option value="o2">O₂ 濃度</option>
                    <option value="humidity">濕度</option>
                    <option value="temperature">溫度</option>
                  </select>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.hourlyData}>
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="time" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={selectedParameter}
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#colorGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 7日趨勢對比 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  7日 CO₂ 濃度趨勢
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="avgCO2" stroke="#3B82F6" strokeWidth={2} name="平均值" />
                      <Line type="monotone" dataKey="maxCO2" stroke="#EF4444" strokeWidth={2} name="最高值" />
                      <Line type="monotone" dataKey="minCO2" stroke="#10B981" strokeWidth={2} name="最低值" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 參數分布狀況 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5" />
                  各參數狀態分布
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.parameterRanges}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="parameter" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="normal" stackId="a" fill="#10B981" name="正常" />
                      <Bar dataKey="warning" stackId="a" fill="#F59E0B" name="警告" />
                      <Bar dataKey="critical" stackId="a" fill="#EF4444" name="嚴重" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 側邊欄 */}
            <div className="space-y-6">
              {/* 狀態分布餅圖 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">整體狀態分布</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {data.statusDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}%</span>
                    </div>
                  ))}
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
                      {connectionStatus === 'connected' ? '數據連線正常' : '數據連線異常'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-700">
                      數據點: {data.hourlyData.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-gray-700">
                      上次更新: {lastSync.toLocaleTimeString('zh-TW')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 關鍵指標 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">數據概覽</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-gray-600">總數據點</span>
                    <span className="text-lg font-semibold text-gray-900">{data.hourlyData.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-gray-600">監控參數</span>
                    <span className="text-lg font-semibold text-gray-900">4 項</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-gray-600">數據覆蓋</span>
                    <span className="text-lg font-semibold text-gray-900">7 天</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticChart;