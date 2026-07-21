// File: src/pages/CashFlowPage.jsx
import { useState } from 'react';
import { SearchableSelect } from '../components/SearchableSelect';
import { fmtNum } from '../helpers';
import { CashFlowSummary } from './CashFlowSummary';

const FIELD_LABELS = {
  batch_code: 'Mã lô',
  seller_name: 'Công ty (bên bán)',
  order_date: 'Ngày đặt hàng',
  goods_desc: 'Mô tả hàng hóa',
  exchange_rate: 'Tỷ giá',
  amount_cny: 'Tiền hàng (tệ)',
  amount_vnd: 'Tiền hàng (VNĐ)',
  deposit_vnd: 'Tiền cọc (VNĐ)',
  customer_paid_total: 'Tổng KH đã chuyển (VNĐ)',
  customer_paid_date: 'Ngày KH chuyển tiền',
  customer_paid_status: 'Trạng thái chuyển tiền KH',
  paid_to_factory: 'Đã chuyển cho xưởng (VNĐ)',
  factory_paid_date: 'Ngày chuyển xưởng',
  factory_paid_status: 'Trạng thái TT xưởng',
  total_due_on_arrival: 'Tổng phải thu khi hàng về (VNĐ)',
  deposit_deduct: 'Trừ tiền cọc (VNĐ)',
  amount_due_more: 'Số tiền KH cần thanh toán thêm (VNĐ)',
  arrival_date: 'Ngày hàng về',
  customer_final_payment_date: 'Ngày KH thanh toán phần còn lại',
  actual_collected: 'Số tiền đã thu thực tế (VNĐ)',
  remaining_debt: 'Công nợ còn lại (VNĐ)',
  total_customer_transferred: 'Tổng tiền KH chuyển vào Cty',
  invoice_amount: 'HÓA ĐƠN',
  diff_amount: 'Chênh lệch',
  invoice_no: 'SỐ HÓA ĐƠN',
  note: 'Ghi chú',
};

const NUMBER_FIELDS = ['exchange_rate', 'amount_cny', 'amount_vnd', 'deposit_vnd', 'customer_paid_total',
  'paid_to_factory', 'total_due_on_arrival', 'deposit_deduct', 'amount_due_more', 'actual_collected',
  'remaining_debt', 'total_customer_transferred', 'invoice_amount', 'diff_amount'];
const DATE_FIELDS = ['order_date', 'customer_paid_date', 'factory_paid_date', 'arrival_date', 'customer_final_payment_date'];

const BLANK = Object.fromEntries(Object.keys(FIELD_LABELS).map(k => [k, '']));

const FIELD_GROUPS = [
  { title: 'Thông tin chung', fields: ['batch_code', 'seller_name', 'order_date', 'goods_desc'] },
  { title: 'Tiền hàng', fields: ['exchange_rate', 'amount_cny', 'amount_vnd', 'deposit_vnd'] },
  { title: 'Khách hàng chuyển tiền', fields: ['customer_paid_total', 'customer_paid_date', 'customer_paid_status'] },
  { title: 'Chuyển cho xưởng', fields: ['paid_to_factory', 'factory_paid_date', 'factory_paid_status'] },
  { title: 'Khi hàng về', fields: ['total_due_on_arrival', 'deposit_deduct', 'amount_due_more', 'arrival_date', 'customer_final_payment_date', 'actual_collected', 'remaining_debt'] },
  { title: 'Đối chiếu hóa đơn', fields: ['total_customer_transferred', 'invoice_amount', 'diff_amount', 'invoice_no'] },
  { title: 'Ghi chú', fields: ['note'] },
];

