import React, { useState } from 'react';
import { manageCompany } from '../services/api';

const ManageCompany: React.FC = () => {
  const [company, setCompany] = useState('');
  const [extraAuth, setExtraAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) {
      setMessage('請輸入公司名稱');
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const res = await manageCompany({ company, extra_auth: extraAuth });
      setMessage(res.message || '已送出');
    } catch (err: any) {
      setMessage(err?.message || '送出失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">公司管理</h1>
      {message && (
        <div className="mb-4 p-3 rounded border bg-gray-50 text-gray-700">{message}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公司</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="例如：NCCU"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="extraAuth"
            type="checkbox"
            className="h-4 w-4"
            checked={extraAuth}
            onChange={(e) => setExtraAuth(e.target.checked)}
          />
          <label htmlFor="extraAuth" className="text-sm text-gray-700 select-none">extra_auth（布林值）</label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? '送出中...' : '送出'}
        </button>
      </form>
    </div>
  );
};

export default ManageCompany;


