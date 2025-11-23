import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { BarChart3, RefreshCw, Calendar, Wifi, WifiOff, CheckCircle, XCircle, AlertTriangle, Activity, Thermometer } from 'lucide-react';
import { searchData, SensorData, formatDateTime, parseExcelToSensorData } from '../services/api';

// 統計數據介面
interface StatisticsData {
  hourlyData: Array<{
    time: string;
    co2: number;
    humidity: number;
    temperature: number;
    pm25: number;
    pm10: number;
    tvoc: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  dailyTrends: Array<{
    date: string;
    // CO₂
    avgCO2: number;
    maxCO2: number;
    minCO2: number;
    // 濕度
    avgHumidity: number;
    maxHumidity: number;
    minHumidity: number;
    // 溫度
    avgTemperature: number;
    maxTemperature: number;
    minTemperature: number;
    // PM2.5
    avgPM25: number;
    maxPM25: number;
    minPM25: number;
    // PM10
    avgPM10: number;
    maxPM10: number;
    minPM10: number;
    // TVOC
    avgTVOC: number;
    maxTVOC: number;
    minTVOC: number;
  }>;
  parameterRanges: Array<{
    parameter: string;
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  }>;
  environmentalInsights: Array<{
    type: 'positive' | 'warning' | 'info';
    message: string;
  }>;
}

const renderEmptyChartState = (message: string) => (
  <div className="h-80 flex flex-col items-center justify-center text-gray-500 space-y-3">
    <AlertTriangle className="w-8 h-8 text-gray-400" />
    <p className="text-sm">{message}</p>
  </div>
);

const StaticChart: React.FC = () => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24h');
  const [selectedParameter, setSelectedParameter] = useState<string>('co2');
  const [, setRawData] = useState<SensorData[]>([]);

  // 環境數據分析函數
  const analyzeEnvironmentalData = (sensorData: SensorData[]) => {
    if (sensorData.length === 0) return null;

    // 計算統計數據
    const avgCO2 = sensorData.reduce((sum, item) => sum + item.co2, 0) / sensorData.length;
    const avgHumidity = sensorData.reduce((sum, item) => sum + item.humidity, 0) / sensorData.length;
    const avgTemperature = sensorData.reduce((sum, item) => sum + item.temperatu, 0) / sensorData.length;
    const avgPM25 = sensorData.reduce((sum, item) => sum + item.pm25, 0) / sensorData.length;
    const avgPM10 = sensorData.reduce((sum, item) => sum + item.pm10, 0) / sensorData.length;
    const avgTVOC = sensorData.reduce((sum, item) => sum + item.tvoc, 0) / sensorData.length;

    return {
      avgCO2: Math.round(avgCO2),
      avgHumidity: Math.round(avgHumidity * 10) / 10,
      avgTemperature: Math.round(avgTemperature * 10) / 10,
      avgPM25: Math.round(avgPM25 * 10) / 10,
      avgPM10: Math.round(avgPM10 * 10) / 10,
      avgTVOC: Math.round(avgTVOC * 1000) / 1000
    };
  };

