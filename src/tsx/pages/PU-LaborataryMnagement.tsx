import React, { useState } from 'react';

const PU_LaborataryMnagement = () => {
  const [laboratories, setLaboratories] = useState([
    {
      id: 1,
      name: '生化實驗室',
      location: 'A棟 3樓',
      status: 'active',
      description: '主要進行生物化學相關實驗',
      createdAt: '2024-01-15',
      sensors: [
        { id: 1, name: '溫度感測器', type: 'temperature', unit: '°C', status: 'active' },
        { id: 2, name: '濕度感測器', type: 'humidity', unit: '%', status: 'active' },
        { id: 3, name: 'pH感測器', type: 'ph', unit: 'pH', status: 'inactive' }
      ]
    },
    {
      id: 2,
      name: '物理實驗室',
      location: 'B棟 2樓',
      status: 'active',
      description: '物理實驗和測量設備',
      createdAt: '2024-02-20',
      sensors: [
        { id: 4, name: '壓力感測器', type: 'pressure', unit: 'Pa', status: 'active' },
        { id: 5, name: '光照感測器', type: 'light', unit: 'lux', status: 'active' }
      ]
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [showEditLabModal, setShowEditLabModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [managingSensorsLab, setManagingSensorsLab] = useState(null);

  // 新增實驗室表單
  const [newLab, setNewLab] = useState({
    name: '',
    location: '',
    status: 'active',
    description: ''
  });

  // 新增感測器表單
  const [newSensor, setNewSensor] = useState({
    name: '',
    type: 'temperature',
    unit: '',
    status: 'active'
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

  // 篩選實驗室
  const filteredLabs = laboratories.filter(lab => {
    const matchesSearch = lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lab.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lab.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 新增實驗室
  const handleAddLab = () => {
    if (!newLab.name || !newLab.location) {
      alert('請填寫實驗室名稱和位置');
      return;
    }
    
    const newId = Math.max(...laboratories.map(l => l.id)) + 1;
    const labToAdd = {
      ...newLab,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      sensors: []
    };
    setLaboratories([...laboratories, labToAdd]);
    setNewLab({ name: '', location: '', status: 'active', description: '' });
    setShowAddLabModal(false);
  };

  // 編輯實驗室
  const handleEditLab = (lab) => {
    setEditingLab({...lab});
    setShowEditLabModal(true);
  };

  // 保存編輯
  const handleSaveEditLab = () => {
    if (!editingLab.name || !editingLab.location) {
      alert('請填寫實驗室名稱和位置');
      return;
    }
    
    setLaboratories(laboratories.map(lab => 
      lab.id === editingLab.id ? editingLab : lab
    ));
    setShowEditLabModal(false);
    setEditingLab(null);
  };

  // 刪除實驗室
  const deleteLab = (labId) => {
    if (window.confirm('確定要刪除此實驗室嗎？這將同時刪除所有相關的感測器。')) {
      setLaboratories(laboratories.filter(lab => lab.id !== labId));
    }
  };

  // 管理感測器
  const manageSensors = (lab) => {
    setManagingSensorsLab(lab);
    setShowSensorModal(true);
  };

  // 新增感測器
  const handleAddSensor = () => {
    if (!newSensor.name || !newSensor.unit) {
      alert('請填寫感測器名稱和單位');
      return;
    }
    
    const existingSensorIds = managingSensorsLab.sensors.map(s => s.id);
    const newId = existingSensorIds.length > 0 ? Math.max(...existingSensorIds) + 1 : 1;
    
    const sensorToAdd = {
      ...newSensor,
      id: newId
    };
    
    const updatedLab = {
      ...managingSensorsLab,
      sensors: [...managingSensorsLab.sensors, sensorToAdd]
    };
    
    setLaboratories(laboratories.map(lab => 
      lab.id === managingSensorsLab.id ? updatedLab : lab
    ));
    
    setManagingSensorsLab(updatedLab);
    setNewSensor({ name: '', type: 'temperature', unit: '', status: 'active' });
  };

  // 刪除感測器
  const deleteSensor = (sensorId) => {
    if (window.confirm('確定要刪除此感測器嗎？')) {
      const updatedLab = {
        ...managingSensorsLab,
        sensors: managingSensorsLab.sensors.filter(sensor => sensor.id !== sensorId)
      };
      
      setLaboratories(laboratories.map(lab => 
        lab.id === managingSensorsLab.id ? updatedLab : lab
      ));
      
      setManagingSensorsLab(updatedLab);
    }
  };

  // 切換感測器狀態
  const toggleSensorStatus = (sensorId) => {
    const updatedLab = {
      ...managingSensorsLab,
      sensors: managingSensorsLab.sensors.map(sensor =>
        sensor.id === sensorId 
          ? { ...sensor, status: sensor.status === 'active' ? 'inactive' : 'active' }
          : sensor
      )
    };
    
    setLaboratories(laboratories.map(lab => 
      lab.id === managingSensorsLab.id ? updatedLab : lab
    ));
    
    setManagingSensorsLab(updatedLab);
  };

  // 感測器類型改變時自動設置單位
  const handleSensorTypeChange = (type) => {
    const selectedType = sensorTypes.find(t => t.value === type);
    setNewSensor({
      ...newSensor,
      type: type,
      unit: selectedType ? selectedType.defaultUnit : ''
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">實驗室管理</h1>
        <p className="text-gray-600">管理實驗室資訊和感測器設備</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總實驗室數</p>
              <p className="text-2xl font-bold text-gray-900">{laboratories.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">🏢</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">運行中</p>
              <p className="text-2xl font-bold text-gray-900">
                {laboratories.filter(l => l.status === 'active').length}
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
              <p className="text-sm text-gray-600">啟用感測器</p>
              <p className="text-2xl font-bold text-gray-900">
                {laboratories.reduce((total, lab) => 
                  total + lab.sensors.filter(s => s.status === 'active').length, 0
                )}
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
                  <p className="text-sm text-gray-500">📍 {lab.location}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  lab.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {lab.status === 'active' ? '運行中' : '停用'}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{lab.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">感測器數量：</span>
                  <span className="font-medium">{lab.sensors.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">啟用感測器：</span>
                  <span className="font-medium text-green-600">
                    {lab.sensors.filter(s => s.status === 'active').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">創建日期：</span>
                  <span className="font-medium">{lab.createdAt}</span>
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
                    位置 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newLab.location}
                    onChange={(e) => setNewLab({...newLab, location: e.target.value})}
                    placeholder="例如：A棟 3樓"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    狀態
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newLab.status}
                    onChange={(e) => setNewLab({...newLab, status: e.target.value})}
                  >
                    <option value="active">運行中</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    value={newLab.description}
                    onChange={(e) => setNewLab({...newLab, description: e.target.value})}
                    placeholder="實驗室用途描述..."
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
                    位置 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingLab.location}
                    onChange={(e) => setEditingLab({...editingLab, location: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    狀態
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingLab.status}
                    onChange={(e) => setEditingLab({...editingLab, status: e.target.value})}
                  >
                    <option value="active">運行中</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    value={editingLab.description}
                    onChange={(e) => setEditingLab({...editingLab, description: e.target.value})}
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
                <select
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newSensor.type}
                  onChange={(e) => handleSensorTypeChange(e.target.value)}
                >
                  {sensorTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="單位"
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newSensor.unit}
                  onChange={(e) => setNewSensor({...newSensor, unit: e.target.value})}
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
                  {managingSensorsLab.sensors.map((sensor) => (
                    <div key={sensor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{sensor.name}</div>
                        <div className="text-sm text-gray-500">
                          類型: {sensorTypes.find(t => t.value === sensor.type)?.label} | 
                          單位: {sensor.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          sensor.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {sensor.status === 'active' ? '啟用' : '停用'}
                        </span>
                        <button
                          onClick={() => toggleSensorStatus(sensor.id)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          切換
                        </button>
                        <button
                          onClick={() => deleteSensor(sensor.id)}
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

export default PU_LaborataryMnagement;