// File: src/pages/ChooseDepartmentPage.jsx
import { useState } from 'react';
import { api } from '../lib/api';

export const ChooseDepartmentPage = ({ profile, departments, onDone }) => {
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!departmentId) return setError('Vui lòng chọn phòng ban');
    setLoading(true);
    setError('');
    try {
      const updated = await api.updateProfile(profile.id, { department_id: departmentId });
      onDone(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🏢</div>
          <h1 className="text-xl font-bold text-gray-800">Chọn phòng ban</h1>
          <p className="text-gray-500 text-sm mt-1">Chọn phòng ban của bạn để tiếp tục sử dụng CTS Contracts</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">-- Chọn phòng ban --</option>
            {Object.entries(departments).map(([id, d]) => (
              <option key={id} value={id}>{d.name}</option>
            ))}
          </select>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading ? 'Đang lưu...' : 'Tiếp tục'}
          </button>
        </form>
      </div>
    </div>
  );
};