  // 工具：依小時分組（本地時區），回傳近 24 小時的平均值序列
const buildHourlySeries = (sensorData: SensorData[], maxPoints: number) => {
    // 依時間排序
    const sorted = [...sensorData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const byHour = new Map<string, { readings: SensorData[]; label: string }>();
  sorted.forEach(d => {
    const dt = new Date(d.timestamp);
    const key = dt.toISOString().slice(0, 13); // yyyy-mm-ddThh
    const label = dt.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    if (!byHour.has(key)) {
      byHour.set(key, { readings: [], label });
    }
    byHour.get(key)!.readings.push(d);
  });
  const keys = Array.from(byHour.keys());
  const limit = Math.min(keys.length, maxPoints);
  const lastKeys = keys.slice(-limit);
  return lastKeys.map(k => {
    const entry = byHour.get(k);
    if (!entry) {
      return { time: k, co2: 0, humidity: 0, temperature: 0, pm25: 0, pm10: 0, tvoc: 0 };
    }
    const list = entry.readings;
      const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
      return {
      time: entry.label,
        co2: Math.round(avg(list.map(i => i.co2))),
        humidity: Math.round(avg(list.map(i => i.humidity)) * 10) / 10,
        temperature: Math.round(avg(list.map(i => i.temperatu)) * 10) / 10,
        pm25: Math.round(avg(list.map(i => i.pm25)) * 10) / 10,
        pm10: Math.round(avg(list.map(i => i.pm10)) * 10) / 10,
        tvoc: Math.round(avg(list.map(i => i.tvoc)) * 1000) / 1000
      };
    });
  };

// 工具：依日期分組（本地時區），回傳最近 7 天的各指標（含平均 / 最高 / 最低）
const buildDailyTrends = (sensorData: SensorData[]) => {
  const sorted = [...sensorData].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const byDay = new Map<string, SensorData[]>();
  sorted.forEach(d => {
    const dt = new Date(d.timestamp);
    const key = `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(
      2,
      '0'
    )}`;
    const list = byDay.get(key) || [];
    list.push(d);
    byDay.set(key, list);
  });
  const keys = Array.from(byDay.keys());
  const lastKeys = keys.slice(-7);
  return lastKeys.map(k => {
    const list = byDay.get(k) || [];
    const nums = (sel: (d: SensorData) => number) => list.map(sel);
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);
    const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);

    const co2Arr = nums(d => d.co2);
    const humArr = nums(d => d.humidity);
    const tempArr = nums(d => d.temperatu);
    const pm25Arr = nums(d => d.pm25);
    const pm10Arr = nums(d => d.pm10);
    const tvocArr = nums(d => d.tvoc);

    return {
      date: k,
      // CO₂
      avgCO2: Math.round(avg(co2Arr)),
      maxCO2: Math.round(max(co2Arr)),
      minCO2: Math.round(min(co2Arr)),
      // 濕度
      avgHumidity: Math.round(avg(humArr) * 10) / 10,
      maxHumidity: Math.round(max(humArr) * 10) / 10,
      minHumidity: Math.round(min(humArr) * 10) / 10,
      // 溫度
      avgTemperature: Math.round(avg(tempArr) * 10) / 10,
      maxTemperature: Math.round(max(tempArr) * 10) / 10,
      minTemperature: Math.round(min(tempArr) * 10) / 10,
      // PM2.5
      avgPM25: Math.round(avg(pm25Arr) * 10) / 10,
      maxPM25: Math.round(max(pm25Arr) * 10) / 10,
      minPM25: Math.round(min(pm25Arr) * 10) / 10,
      // PM10
      avgPM10: Math.round(avg(pm10Arr) * 10) / 10,
      maxPM10: Math.round(max(pm10Arr) * 10) / 10,
      minPM10: Math.round(min(pm10Arr) * 10) / 10,
      // TVOC
      avgTVOC: Math.round(avg(tvocArr) * 1000) / 1000,
      maxTVOC: Math.round(max(tvocArr) * 1000) / 1000,
      minTVOC: Math.round(min(tvocArr) * 1000) / 1000
    };
  });
};

  // 將原始數據轉換為圖表數據
