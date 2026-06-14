// File: src/pages/DepartmentsManager.jsx
import { useState } from 'react';
import { genDeptId } from '../helpers';

export const DepartmentsManager = ({ departments, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = genDeptId(departments);
    onSave(id, { departmentId: id, name: n });
    setName('');
  };

  const saveEdit = (id) => {
    const n = editName.trim();
    if (!n) return;
    onSave(id, { ...departments[id], name: n });
    setEditId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">🗂️ Phòng ban</h2>
      <p className="text-sm text-gray-500 mb-4">Danh sách phòng ban dùng cho dropdown khi thêm/sửa khách hàng.</p>
      <div className="flex gap-2 mb-4">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Tên phòng ban mới (VD: Phòng Sale 1, Phòng Dự án...)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <button onClick={add} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Thêm</button>
      </div>
      {Object.keys(departments).length === 0 ? (
        <div className="text-center text-gray-400 py-6 text-sm">Chưa có phòng ban nào.</div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {Object.entries(departments).map(([id, d]) => (
            <div key={id} className="flex items-center justify-between px-4 py-2.5">
              {editId === id ? (
                <div className="flex gap-2 flex-1">
                  <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit(id)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <button onClick={() => saveEdit(id)} className="text-green-600 hover:text-green-800 text-sm font-medium">Lưu</button>
                  <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-gray-700 text-sm">Hủy</button>
                </div>
              ) : (
                <>
                  <div><span className="font-mono text-xs text-gray-400 mr-2">{id}</span><span className="font-medium text-gray-800">{d.name}</span></div>
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => { setEditId(id); setEditName(d.name); }} className="text-blue-600 hover:text-blue-800">Sửa</button>
                    <button onClick={() => onDelete(id)} className="text-red-500 hover:text-red-700">Xóa</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
