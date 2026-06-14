// File: src/pages/ApiKeyManager.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const ApiKeyManager = () => {
  const [inputKey, setInputKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const k = await api.get('api_key', true);
      setSavedKey(k || '');
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const k = inputKey.trim();
    if (!k) return alert('Vui lòng nhập API Key');
    await api.set('api_key', k, true);
    setSavedKey(k);
    setInputKey('');
  };

  const remove = async () => {
    if (!confirm('Xóa API Key? Tính năng AI đọc hóa đơn VAT sẽ không hoạt động.')) return;
    await api.del('api_key', true);
    setSavedKey('');
  };

  const masked = savedKey ? savedKey.slice(0, 10) + '***' : '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">🔑 Cài đặt API Key <span className="text-sm font-normal text-gray-400">(Admin)</span></h2>
      <p className="text-sm text-gray-500 mb-4">API Key dùng chung cho tất cả người dùng — lưu vào shared storage. Chỉ người biết key mới nhập được.</p>
      {loading ? <div className="text-gray-400 text-sm">Đang tải...</div> : (
        <>
          <div className="mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${savedKey ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {savedKey ? `✓ Đã cài đặt: ${masked}` : '✗ Chưa có API Key'}
            </span>
          </div>
          <div className="flex gap-2">
            <input type="password" value={inputKey} onChange={e => setInputKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="Nhập API Key mới (sk-ant-...)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">Lưu</button>
            {savedKey && (
              <button onClick={remove} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 text-sm">Xóa</button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
