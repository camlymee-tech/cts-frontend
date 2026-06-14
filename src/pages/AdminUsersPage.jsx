// File: src/pages/AdminUsersPage.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const AdminUsersPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [edits, setEdits] = useState({}); // { [id]: { ma_sale, role } }

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.adminListProfiles();
      setProfiles(data);
      const e = {};
      data.forEach(p => { e[p.id] = { ma_sale: p.ma_sale || '', role: p.role }; });
      setEdits(e);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setEdit = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const save = async (id) => {
    setSavingId(id);
    setError('');
    try {
      const { ma_sale, role } = edits[id];
      const updated = await api.updateProfile(id, { ma_sale: ma_sale || null, role });
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, ma_sale: updated.ma_sale, role: updated.role } : p));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="text-gray-400">Đang tải danh sách tài khoản...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">👤 Quản lý tài khoản</h1>
        <button onClick={load} className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">🔄 Tải lại</button>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">
        Nhân viên sale tự bấm <b>"Đăng ký"</b> ở trang đăng nhập để tạo tài khoản. Sau đó chị gán <b>Mã sale</b> và <b>Vai trò</b> cho từng người ở đây.
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Họ tên</th>
              <th className="text-left px-4 py-2.5">Email</th>
              <th className="text-left px-4 py-2.5">Mã sale</th>
              <th className="text-left px-4 py-2.5">Vai trò</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map(p => (
              <tr key={p.id}>
                <td className="px-4 py-2.5">{p.full_name || <span className="text-gray-400">(chưa có tên)</span>}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.email}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={edits[p.id]?.ma_sale || ''}
                    onChange={e => setEdit(p.id, 'ma_sale', e.target.value)}
                    placeholder="VD: S01"
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={edits[p.id]?.role || 'sale'}
                    onChange={e => setEdit(p.id, 'role', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="sale">Sale</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => save(p.id)}
                    disabled={savingId === p.id}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingId === p.id ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {profiles.length === 0 && (
          <div className="text-center text-gray-400 py-8">Chưa có tài khoản nào đăng ký.</div>
        )}
      </div>
    </div>
  );
};
