import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, RefreshCw, Database, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

// 數據記錄介面定義
interface DataRecord {
  id: string;
  timestamp: string;
  co2: number;
  o2: number;
  ch2o: number;
  co: number;
  nh3: number;
  humidity: number;
  o3: number;
  status: 'normal' | 'warning' | 'critical';
}

const DataRecords: React.FC = () => {
  // 狀態管理
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  
  // 搜索和篩選狀態
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // 分頁狀態
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);
  
  // 獲取數據記錄
  useEffect(() => {
    const fetchDataRecords = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('connecting');
        
        // 構建查詢參數
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          search: searchTerm,
          startDate,
          endDate,
          status: statusFilter === 'all' ? '' : statusFilter
        });
        
        // 模擬數據 - 實際使用時替換為真實 API
        const mockData = [
          {
            id: '1',
            timestamp: '2025-01-22T10:30:00Z',
            co2: 420,
            o2: 20.9,
            ch2o: 0.08,
            co: 0.001,
            nh3: 0.5,
            humidity: 65,
            o3: 0.03,
            status: 'normal' as const
          },
          {
            id: '2',
            timestamp: '2025-01-22T10:25:00Z',
            co2: 850,
            o2: 19.5,
            ch2o: 0.15,
            co: 0.003,
            nh3: 1.2,
            humidity: 75,
            o3: 0.08,
            status: 'warning' as const
          },
          {
            id: '3',
            timestamp: '2025-01-22T10:20:00Z',
            co2: 1200,
            o2: 18.5,
            ch2o: 0.25,
            co: 0.008,
            nh3: 2.5,
            humidity: 85,
            o3: 0.15,
            status: 'critical' as const
          }
        ];
        
        // 模擬 API 延遲
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setRecords(mockData);
        setConnectionStatus('connected');
        setLastSync(new Date());
        setError('');
        
        /*
        // 實際 API 呼叫代碼
        const response = await fetch(`http://your-server-address:port/api/data-records?${queryParams}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('無法獲取數據記錄');
        }
        
        const data = await response.json();
        setRecords(data.records || []);
        setConnectionStatus('connected');
        setLastSync(new Date());
        */
        
      } catch (err) {
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : '獲取數據失敗');
        console.error('獲取數據記錄失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataRecords();
  }, [currentPage, searchTerm, startDate, endDate, statusFilter]);
  
  // 導出 CSV 功能
  const exportToCSV = () => {
    const headers = ['ID', '日期時間', 'CO₂ (ppm)', 'O₂ (%)', 'CH₂O (ppm)', 'CO (%)', 'NH₃ (ppm)', '濕度 (%)', 'O₃ (ppm)', '狀態'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => 
        [record.id, record.timestamp, record.co2, record.o2, record.ch2o, record.co, record.nh3, record.humidity, record.o3, record.status].join(',')
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
  };
  
  // 狀態樣式
  const getStatusBadge = (status: string) => {
    const styles = {
      normal: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || styles.normal;
  };
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };
  
  // 計算總頁數
  const totalPages = Math.ceil(records.length / itemsPerPage);

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
              
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                disabled={records.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                導出 CSV
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 搜索和篩選區域 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">搜索與篩選</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                
                {/* 開始日期 */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                {/* 結束日期 */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
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
                        CO₂ (ppm)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        O₂ (%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CH₂O (ppm)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CO (%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NH₃ (ppm)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        濕度 (%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        O₃ (ppm)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        狀態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                          沒有找到數據記錄
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(record.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.co2}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.o2}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.ch2o}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.co}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.nh3}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.humidity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.o3}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                              {record.status === 'normal' ? '正常' : record.status === 'warning' ? '警告' : '嚴重'}
                            </span>
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
                        顯示第 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> 到{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, records.length)}</span> 項，
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