const BatchForm = ({ init, customerId, onSave, onCancel }) => {
  const [form, setForm] = useState(init || BLANK);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const payload = { customer_id: customerId };
    Object.entries(form).forEach(([k, v]) => {
      if (NUMBER_FIELDS.includes(k)) payload[k] = v === '' ? null : Number(v);
      else payload[k] = v === '' ? null : v;
    });
    await onSave(payload);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
      {FIELD_GROUPS.map(g => (
        <div key={g.title}>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{g.title}</div>
          <div className="grid grid-cols-4 gap-3">
            {g.fields.map(k => (
              <div key={k} className={k === 'goods_desc' || k === 'note' ? 'col-span-4' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{FIELD_LABELS[k]}</label>
                <input
                  type={DATE_FIELDS.includes(k) ? 'date' : NUMBER_FIELDS.includes(k) ? 'number' : 'text'}
                  value={form[k] ?? ''}
                  onChange={e => set(k, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={submit} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Lưu lô hàng</button>
        <button onClick={onCancel} className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
      </div>
    </div>
  );
};

export const CashFlowPage = ({ batches = [], customers = {}, onSave, onDelete }) => {
  const [view, setView] = useState('batches'); // 'batches' | 'summary'
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [addCustomerId, setAddCustomerId] = useState('');

  const customerOptions = Object.entries(customers).map(([id, c]) => ({ value: id, label: `${id} — ${c.companyName}` }));
  const customerLabel = (id) => customers[id] ? `${customers[id].companyName} (${id})` : (id || '—');

  const filtered = batches.filter(b => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s
      || (b.batch_code || '').toLowerCase().includes(s)
      || customerLabel(b.customer_id).toLowerCase().includes(s)
      || (b.invoice_no || '').toLowerCase().includes(s);
    const matchCustomer = !customerFilter || b.customer_id === customerFilter;
    return matchSearch && matchCustomer;
  });

  const handleSave = async (payload) => {
    await onSave(editId, payload);
    setEditId(null);
    setShowAdd(false);
    setAddCustomerId('');
  };

  if (view === 'summary') {
    return <CashFlowSummary batches={batches} customers={customers} onBack={() => setView('batches')} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">💰 Theo dõi dòng tiền</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('summary')}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm">📊 Tổng hợp công nợ</button>
          <button onClick={() => { setShowAdd(true); setEditId(null); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Thêm lô hàng</button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-6">
          <div className="mb-3 max-w-sm">
            <SearchableSelect label="Khách hàng" required value={addCustomerId} onChange={setAddCustomerId}
              placeholder="-- Chọn khách hàng --" options={customerOptions} />
          </div>
          {addCustomerId ? (
            <BatchForm customerId={addCustomerId} onSave={handleSave} onCancel={() => { setShowAdd(false); setAddCustomerId(''); }} />
          ) : (
            <div className="text-sm text-gray-400 italic">Chọn khách hàng trước để nhập thông tin lô hàng.</div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo mã lô, khách hàng, số hóa đơn..."
          className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tất cả khách hàng</option>
          {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {batches.length === 0 ? 'Chưa có lô hàng nào. Bấm "+ Thêm lô hàng" để bắt đầu.' : 'Không tìm thấy lô hàng phù hợp.'}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-3 w-14">STT</th>
              <th className="text-left px-4 py-3">Mã lô</th>
              <th className="text-left px-4 py-3">Khách hàng</th>
              <th className="text-left px-4 py-3">Ngày đặt hàng</th>
              <th className="text-right px-4 py-3">Tiền hàng (VNĐ)</th>
              <th className="text-right px-4 py-3">Tiền cọc</th>
              <th className="text-right px-4 py-3">Công nợ còn lại</th>
              <th className="text-left px-4 py-3">Số hóa đơn</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((b, idx) => (
                editId === b.id ? (
                  <tr key={b.id}><td colSpan="9" className="p-4 bg-blue-50/30 border-t border-gray-100">
                    <div className="text-sm font-medium text-blue-700 mb-2">{customerLabel(b.customer_id)}</div>
                    <BatchForm init={b} customerId={b.customer_id} onSave={handleSave} onCancel={() => setEditId(null)} />
                  </td></tr>
                ) : (
                  <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-700">{b.batch_code || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{customerLabel(b.customer_id)}</td>
                    <td className="px-4 py-3 text-gray-500">{b.order_date || '—'}</td>
                    <td className="px-4 py-3 text-right">{fmtNum(b.amount_vnd)}</td>
                    <td className="px-4 py-3 text-right">{fmtNum(b.deposit_vnd)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(b.remaining_debt) > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmtNum(b.remaining_debt)}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{b.invoice_no || '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => { setEditId(b.id); setShowAdd(false); }} className="text-blue-600 hover:text-blue-800 mr-3">Sửa</button>
                      <button onClick={() => onDelete(b.id)} className="text-red-500 hover:text-red-700">Xóa</button>
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