const processDataForCharts = (sensorData: SensorData[], rangeHours: number): StatisticsData => {
    if (sensorData.length === 0) {
      return {
        hourlyData: [],
        statusDistribution: [
          { name: '優良', value: 0, color: '#10B981' },
          { name: '良好', value: 0, color: '#84CC16' },
          { name: '普通', value: 0, color: '#F59E0B' },
          { name: '不良', value: 0, color: '#EF4444' }
        ],
        dailyTrends: [],
        parameterRanges: [
          { parameter: 'CO₂', excellent: 0, good: 0, fair: 0, poor: 0 },
          { parameter: 'PM2.5', excellent: 0, good: 0, fair: 0, poor: 0 },
          { parameter: 'PM10', excellent: 0, good: 0, fair: 0, poor: 0 },
          { parameter: 'TVOC', excellent: 0, good: 0, fair: 0, poor: 0 }
        ],
        environmentalInsights: []
      };
    }

  const hourlyData = buildHourlySeries(sensorData, rangeHours);

    // 環境質量評估（基於多個參數）
    const total = sensorData.length;
    let excellent = 0, good = 0, fair = 0, poor = 0;
    
    sensorData.forEach(item => {
      let score = 0;
      
      // CO2 評分 (理想 < 400ppm)
      if (item.co2 < 400) score += 3;
      else if (item.co2 < 600) score += 2;
      else if (item.co2 < 1000) score += 1;
      
      // PM2.5 評分 (理想 < 15μg/m³)
      if (item.pm25 < 15) score += 3;
      else if (item.pm25 < 35) score += 2;
      else if (item.pm25 < 75) score += 1;
      
      // PM10 評分 (理想 < 50μg/m³)
      if (item.pm10 < 50) score += 3;
      else if (item.pm10 < 100) score += 2;
      else if (item.pm10 < 150) score += 1;
      
      // TVOC 評分 (理想 < 0.3mg/m³)
      if (item.tvoc < 0.3) score += 3;
      else if (item.tvoc < 0.5) score += 2;
      else if (item.tvoc < 1.0) score += 1;
      
      // 濕度評分 (理想 40-60%)
      if (item.humidity >= 40 && item.humidity <= 60) score += 3;
      else if (item.humidity >= 30 && item.humidity <= 70) score += 2;
      else if (item.humidity >= 20 && item.humidity <= 80) score += 1;
      
      // 溫度評分 (理想 20-25°C)
      if (item.temperatu >= 20 && item.temperatu <= 25) score += 3;
      else if (item.temperatu >= 18 && item.temperatu <= 28) score += 2;
      else if (item.temperatu >= 15 && item.temperatu <= 30) score += 1;
      
      // 根據總分分類
      const maxScore = 18; // 6個參數 × 3分
      const percentage = (score / maxScore) * 100;
      
      if (percentage >= 80) excellent++;
      else if (percentage >= 60) good++;
      else if (percentage >= 40) fair++;
      else poor++;
    });
    
    const statusDistribution = [
      { name: '優良', value: Math.round(excellent / total * 100), color: '#10B981' },
      { name: '良好', value: Math.round(good / total * 100), color: '#84CC16' },
      { name: '普通', value: Math.round(fair / total * 100), color: '#F59E0B' },
      { name: '不良', value: Math.round(poor / total * 100), color: '#EF4444' }
    ];

    // 最近 7 天趨勢（根據實際資料）
    const dailyTrends = buildDailyTrends(sensorData);

    // 參數範圍統計（基於環境標準）
    const parameterRanges = [
      { 
        parameter: 'CO₂', 
        excellent: Math.round(sensorData.filter(item => item.co2 < 400).length / total * 100),
        good: Math.round(sensorData.filter(item => item.co2 >= 400 && item.co2 < 600).length / total * 100),
        fair: Math.round(sensorData.filter(item => item.co2 >= 600 && item.co2 < 1000).length / total * 100),
        poor: Math.round(sensorData.filter(item => item.co2 >= 1000).length / total * 100)
      },
      { 
        parameter: 'PM2.5', 
        excellent: Math.round(sensorData.filter(item => item.pm25 < 15).length / total * 100),
        good: Math.round(sensorData.filter(item => item.pm25 >= 15 && item.pm25 < 35).length / total * 100),
        fair: Math.round(sensorData.filter(item => item.pm25 >= 35 && item.pm25 < 75).length / total * 100),
        poor: Math.round(sensorData.filter(item => item.pm25 >= 75).length / total * 100)
      },
      { 
        parameter: 'PM10', 
        excellent: Math.round(sensorData.filter(item => item.pm10 < 50).length / total * 100),
        good: Math.round(sensorData.filter(item => item.pm10 >= 50 && item.pm10 < 100).length / total * 100),
        fair: Math.round(sensorData.filter(item => item.pm10 >= 100 && item.pm10 < 150).length / total * 100),
        poor: Math.round(sensorData.filter(item => item.pm10 >= 150).length / total * 100)
      },
      { 
        parameter: 'TVOC', 
        excellent: Math.round(sensorData.filter(item => item.tvoc < 0.3).length / total * 100),
        good: Math.round(sensorData.filter(item => item.tvoc >= 0.3 && item.tvoc < 0.5).length / total * 100),
        fair: Math.round(sensorData.filter(item => item.tvoc >= 0.5 && item.tvoc < 1.0).length / total * 100),
        poor: Math.round(sensorData.filter(item => item.tvoc >= 1.0).length / total * 100)
      }
    ];

    // 環境洞察分析
    const insights = analyzeEnvironmentalData(sensorData);
    const environmentalInsights: Array<{ type: 'positive' | 'warning' | 'info'; message: string }> = [];
    
    if (insights) {
      if (insights.avgCO2 < 400) {
        environmentalInsights.push({ type: 'positive' as const, message: 'CO₂ 濃度優良，空氣流通良好' });
      } else if (insights.avgCO2 > 1000) {
        environmentalInsights.push({ type: 'warning' as const, message: 'CO₂ 濃度偏高，建議增加通風' });
      }
      
      if (insights.avgHumidity < 30) {
        environmentalInsights.push({ type: 'warning' as const, message: '濕度偏低，建議使用加濕器' });
      } else if (insights.avgHumidity > 70) {
        environmentalInsights.push({ type: 'warning' as const, message: '濕度偏高，建議除濕' });
      }
      
      if (insights.avgPM25 < 15 && insights.avgPM10 < 50) {
        environmentalInsights.push({ type: 'positive' as const, message: 'PM2.5 和 PM10 濃度均在安全範圍內' });
      }
      
      if (insights.avgTVOC < 0.3) {
        environmentalInsights.push({ type: 'positive' as const, message: 'TVOC 濃度低，室內空氣品質良好' });
      }
    }

    return {
      hourlyData,
      statusDistribution,
      dailyTrends,
      parameterRanges,
      environmentalInsights
    };
  };

  // 載入統計數據
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('connecting');
        setError('');
        setSuccessMessage('');

        // 依時間範圍決定查詢起訖
        const now = new Date();
        const hours = selectedTimeRange === '30d' ? 24 * 30 : selectedTimeRange === '7d' ? 24 * 7 : 24;
        const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
        const companyLab =
          localStorage.getItem('lab') ||
          localStorage.getItem('company')?.toLowerCase().replace(/\s+/g, '_') + '_lab' ||
          'nccu_lab';
        const machine = localStorage.getItem('machine') || 'aq';

        // 使用區間查詢 API（後端期望 YYYY-MM-DD HH:MM:SS）
        let sensorData: SensorData[] = [];

        const result = await searchData({
          company_lab: companyLab,
          machine,
          start: formatDateTime(start),
          end: formatDateTime(now),
          format: 'json'
        });

        if (result && typeof result === 'object' && 'type' in result) {
          sensorData = await parseExcelToSensorData(result);
        } else {
          sensorData = result as SensorData[];
        }

        setRawData(sensorData);
        
        // 將原始數據轉換為圖表數據
        const chartData = processDataForCharts(sensorData, hours);
        setData(chartData);
        
        setConnectionStatus('connected');
        setLastSync(new Date());
        setSuccessMessage(`成功載入 ${sensorData.length} 條數據用於圖表分析`);

      } catch (err) {
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : '獲取統計數據失敗');
        console.error('獲取統計數據失敗:', err);
        setData(null);
        setSuccessMessage('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedTimeRange, selectedParameter]);

  const handleRefresh = () => {
    setError('');
    setSuccessMessage('');
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

  const rangeLabelMap: Record<string, string> = {
    '24h': '過去 24 小時',
    '7d': '過去 7 天',
    '30d': '過去 30 天'
  };
  const primaryRangeLabel = rangeLabelMap[selectedTimeRange] || '過去 24 小時';

  const hasHourlyData = (data?.hourlyData?.length || 0) > 0;
  const hasParameterRangeData = (data?.parameterRanges || []).some(range => (range.excellent + range.good + range.fair + range.poor) > 0);
  const hasStatusDistributionData = (data?.statusDistribution || []).some(item => item.value > 0);

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
          
          {/* 成功訊息 */}
          {successMessage && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700">{successMessage}</span>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="ml-auto text-green-500 hover:text-green-700"
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
                    {primaryRangeLabel}環境參數趨勢
                  </h2>
                  <select
                    value={selectedParameter}
                    onChange={(e) => setSelectedParameter(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="co2">CO₂ 濃度</option>
                    <option value="humidity">濕度</option>
                    <option value="temperature">溫度</option>
                    <option value="pm25">PM2.5</option>
                    <option value="pm10">PM10</option>
                    <option value="tvoc">TVOC</option>
                  </select>
                </div>
                {hasHourlyData ? (
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
                ) : (
                  renderEmptyChartState('目前尚無 24 小時趨勢資料')
                )}
              </div>

              {/* 參數分布狀況 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5" />
                  各參數狀態分布
                </h2>
                {hasParameterRangeData ? (
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
                        <Bar dataKey="excellent" stackId="a" fill="#10B981" name="優良" />
                        <Bar dataKey="good" stackId="a" fill="#84CC16" name="良好" />
                        <Bar dataKey="fair" stackId="a" fill="#F59E0B" name="普通" />
                        <Bar dataKey="poor" stackId="a" fill="#EF4444" name="不良" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChartState('目前尚無參數狀態資料')
                )}
              </div>
            </div>

            {/* 側邊欄 */}
            <div className="space-y-6">
              {/* 狀態分布餅圖 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">整體狀態分布</h3>
                {hasStatusDistributionData ? (
                  <>
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
                  </>
                ) : (
                  renderEmptyChartState('目前尚無狀態分布資料')
                )}
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
                    <span className="text-lg font-semibold text-gray-900">6 項</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-gray-600">數據覆蓋</span>
                    <span className="text-lg font-semibold text-gray-900">24 小時</span>
                  </div>
                </div>
              </div>

              {/* 環境洞察分析 */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  環境洞察分析
                </h3>
                <div className="space-y-3">
                  {data.environmentalInsights.map((insight, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      insight.type === 'positive' 
                        ? 'bg-green-50 border-green-400 text-green-800'
                        : insight.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                        : 'bg-blue-50 border-blue-400 text-blue-800'
                    }`}>
                      <div className="flex items-start gap-2">
                        {insight.type === 'positive' && <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />}
                        {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-600" />}
                        {insight.type === 'info' && <Activity className="w-4 h-4 mt-0.5 text-blue-600" />}
                        <span className="text-sm font-medium">{insight.message}</span>
                      </div>
                    </div>
                  ))}
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