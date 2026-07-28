// File: src/pages/ForeignSellersPage.jsx
// Danh sách "Bên bán nước ngoài" (nhà máy Trung Quốc...) — lưu sẵn thông tin công ty + ngân hàng
// để chọn nhanh khi tạo Sales Contract, KHÔNG liên quan tới "sellers" (Công ty Bên Bán = chính CTS,
// dùng cho HĐNT/ĐĐH/BBBG). Lưu dạng key-value (giống "sellers"), không cần bảng Supabase riêng.
import { useState } from 'react';
import { genForeignSellerId } from '../helpers';

const blankForm = () => ({
  companyName: '', address: '', representative: '', position: 'Director',
  bankName: '', bankAddress: '', swiftCode: '', accountNumber: '', beneficiary: '',
});

const Field = ({ label, children, cols }) => (
  <div className={cols === 2 ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);
const inCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300';

const ForeignSellerForm = ({ init, onSave, onCancel }) => {
  const [form, setForm] = useState(init ? { ...blankForm(), ...init } : blankForm());
  const upd = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tên công ty (Seller)" cols={2}>
          <input className={inCls} value={form.companyName} onChange={upd('companyName')} placeholder="GUANGXI JINCHEN IMPORT AND EXPORT TRADE CO., LTD" />
        </Field>
        <Field label="Địa chỉ" cols={2}>
          <input className={inCls} value={form.address} onChange={upd('address')} />
        </Field>
        <Field label="Người đại diện">
          <input className={inCls} value={form.representative} onChange={upd('representative')} />
        </Field>
        <Field label="Chức vụ">
          <input className={inCls} value={form.position} onChange={upd('position')} />
        </Field>
        <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Thông tin ngân hàng</label>
        </div>
        <Field label="Tên ngân hàng" cols={2}>
          <input className={inCls} value={form.bankName} onChange={upd('bankName')} placeholder="INDUSTRIAL AND COMMERCIAL BANK OF CHINA" />
        </Field>
        <Field label="Địa chỉ ngân hàng" cols={2}>
          <input className={inCls} value={form.bankAddress} onChange={upd('bankAddress')} placeholder="NO.5 XINHUA ROAD, PINGXIANG CITY, GUANGXI, CHINA" />
        </Field>
        <Field label="Swift code">
          <input className={inCls} value={form.swiftCode} onChange={upd('swiftCode')} placeholder="ICBKCNBJGSI" />
        </Field>
        <Field label="Số tài khoản">
          <input className={inCls} value={form.accountNumber} onChange={upd('accountNumber')} />
        </Field>
        <Field label="Người thụ hưởng (Beneficiary)" cols={2}>
          <input className={inCls} value={form.beneficiary} onChange={upd('beneficiary')} placeholder="Thường trùng tên công ty ở trên" />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => { if (!form.companyName.trim()) return alert('Tên công ty không được để trống'); onSave(form); }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >Lưu</button>
        <button onClick={onCancel} className="bg-gray-100 px-5 py-2 rounded-lg hover:bg-gray-200 text-sm">Hủy</button>
      </div>
    </div>
  );
};

export const ForeignSellersPage = ({ foreignSellers, onSave, onDelete }) => {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);

  const filtered = Object.entries(foreignSellers).filter(([id, s]) =>
    !search || s.companyName?.toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (form) => {
    const id = genForeignSellerId(foreignSellers);
    await onSave(id, form);
    setShowAdd(false);
  };
  const handleEdit = async (form) => {
    await onSave(editId, form);
    setEditId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏭 Bên bán nước ngoài</h1>
        <button onClick={() => { setShowAdd(true); setEditId(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Thêm nhà máy / Seller</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Danh sách nhà máy/công ty Trung Quốc dùng làm <strong>Seller</strong> khi tạo Sales Contract — lưu sẵn tên, địa chỉ, người đại diện
        và thông tin ngân hàng để chọn nhanh, khỏi phải gõ lại mỗi lần. Đây là dữ liệu <strong>riêng</strong>, khác với "Công ty Bên Bán" (chính CTS).
      </p>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên hoặc mã..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-4">Thêm nhà máy / Seller mới</h2>
          <ForeignSellerForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có nhà máy/Seller nào. Hãy thêm mới!</div>
        ) : (
          filtered.map(([id, s]) => (
            <div key={id}>
              {editId === id ? (
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-semibold text-gray-700 mb-4">Sửa: {s.companyName}</h2>
                  <ForeignSellerForm init={s} onSave={handleEdit} onCancel={() => setEditId(null)} />
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.companyName}</p>
                    <p className="text-xs text-gray-500 truncate">{s.address}</p>
                    <p className="text-xs text-gray-400">{s.bankName}{s.swiftCode ? ` · Swift: ${s.swiftCode}` : ''}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => { setEditId(id); setShowAdd(false); }} className="text-amber-600 hover:underline text-xs">Sửa</button>
                    <button onClick={() => { if (confirm(`Xóa "${s.companyName}"? Thao tác không thể hoàn tác.`)) onDelete(id); }} className="text-red-500 hover:underline text-xs">Xóa</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
