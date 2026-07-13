// File: src/pages/CustomerForm.jsx
import { useState } from 'react';
import { Field } from '../components/Field';
import { Select } from '../components/Select';
import { SaleSearchDropdown } from '../components/SaleSearchDropdown';
import { normalizeText } from '../utils/customerExcel';

// Với khách hàng cũ chưa gắn accountId (dữ liệu nhập trước khi có dropdown), tự đối chiếu
// theo mã/tên sale đã lưu để điền sẵn — người dùng không cần chọn lại thủ công.
const resolveAssignedSale = (assignedSale, saleProfiles) => {
  const blank = { code: '', name: '', accountId: '' };
  if (!assignedSale) return blank;
  if (assignedSale.accountId) return assignedSale; // đã khớp sẵn, giữ nguyên
  const match = saleProfiles.find((p) =>
    (assignedSale.code && p.ma_sale && normalizeText(p.ma_sale) === normalizeText(assignedSale.code)) ||
    (assignedSale.name && p.name && normalizeText(p.name) === normalizeText(assignedSale.name))
  );
  if (match) return { code: match.ma_sale || '', name: match.name || '', accountId: match.uuid };
  return assignedSale; // không tìm thấy khớp, giữ nguyên dữ liệu cũ để không mất thông tin
};

export const CustomerForm = ({ init, onSave, onCancel, companyLabel = 'Tên công ty', withAssignment = false, withShortName = false, departments = {}, saleProfiles = [] }) => {
  const blank = {
    companyName: '', address: '', taxCode: '', phone: '', email: '',
    bankAccount: '', bankName: '', representative: '', position: '',
    ...(withShortName ? { shortName: '' } : {}),
    ...(withAssignment ? { assignedSale: { code: '', name: '', accountId: '' }, departmentId: '' } : {}),
  };
  const initialForm = init
    ? { ...init, ...(withAssignment ? { assignedSale: resolveAssignedSale(init.assignedSale, saleProfiles) } : {}) }
    : blank;
  const [form, setForm] = useState(initialForm);
  const upd = (f) => (v) => setForm(p => ({ ...p, [f]: v }));
  const selectSale = (uuid) => {
    const p = saleProfiles.find(sp => sp.uuid === uuid);
    if (!p) return;
    setForm(prev => ({ ...prev, assignedSale: { code: p.ma_sale || '', name: p.name || '', accountId: p.uuid } }));
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={companyLabel} value={form.companyName} onChange={upd('companyName')} cols={2} required />
        {withShortName && (
          <Field label="Ngày ký / Ngày hiệu lực" value={form.shortName} onChange={upd('shortName')} type="date" />
        )}
        <Field label="Địa chỉ" value={form.address} onChange={upd('address')} cols={2} />
        <Field label="Mã số thuế" value={form.taxCode} onChange={upd('taxCode')} />
        <Field label="Số điện thoại" value={form.phone} onChange={upd('phone')} />
        <Field label="Email" value={form.email} onChange={upd('email')} type="email" />
        <Field label="Số tài khoản" value={form.bankAccount} onChange={upd('bankAccount')} />
        <Field label="Ngân hàng" value={form.bankName} onChange={upd('bankName')} cols={2} />
        <Field label="Người đại diện" value={form.representative} onChange={upd('representative')} />
        <Field label="Chức vụ" value={form.position} onChange={upd('position')} />
        {withAssignment && (
          <>
            <div className="col-span-2 border-t border-gray-100 pt-2 mt-1 text-xs font-semibold text-gray-500 uppercase">Sale phụ trách &amp; Phòng ban</div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sale phụ trách</label>
              <SaleSearchDropdown saleProfiles={saleProfiles} value={form.assignedSale?.accountId} onChange={selectSale}
                placeholder="Chọn sale phụ trách..." className="w-full" />
              <p className="text-xs text-gray-400 mt-1">Chọn đúng tên sale trong danh sách để mã sale được gán chính xác — sale đó sẽ thấy được khách hàng này.</p>
            </div>
            <Select label="Phòng ban" value={form.departmentId || ''} onChange={upd('departmentId')}>
              <option value="">-- Chọn phòng ban --</option>
              {Object.entries(departments).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}
            </Select>
          </>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            if (!form.companyName) return alert(`${companyLabel} không được để trống`);
            onSave(form);
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >Lưu</button>
        <button onClick={onCancel} className="bg-gray-100 px-5 py-2 rounded-lg hover:bg-gray-200 text-sm">Hủy</button>
      </div>
    </div>
  );
};
