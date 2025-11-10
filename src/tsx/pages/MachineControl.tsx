import React, { useState, useEffect } from 'react';
import { Power, PowerOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { machineOn, machineOff } from '../services/api';

const MachineControl: React.FC = () => {
  const [company, setCompany] = useState<string>('');
  const [machine, setMachine] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [machineStatus, setMachineStatus] = useState<'unknown' | 'on' | 'off'>('unknown');

  // 從 localStorage 獲取公司信息
  useEffect(() => {
    const storedCompany = localStorage.getItem('company') || localStorage.getItem('company_name') || '';
    setCompany(storedCompany);
    
    // 如果有預設的機器名稱，可以從其他地方獲取
    // 這裡暫時使用空字符串，讓用戶輸入
  }, []);

  // 開啟機器
  const handleTurnOn = async () => {
    if (!company || !machine) {
      setMessage('請輸入公司名稱和機器名稱');
      setMessageType('error');
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);
      const response = await machineOn({ company, machine });
      setMessage('機器已開啟');
      setMessageType('success');
      setMachineStatus('on');
      console.log('機器開啟響應:', response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '開啟機器失敗';
      setMessage(errorMessage);
      setMessageType('error');
      console.error('開啟機器失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 關閉機器
  const handleTurnOff = async () => {
    if (!company || !machine) {
      setMessage('請輸入公司名稱和機器名稱');
      setMessageType('error');
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);
      const response = await machineOff({ company, machine });
      setMessage('機器已關閉');
      setMessageType('success');
      setMachineStatus('off');
      console.log('機器關閉響應:', response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '關閉機器失敗';
      setMessage(errorMessage);
      setMessageType('error');
      console.error('關閉機器失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除消息
  const clearMessage = () => {
    setMessage(null);
    setMessageType('info');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">機器控制</h1>

      {message && (
        <div className={`mb-4 p-3 rounded border flex items-center gap-2 ${
          messageType === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : messageType === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : messageType === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : null}
          <span>{message}</span>
          <button
            onClick={clearMessage}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              公司名稱
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="例如：NCCU"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              機器名稱
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              placeholder="例如：aq"
            />
          </div>

          {machineStatus !== 'unknown' && (
            <div className="p-3 rounded bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">機器狀態：</span>
                <span className={`text-sm font-semibold ${
                  machineStatus === 'on' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {machineStatus === 'on' ? '開啟' : '關閉'}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleTurnOn}
              disabled={isLoading || !company || !machine}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Power className="w-5 h-5" />
              )}
              開啟機器
            </button>

            <button
              onClick={handleTurnOff}
              disabled={isLoading || !company || !machine}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <PowerOff className="w-5 h-5" />
              )}
              關閉機器
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">使用說明</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>請輸入正確的公司名稱和機器名稱</li>
          <li>需要具有 <code className="bg-blue-100 px-1 rounded">control_machine</code> 權限才能使用此功能</li>
          <li>機器狀態會根據操作結果自動更新</li>
        </ul>
      </div>
    </div>
  );
};

export default MachineControl;

