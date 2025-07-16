import React, { useState, useEffect } from 'react';

// 定義實驗室介面
interface Sensor {
  name: string;
  description: string;
  company: string;
  lab: string;
}

interface Laboratory {
  id: string;
  name: string;
  description: string;
  sensors: Sensor[];
  company: string;
}

const LaboratoryManagement = () => {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [showEditLabModal, setShowEditLabModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null);
  const [managingSensorsLab, setManagingSensorsLab] = useState<Laboratory | null>(null);

  // 新增實驗室表單
  const [newLab, setNewLab] = useState({
    name: '',
    description: '',
    sensors: [] as Sensor[],
    company: ''
  });

  // 新增感測器表單
  const [newSensor, setNewSensor] = useState({
    name: '',
    description: '',
    company: '',
    lab: ''
  });

  // 感測器類型選項
  const sensorTypes = [
    { value: 'temperature', label: '溫度', defaultUnit: '°C' },
    { value: 'humidity', label: '濕度', defaultUnit: '%' },
    { value: 'pressure', label: '壓力', defaultUnit: 'Pa' },
    { value: 'ph', label: 'pH值', defaultUnit: 'pH' },
    { value: 'light', label: '光照', defaultUnit: 'lux' },
    { value: 'co2', label: '二氧化碳', defaultUnit: 'ppm' },
    { value: 'oxygen', label: '氧氣', defaultUnit: '%' },
    { value: 'vibration', label: '震動', defaultUnit: 'Hz' }
  ];

  // 獲取實驗室列表
  const fetchLabs = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('http://13.211.240.55/api/getLabs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('無法獲取實驗室列表');
      }

      const data = await response.json();
      setLaboratories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '獲取實驗室列表失敗');
      console.error('獲取實驗室列表失敗:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 組件加載時獲取實驗室列表
  useEffect(() => {
    fetchLabs();
  }, []);

  // 篩選實驗室
  const filteredLabs = laboratories.filter(lab => {
    const matchesSearch = lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lab.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // 新增實驗室
  const handleAddLab = async () => {
    if (!newLab.name || !newLab.description || !newLab.company) {
      alert('請填寫實驗室名稱、描述和公司');
      return;
    }
    
    try {
      const response = await fetch('http://13.211.240.55/api/createLab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newLab.name,
          description: newLab.description,
          sensors: newLab.sensors,
          company: newLab.company
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '創建實驗室失敗');
      }

      alert('實驗室創建成功！');
      setNewLab({ name: '', description: '', sensors: [], company: '' });
      setShowAddLabModal(false);
      fetchLabs(); // 重新獲取實驗室列表
    } catch (err) {
      alert(err instanceof Error ? err.message : '創建實驗室失敗');
      console.error('創建實驗室失敗:', err);
    }
  };

  // 編輯實驗室
  const handleEditLab = (lab: Laboratory) => {
    setEditingLab({...lab});
    setShowEditLabModal(true);
  };

  // 保存編輯
  const handleSaveEditLab = async () => {
    if (!editingLab || !editingLab.name || !editingLab.description || !editingLab.company) {
      alert('請填寫實驗室名稱、描述和公司');
      return;
    }
    
    try {
      const response = await fetch('http://13.211.240.55/api/modifyLab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: editingLab.id,
          name: editingLab.name,
          description: editingLab.description,
          sensors: editingLab.sensors,
          company: editingLab.company
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '修改實驗室失敗');
      }

      alert('實驗室修改成功！');
      setShowEditLabModal(false);
      setEditingLab(null);
      fetchLabs(); // 重新獲取實驗室列表
    } catch (err) {
      alert(err instanceof Error ? err.message : '修改實驗室失敗');
      console.error('修改實驗室失敗:', err);
    }
  };

  // 刪除實驗室
  const deleteLab = (labId: string) => {
    if (window.confirm('確定要刪除此實驗室嗎？這將同時刪除所有相關的感測器。')) {
      // 注意：後端API文檔中沒有刪除實驗室的API，這裡只是從前端狀態中移除
      setLaboratories(laboratories.filter(lab => lab.id !== labId));
    }
  };

  // 管理感測器
  const manageSensors = (lab: Laboratory) => {
    setManagingSensorsLab(lab);
    setShowSensorModal(true);
  };

  // 新增感測器
  const handleAddSensor = async () => {
    if (!newSensor.name || !newSensor.description || !newSensor.company || !managingSensorsLab) {
      alert('請填寫感測器名稱、描述和公司');
      return;
    }
    
    try {
      const sensorToAdd = {
        ...newSensor,
        lab: managingSensorsLab.name
      };

      // 更新實驗室，添加新感測器
      const updatedLab = {
        ...managingSensorsLab,
        sensors: [...managingSensorsLab.sensors, sensorToAdd]
      };

      const response = await fetch('http://13.211.240.55/api/modifyLab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: updatedLab.id,
          name: updatedLab.name,
          description: updatedLab.description,
          sensors: updatedLab.sensors,
          company: updatedLab.company
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '添加感測器失敗');
      }

      alert('感測器添加成功！');
      setNewSensor({ name: '', description: '', company: '', lab: '' });
      fetchLabs(); // 重新獲取實驗室列表
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加感測器失敗');
      console.error('添加感測器失敗:', err);
    }
  };

  // 刪除感測器
  const deleteSensor = async (sensorIndex: number) => {
    if (!managingSensorsLab) return;
    
    if (window.confirm('確定要刪除此感測器嗎？')) {
      try {
        const updatedSensors = managingSensorsLab.sensors.filter((_, index) => index !== sensorIndex);
        const updatedLab = {
          ...managingSensorsLab,
          sensors: updatedSensors
        };

        const response = await fetch('http://13.211.240.55/api/modifyLab', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            id: updatedLab.id,
            name: updatedLab.name,
            description: updatedLab.description,
            sensors: updatedLab.sensors,
            company: updatedLab.company
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '刪除感測器失敗');
        }

        alert('感測器刪除成功！');
        fetchLabs(); // 重新獲取實驗室列表
      } catch (err) {
        alert(err instanceof Error ? err.message : '刪除感測器失敗');
        console.error('刪除感測器失敗:', err);
      }
    }
  };

  // 感測器類型改變時自動設置單位
  const handleSensorTypeChange = (type: string) => {
    const selectedType = sensorTypes.find(t => t.value === type);
    setNewSensor({
      ...newSensor,
      name: selectedType ? selectedType.label + '感測器' : newSensor.name
    });
  };

  // 顯示加載狀態
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">載入中...</div>
        </div>
      </div>
    );
  }

  // 顯示錯誤狀態
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={fetchLabs}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">實驗室管理</h1>
        <p className="text-gray-600">管理實驗室資訊和感測器設備</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總實驗室數</p>
              <p className="text-2xl font-bold text-gray-900">
                {laboratories.length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✅</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總感測器數</p>
              <p className="text-2xl font-bold text-gray-900">
                {laboratories.reduce((total, lab) => total + lab.sensors.length, 0)}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold">📡</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均感測器數</p>
              <p className="text-2xl font-bold text-gray-900">
                {laboratories.length > 0 
                  ? Math.round(laboratories.reduce((total, lab) => total + lab.sensors.length, 0) / laboratories.length)
                  : 0
                }
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">⚡</span>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和篩選 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="搜索實驗室名稱或位置..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* 篩選器 */}
          <div className="flex gap-2">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有狀態</option>
              <option value="active">運行中</option>
              <option value="inactive">停用</option>
            </select>
          </div>
          
          {/* 新增實驗室按鈕 */}
          <button
            onClick={() => setShowAddLabModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>➕</span>
            新增實驗室
          </button>
        </div>
      </div>

      {/* 實驗室列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLabs.map((lab) => (
          <div key={lab.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{lab.name}</h3>
                  <p className="text-sm text-gray-500">📍 {lab.description}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {lab.company}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{lab.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">感測器數量：</span>
                  <span className="font-medium">{lab.sensors.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">公司：</span>
                  <span className="font-medium">{lab.company}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditLab(lab)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  ✏️ 編輯
                </button>
                <button
                  onClick={() => manageSensors(lab)}
                  className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  📡 感測器
                </button>
                <button
                  onClick={() => deleteLab(lab.id)}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 新增實驗室模態框 */}
      {showAddLabModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">新增實驗室</h3>
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    實驗室名稱 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newLab.name}
                    onChange={(e) => setNewLab({...newLab, name: e.target.value})}
                    placeholder="請輸入實驗室名稱"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述 *
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={newLab.description}
                    onChange={(e) => setNewLab({...newLab, description: e.target.value})}
                    placeholder="實驗室用途描述..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公司 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newLab.company}
                    onChange={(e) => setNewLab({...newLab, company: e.target.value})}
                    placeholder="例如：公司A"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddLabModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddLab}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  新增
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編輯實驗室模態框 */}
      {showEditLabModal && editingLab && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">編輯實驗室</h3>
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    實驗室名稱 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingLab.name}
                    onChange={(e) => setEditingLab({...editingLab, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述 *
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={editingLab.description}
                    onChange={(e) => setEditingLab({...editingLab, description: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公司 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingLab.company}
                    onChange={(e) => setEditingLab({...editingLab, company: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {setShowEditLabModal(false); setEditingLab(null);}}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditLab}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 感測器管理模態框 */}
      {showSensorModal && managingSensorsLab && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                管理感測器 - {managingSensorsLab.name}
              </h3>
              <button
                onClick={() => {setShowSensorModal(false); setManagingSensorsLab(null);}}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* 新增感測器表單 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-3">新增感測器</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="感測器名稱"
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newSensor.name}
                  onChange={(e) => setNewSensor({...newSensor, name: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="感測器描述"
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newSensor.description}
                  onChange={(e) => setNewSensor({...newSensor, description: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="公司"
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newSensor.company}
                  onChange={(e) => setNewSensor({...newSensor, company: e.target.value})}
                />
                <button
                  onClick={handleAddSensor}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  ➕ 新增
                </button>
              </div>
            </div>

            {/* 感測器列表 */}
            <div className="space-y-3">
              <h4 className="font-medium">目前感測器 ({managingSensorsLab.sensors.length})</h4>
              {managingSensorsLab.sensors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">此實驗室尚未設置感測器</p>
              ) : (
                <div className="space-y-2">
                  {managingSensorsLab.sensors.map((sensor, index) => (
                    <div key={`${sensor.name}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{sensor.name}</div>
                        <div className="text-sm text-gray-500">
                          描述: {sensor.description} | 公司: {sensor.company}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteSensor(index)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {setShowSensorModal(false); setManagingSensorsLab(null);}}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryManagement;