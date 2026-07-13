// File: src/pages/SellersPage.jsx
import { useState } from 'react';
import { Badge } from '../components/Badge';
import { CustomerForm } from './CustomerForm';
import { genSellerId } from '../helpers';

// Format ngày từ YYYY-MM-DD → DD/MM/YY, nếu không phải ISO date thì hiện nguyên (backward compat)
const fmtSellerDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (!isNaN(d.getTime()) && val.includes('-')) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
  return val; // fallback: hiện nguyên dữ liệu cũ (vd: "07/25")
};

export const SellersPage = ({ sellers, onSave, onDelete }) => {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);

  const filtered = Object.entries(sellers).filter(([id, s]) =>
    !search || s.companyName?.toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (form) => {
    const id = genSellerId(sellers);
    await onSave(id, { sellerId: id, ...form });
    setShowAdd(false);
  };

  const handleEdit = async (form) => {
    await onSave(editId, { ...sellers[editId], ...form });
    setEditId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏢 Công ty Bên Bán</h1>
        <button onClick={() => { setShowAdd(true); setEditId(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Thêm công ty bên bán</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên hoặc mã công ty..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-4">Thêm công ty bên bán mới</h2>
          <CustomerForm withShortName onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có công ty bên bán nào. Hãy thêm mới!</div>
        ) : filtered.map(([id, s]) => (
          <div key={id} className="border-b border-gray-100 last:border-0">
            {editId === id ? (
              <div className="p-5">
                <div className="text-sm font-medium text-blue-700 mb-3">{id}</div>
                <CustomerForm withShortName init={s} onSave={handleEdit} onCancel={() => setEditId(null)} />
              </div>
            ) : (
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                <div>
                  <span className="font-mono font-bold text-blue-600 text-sm">{id}</span>
                  {s.shortName && <span className="ml-2"><Badge color="purple">{fmtSellerDate(s.shortName)}</Badge></span>}
                  <span className="mx-2 text-gray-300">│</span>
                  <span className="font-medium text-gray-800">{s.companyName}</span>
                  {s.representative && <span className="text-gray-400 text-sm ml-2">• {s.representative}{s.position ? ` (${s.position})` : ''}</span>}
                  {s.taxCode && <span className="text-gray-400 text-sm ml-2">• MST: {s.taxCode}</span>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => { setEditId(id); setShowAdd(false); }} className="text-blue-600 hover:text-blue-800">Sửa</button>
                  <button onClick={() => onDelete(id)} className="text-red-500 hover:text-red-700">Xóa</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
