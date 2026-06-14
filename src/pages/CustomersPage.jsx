// File: src/pages/CustomersPage.jsx
import { useState } from 'react';
import { Badge } from '../components/Badge';
import { CustomerForm } from './CustomerForm';

export const CustomersPage = ({ customers, departments = {}, onSave, onDelete }) => {
  const [search, setSearch] = useState('');
  const [saleFilter, setSaleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newCode, setNewCode] = useState('');

  const deptName = (cid) => departments[cid]?.name || '';

  const filtered = Object.entries(customers).filter(([id, c]) => {
    const matchSearch = !search || c.companyName?.toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase());
    const sf = saleFilter.trim().toLowerCase();
    const matchSale = !sf || (c.assignedSale?.code || '').toLowerCase().includes(sf) || (c.assignedSale?.name || '').toLowerCase().includes(sf);
    const matchDept = !deptFilter || c.departmentId === deptFilter;
    return matchSearch && matchSale && matchDept;
  });

  const handleAdd = async (form) => {
    const code = newCode.trim();
    if (!code) return alert('Vui lòng nhập mã khách hàng');
    if (customers[code]) return alert('Mã khách hàng đã tồn tại');
    await onSave(code, { customerId: code, ...form });
    setShowAdd(false); setNewCode('');
  };

  const handleEdit = async (form) => {
    await onSave(editId, { ...customers[editId], ...form });
    setEditId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👥 Khách hàng</h1>
        <button onClick={() => { setShowAdd(true); setEditId(null); setNewCode(''); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Thêm khách hàng</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên hoặc mã KH..."
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input value={saleFilter} onChange={e => setSaleFilter(e.target.value)} placeholder="Lọc theo Mã / Tên Sale..."
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tất cả phòng ban</option>
          {Object.entries(departments).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}
        </select>
        {(saleFilter || deptFilter) && (
          <button onClick={() => { setSaleFilter(''); setDeptFilter(''); }} className="text-sm text-gray-500 hover:text-gray-700 px-2">✕ Xóa lọc</button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-4">Thêm khách hàng mới</h2>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Mã khách hàng <span className="text-red-500 ml-0.5">*</span></label>
            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="VD: KH001, ABC, HKD-Nam..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <p className="text-xs text-gray-400 mt-1">Tự nhập theo ý muốn, không được trùng mã đã có.</p>
          </div>
          <CustomerForm companyLabel="Tên công ty / HKD" withAssignment departments={departments} onSave={handleAdd} onCancel={() => { setShowAdd(false); setNewCode(''); }} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Không có khách hàng nào</div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-5 py-3">Mã KH</th>
              <th className="text-left px-5 py-3">Tên công ty / HKD</th>
              <th className="text-left px-5 py-3">Người đại diện</th>
              <th className="text-left px-5 py-3">Mã Sale</th>
              <th className="text-left px-5 py-3">Tên Sale</th>
              <th className="text-left px-5 py-3">Phòng ban</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map(([id, c]) => (
                editId === id ? (
                  <tr key={id}><td colSpan="7" className="p-5 bg-blue-50/30 border-t border-gray-100">
                    <div className="text-sm font-medium text-blue-700 mb-3">{id}</div>
                    <CustomerForm companyLabel="Tên công ty / HKD" withAssignment departments={departments} init={c} onSave={handleEdit} onCancel={() => setEditId(null)} />
                  </td></tr>
                ) : (
                  <tr key={id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{id}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{c.companyName}</td>
                    <td className="px-5 py-3 text-gray-600">{c.representative || '–'}</td>
                    <td className="px-5 py-3 text-gray-600 font-mono">{c.assignedSale?.code || '–'}</td>
                    <td className="px-5 py-3 text-gray-600">{c.assignedSale?.name || '–'}</td>
                    <td className="px-5 py-3">{deptName(c.departmentId) ? <Badge color="blue">{deptName(c.departmentId)}</Badge> : <span className="text-gray-400">–</span>}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <button onClick={() => { setEditId(id); setShowAdd(false); }} className="text-blue-600 hover:text-blue-800 mr-3">Sửa</button>
                      <button onClick={() => onDelete(id)} className="text-red-500 hover:text-red-700">Xóa</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
