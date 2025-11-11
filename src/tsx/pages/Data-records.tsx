import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Download, RefreshCw, Database, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { getRecentData, searchData, SensorData, ExcelResponse, downloadExcelFile, parseExcelToSensorData, formatDateTime } from '../services/api';

// 使用從 API 服務導入的 SensorData 介面
type DataRecord = SensorData & { id: string };

const DataRecords: React.FC = () => {
  // 狀態管理
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  
  // 搜索和篩選狀態
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('last7days'); // 新增：日期範圍選擇，預設為最近7天
  // 新增：回傳格式切換（預設 json，另有 excel）
  const [returnFormat, setReturnFormat] = useState<'json' | 'excel'>('json');
  
  // 新增：實驗室和機器選擇（從 localStorage 帶入，預設 nccu_lab）
  const [selectedCompanyLab] = useState<string>(
    localStorage.getItem('company_lab') || 'nccu_lab'
  );
  const [selectedMachine] = useState<string>('aq');
  const [dataCount] = useState<number>(100);
  
  // 分頁狀態
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);
  const [queryVersion, setQueryVersion] = useState<number>(0);
  
  // 初始化為顯示最近數據（不設置日期範圍）
  useEffect(() => {
    setDateRange('custom');
    setStartDate('');
    setEndDate('');
  }, []);

  const handleSearch = () => {
    // 驗證日期
    if (startDate && endDate) {
      const [sY, sM, sD] = startDate.split('-').map(Number);
      const [eY, eM, eD] = endDate.split('-').map(Number);
      const startDt = new Date(sY, (sM || 1) - 1, sD || 1);
      const endDt = new Date(eY, (eM || 1) - 1, eD || 1);
      if (startDt.getTime() > endDt.getTime()) {
        setError('開始日期不能晚於結束日期');
        return;
      }
    }
    setCurrentPage(1);
    setError('');
    setSuccessMessage('');
    setQueryVersion((v) => v + 1);
  };

  // 初次載入立即查詢最近資料
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 獲取數據記錄（每次點擊搜尋或相關依賴變動）
  useEffect(() => {
    if (queryVersion === 0) return;
    const fetchDataRecords = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('connecting');
        setError('');
        
        let data: SensorData[] = [];
        
        if (startDate && endDate) {
          // 使用本地時區 Date 生成，再以 formatDateTime 格式化，避免跨時區偏移
          const [sY, sM, sD] = startDate.split('-').map(Number);
          const [eY, eM, eD] = endDate.split('-').map(Number);
          const startDt = new Date(sY, (sM || 1) - 1, sD || 1, 0, 0, 0);
          const endDt = new Date(eY, (eM || 1) - 1, eD || 1, 23, 59, 59);
          const startWithTime = formatDateTime(startDt);
          const endWithTime = formatDateTime(endDt);
          // 使用搜索 API - 可能返回 Excel 文件
          const searchResult = await searchData({
            company_lab: selectedCompanyLab,
            machine: selectedMachine,
            start: startWithTime,
            end: endWithTime,
            format: returnFormat
          });
          
          // 檢查是否為 Excel 響應
          if (searchResult && typeof searchResult === 'object' && 'type' in searchResult && searchResult.type === 'excel') {
            if (returnFormat === 'excel') {
              // 預期下載情境
              downloadExcelFile(searchResult as ExcelResponse);
              setError('');
              setSuccessMessage(`Excel 文件已下載: ${(searchResult as ExcelResponse).filename}`);
              setRecords([]); // 維持現有行為：下載模式不在表格顯示
              return;
            }
            // 使用者選的是 JSON，但伺服器回傳 Excel：改為前端解析後顯示
            const parsed = await parseExcelToSensorData(searchResult as ExcelResponse);
            data = parsed as SensorData[];
          } else {
            // 正常的數據數組
            data = searchResult as SensorData[];
          }
        } else {
          data = await getRecentData({
            company_lab: selectedCompanyLab,
            machine: selectedMachine,
            number: dataCount
          });
        }
  
        
        // 依時間由新到舊排序
        const toMs = (ts: string): number => {
          const d = new Date(ts);
          if (!isNaN(d.getTime())) return d.getTime();
          const alt = ts.replace(/-/g, '/');
          const d2 = new Date(alt);
          return isNaN(d2.getTime()) ? 0 : d2.getTime();
        };
        data.sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));

        // 轉換數據格式並添加 ID
        let formattedData: DataRecord[] = data.map((item, index) => ({
          ...item,
          id: `record_${index + 1}`,
          timestamp: item.timestamp
        }));

        // 再次保險排序：確保跨月時 10 月在 9 月前
        const parseToMs = (ts: string): number => {
          // 標準 YYYY-MM-DD HH:mm:ss
          const isoLike = ts.replace(' ', 'T');
          const d1 = new Date(isoLike);
          if (!isNaN(d1.getTime())) return d1.getTime();
          // 退化處理：將 - 換成 /
          const d2 = new Date(ts.replace(/-/g, '/'));
          if (!isNaN(d2.getTime())) return d2.getTime();
          // 最後手段：只取日期部分
          const m = ts.match(/(\d{4})[-\/]?(\d{1,2})[-\/]?(\d{1,2})/);
          if (m) {
            const y = Number(m[1]);
            const mo = Number(m[2]);
            const da = Number(m[3]);
            return new Date(y, mo - 1, da).getTime();
          }
          return 0;
        };
        formattedData.sort((a, b) => parseToMs(b.timestamp) - parseToMs(a.timestamp));
        
        setRecords(formattedData);
        setConnectionStatus('connected');
        setLastSync(new Date());
        setSuccessMessage(`成功載入 ${formattedData.length} 條數據記錄`);
      } catch (err) {
        setError(err instanceof Error ? err.message : '獲取數據失敗');
        setConnectionStatus('error');
        console.error('獲取數據失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDataRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryVersion, selectedCompanyLab, selectedMachine, dataCount, returnFormat]);
  
  // 導出 CSV 功能
  const exportToCSV = () => {
    const headers = ['ID', '日期時間', '機器', '溫度 (°C)', '濕度 (%)', 'PM2.5', 'PM10', 'PM2.5 平均', 'PM10 平均', 'CO₂ (ppm)', 'TVOC'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => 
        [record.id, record.timestamp, record.machine, record.temperatu, record.humidity, record.pm25, record.pm10, record.pm25_ave, record.pm10_ave, record.co2, record.tvoc].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  // 刷新數據
  const handleRefresh = () => {
    setCurrentPage(1);
    setError('');
    setSuccessMessage('');
    handleSearch();
  };

  // 顯示最近數據（清除日期範圍）
  const showRecentData = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('custom');
    setCurrentPage(1);
    handleSearch();
  };
  
  // 狀態樣式（保留以備將來使用）
  // const getStatusBadge = (status: string) => {
  //   const styles = {
  //     normal: 'bg-green-100 text-green-800',
  //     warning: 'bg-yellow-100 text-yellow-800',
  //     critical: 'bg-red-100 text-red-800'
  //   };
  //   return styles[status as keyof typeof styles] || styles.normal;
  // };
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  // 日期範圍處理函數
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();
    // 使用本地時區格式避免因 UTC 造成日期偏移
    const formatDateForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (range) {
      case 'today':
        setStartDate(formatDateForInput(today));
        setEndDate(formatDateForInput(today));
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setStartDate(formatDateForInput(yesterday));
        setEndDate(formatDateForInput(yesterday));
        break;
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        setStartDate(formatDateForInput(last7Days));
        setEndDate(formatDateForInput(today));
        break;
      case 'last30days':
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        setStartDate(formatDateForInput(last30Days));
        setEndDate(formatDateForInput(today));
        break;
      case 'last90days':
        const last90Days = new Date(today);
        last90Days.setDate(last90Days.getDate() - 90);
        setStartDate(formatDateForInput(last90Days));
        setEndDate(formatDateForInput(today));
        break;
      case 'thisMonth':
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(formatDateForInput(firstDayOfMonth));
        setEndDate(formatDateForInput(today));
        break;
      case 'lastMonth':
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(formatDateForInput(firstDayOfLastMonth));
        setEndDate(formatDateForInput(lastDayOfLastMonth));
        break;
      case 'thisYear':
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        setStartDate(formatDateForInput(firstDayOfYear));
        setEndDate(formatDateForInput(today));
        break;
      case 'custom':
        // 保持當前選擇的日期
        break;
      default:
        break;
    }
  };
  
  // 計算總頁數
  const totalPages = Math.ceil(records.length / itemsPerPage) || 1;
  const pageStartIndex = (currentPage - 1) * itemsPerPage;
  const pagedRecords = records.slice(pageStartIndex, pageStartIndex + itemsPerPage);

  const summary = useMemo(() => {
    if (records.length === 0) return null;
    const co2Values = records.map(r => r.co2);
    const humidityValues = records.map(r => r.humidity);
    const latestTimestamp = records[0]?.timestamp;
    const oldestTimestamp = records[records.length - 1]?.timestamp;
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    return {
      total: records.length,
      avgCO2: Math.round(avg(co2Values)),
      avgHumidity: Math.round(avg(humidityValues) * 10) / 10,
      latest: latestTimestamp,
      oldest: oldestTimestamp
    };
  }, [records]);

  const trendData = useMemo(() => {
    if (records.length === 0) return [];
    const copy = [...records].reverse(); // 由舊到新
    return copy.slice(-50).map((r) => ({
      time: new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      co2: r.co2,
      pm25: r.pm25,
      humidity: r.humidity
    }));
  }, [records]);

  if (isLoading && records.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">載入數據記錄中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - 使用 Alert 組件的風格 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-full">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">數據記錄系統</h1>
                <p className="text-gray-600">查看和管理實驗室環境監測數據</p>
              </div>
            </div>
            
            {/* 連線狀態和操作按鈕 */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                title="重新整理"
                disabled={isLoading}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSearch}
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  disabled={isLoading}
                >
                  <Search className="w-4 h-4 mr-2" />
                  搜尋
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  disabled={records.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  導出 CSV
                </button>
              </div>
              
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
          
          {/* 當前日期範圍顯示 */}
          {startDate && endDate && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700 text-sm">
                  當前查詢範圍: {startDate} 至 {endDate}
                  {dateRange !== 'custom' && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({dateRange === 'today' ? '今天' :
                        dateRange === 'yesterday' ? '昨天' :
                        dateRange === 'last7days' ? '最近 7 天' :
                        dateRange === 'last30days' ? '最近 30 天' :
                        dateRange === 'last90days' ? '最近 90 天' :
                        dateRange === 'thisMonth' ? '本月' :
                        dateRange === 'lastMonth' ? '上月' :
                        dateRange === 'thisYear' ? '今年' : '自訂範圍'})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 統計摘要與趨勢 */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-5">
              <h3 className="text-sm font-medium text-gray-500 mb-2">總筆數</h3>
              <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
              <p className="text-xs text-gray-500 mt-2">
                範圍：{summary.oldest ? new Date(summary.oldest).toLocaleString('zh-TW') : '--'} 至{' '}
                {summary.latest ? new Date(summary.latest).toLocaleString('zh-TW') : '--'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-5">
              <h3 className="text-sm font-medium text-gray-500 mb-2">平均 CO₂ (ppm)</h3>
              <p className="text-2xl font-semibold text-blue-600">{summary.avgCO2}</p>
              <h3 className="text-sm font-medium text-gray-500 mt-4 mb-2">平均濕度 (%)</h3>
              <p className="text-xl font-semibold text-emerald-600">{summary.avgHumidity}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-5">
              <h3 className="text-sm font-medium text-gray-500 mb-3">快速趨勢 (最近 50 筆)</h3>
              {trendData.length > 0 ? (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="co2" stroke="#3B82F6" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-500">無足夠資料顯示趨勢</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 搜索和篩選區域 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">搜索與篩選</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="搜索記錄..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* 日期範圍選擇器 */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                  <select
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                  >
                    <option value="custom">自訂日期範圍</option>
                    <option value="today">今天</option>
                    <option value="yesterday">昨天</option>
                    <option value="last7days">最近 7 天</option>
                    <option value="last30days">最近 30 天</option>
                    <option value="last90days">最近 90 天</option>
                    <option value="thisMonth">本月</option>
                    <option value="lastMonth">上月</option>
                    <option value="thisYear">今年</option>
                  </select>
                </div>
                
                {/* 開始日期 */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRange('custom'); // 手動選擇日期時設為自訂
                    }}
                    disabled={dateRange !== 'custom'}
                  />
                  {startDate && dateRange === 'custom' && (
                    <button
                      type="button"
                      onClick={() => setStartDate('')}
                      className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-sm"
                      title="清除開始日期"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* 結束日期 */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRange('custom'); // 手動選擇日期時設為自訂
                    }}
                    disabled={dateRange !== 'custom'}
                  />
                  {endDate && dateRange === 'custom' && (
                    <button
                      type="button"
                      onClick={() => setEndDate('')}
                      className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-sm"
                      title="清除結束日期"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* 狀態篩選 */}
                <div>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">所有狀態</option>
                    <option value="normal">正常</option>
                    <option value="warning">警告</option>
                    <option value="critical">嚴重</option>
                  </select>
                </div>

                {/* 顯示最近數據按鈕 */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={showRecentData}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    顯示最近數據
                  </button>
                </div>
                {/* 回傳格式切換 */}
                <div>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={returnFormat}
                    onChange={(e) => setReturnFormat(e.target.value as 'json' | 'excel')}
                  >
                    <option value="json">以 JSON 顯示</option>
                    <option value="excel">下載 Excel</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 數據表格 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日期時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        機器
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        溫度 (°C)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        濕度 (%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PM2.5
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PM10
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PM2.5 平均
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PM10 平均
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CO₂ (ppm)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TVOC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                          沒有找到數據記錄
                        </td>
                      </tr>
                    ) : (
                      pagedRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(record.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.machine}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.temperatu}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.humidity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.pm25}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.pm10}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.pm25_ave}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.pm10_ave}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.co2}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.tvoc}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* 分頁 */}
              {records.length > 0 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      上一頁
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      下一頁
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        顯示第 <span className="font-medium">{records.length === 0 ? 0 : pageStartIndex + 1}</span> 到{' '}
                        <span className="font-medium">{Math.min(pageStartIndex + itemsPerPage, records.length)}</span> 項，
                        共 <span className="font-medium">{records.length}</span> 項結果
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          上一頁
                        </button>
                        
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                ${currentPage === page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          下一頁
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 側邊欄 - 統計資訊 */}
          <div className="space-y-6">
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
                  <Database className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700">
                    總記錄數: {records.length}
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

            {/* 統計摘要 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">狀態統計</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">正常</span>
                  </div>
                  <span className="text-sm font-medium">
                    {records.filter(r => r.status === 'normal').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">警告</span>
                  </div>
                  <span className="text-sm font-medium">
                    {records.filter(r => r.status === 'warning').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">嚴重</span>
                  </div>
                  <span className="text-sm font-medium">
                    {records.filter(r => r.status === 'critical').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRecords;