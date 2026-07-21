// File: src/pages/CashFlowPage.jsx
// Bảng theo dõi dòng tiền dạng nhập liệu trực tiếp kiểu Excel (mỗi dòng = 1 lô hàng).
import { useState, useMemo } from 'react';
import { fmtNum } from '../helpers';
import { CashFlowSummary } from './CashFlowSummary';
import { PaymentRequestPrint } from './PaymentRequestPrint';

const num = (v) => Number(v) || 0;

// Tính các cột suy ra (không lưu riêng, luôn tính lại từ dữ liệu gốc để không bị lệch)
export const deriveComputed = (r) => {
  const cnyConverted = r.exchange_rate ? num(r.amount_vnd) / num(r.exchange_rate) : 0;
  const cnyDiff = cnyConverted - num(r.cny_transferred);
  const totalDueOnArrival = num(r.service_fee) + num(r.vat_amount);
  const depositDeduct = r.deposit_deduct !== undefined && r.deposit_deduct !== null && r.deposit_deduct !== ''
    ? num(r.deposit_deduct) : num(r.deposit_vnd);
  const amountDueMore = totalDueOnArrival - depositDeduct;
  const remainingDebt = amountDueMore - num(r.actual_collected);
  const totalCustomerTransferred = num(r.customer_paid_total) + num(r.actual_collected);
  const diffAmount = num(r.invoice_amount) - totalCustomerTransferred;
  const isOverdue = r.payment_due_date && new Date(r.payment_due_date) < new Date() && remainingDebt > 0;
  const overdueDays = isOverdue ? Math.floor((new Date() - new Date(r.payment_due_date)) / 86400000) : 0;
  return { cnyConverted, cnyDiff, totalDueOnArrival, depositDeduct, amountDueMore, remainingDebt, totalCustomerTransferred, diffAmount, isOverdue, overdueDays };
};

// Cấu hình cột — đúng thứ tự bảng "CHI TIẾT THEO DÕI CÔNG NỢ" (GUI_LY)
const COLS = [
  { key: 'batch_code', label: 'Mã lô', type: 'text', w: 110 },
  { key: 'seller_id', label: 'Cty thu tiền (bên bán)', type: 'seller', w: 200 },
  { key: 'customer_id', label: 'Khách hàng', type: 'customer', w: 220 },
  { key: 'order_date', label: 'Ngày đặt hàng', type: 'date', w: 130 },
  { key: 'goods_desc', label: 'Mô tả hàng hóa', type: 'text', w: 220 },
  { key: 'amount_vnd', label: 'Tiền hàng (VNĐ)', type: 'number', w: 130 },
  { key: 'deposit_vnd', label: 'Tiền cọc (VNĐ)', type: 'number', w: 120 },
  { key: 'customer_paid_total', label: 'Tổng KH đã chuyển (VNĐ)', type: 'number', w: 150 },
  { key: 'customer_paid_date', label: 'Ngày KH chuyển tiền', type: 'date', w: 140 },
  { key: 'bank_account', label: 'Số tài khoản', type: 'text', w: 140 },
  { key: 'bank_name', label: 'Ngân hàng', type: 'text', w: 160 },
  { key: 'customer_paid_status', label: 'Trạng thái chuyển tiền KH', type: 'text', w: 150 },
  { key: 'paid_to_factory', label: 'Đã chuyển cho xưởng (VNĐ)', type: 'number', w: 150, adminOnly: true },
  { key: 'factory_paid_date', label: 'Ngày chuyển xưởng', type: 'date', w: 140, adminOnly: true },
  { key: 'factory_paid_status', label: 'Trạng thái TT xưởng', type: 'text', w: 140 },
  { key: 'exchange_rate', label: 'Tỷ giá', type: 'number', w: 90 },
  { key: 'amount_cny', label: 'Tiền hàng tệ', type: 'number', w: 110 },
  { key: 'cnyConverted', label: 'Tiền quy đổi (CNY)', type: 'computed', w: 130 },
  { key: 'cny_transferred', label: 'Số tiền chuyển (CNY)', type: 'number', w: 140 },
  { key: 'cnyDiff', label: 'Chênh lệch còn (CNY)', type: 'computed', w: 140 },
  { key: 'vat_percent', label: '% VAT áp dụng', type: 'number', w: 110 },
  { key: 'service_fee', label: 'Phí dịch vụ (VNĐ)', type: 'number', w: 130 },
  { key: 'vat_amount', label: 'Tiền thuế VAT (VNĐ)', type: 'number', w: 130 },
  { key: 'totalDueOnArrival', label: 'Tổng phải thu khi hàng về (VNĐ)', type: 'computed', w: 170 },
  { key: 'deposit_deduct', label: 'Trừ tiền cọc (VNĐ)', type: 'number', w: 130 },
  { key: 'amountDueMore', label: 'Còn phải thanh toán', type: 'computed', w: 150 },
  { key: 'arrival_date', label: 'Ngày hàng về', type: 'date', w: 120 },
  { key: 'payment_due_date', label: 'Ngày hạn thanh toán', type: 'date', w: 140 },
  { key: 'actual_collected', label: 'Số tiền đã thu thực tế (VNĐ)', type: 'number', w: 150 },
  { key: 'customer_final_payment_date', label: 'Ngày KH thanh toán phần còn lại', type: 'date', w: 170 },
  { key: 'remainingDebt', label: 'Công nợ còn lại (VNĐ)', type: 'computed', w: 150 },
  { key: 'overdue', label: 'Công nợ quá hạn', type: 'computed', w: 130 },
  { key: 'totalCustomerTransferred', label: 'Tổng tiền KH chuyển vào Cty', type: 'computed', w: 160 },
  { key: 'invoice_amount', label: 'Giá trị xuất hóa đơn', type: 'number', w: 140 },
  { key: 'diffAmount', label: 'Chênh lệch', type: 'computed', w: 120 },
  { key: 'invoice_no', label: 'Số hóa đơn', type: 'text', w: 120 },
  { key: 'note', label: 'Ghi chú', type: 'text', w: 200 },
];

const NUMBER_KEYS = COLS.filter(c => c.type === 'number').map(c => c.key);
const DATE_KEYS = COLS.filter(c => c.type === 'date').map(c => c.key);

const BLANK_ROW = { customer_id: '', seller_id: '' };

const Cell = ({ col, value, onChange, onBlur, disabled }) => {
  if (col.type === 'computed') {
    const isMoney = typeof value === 'number';
    return <div className="px-2 py-1.5 text-right text-gray-500 bg-gray-50 whitespace-nowrap">{isMoney ? fmtNum(value) : (value || '')}</div>;
  }
  const common = "w-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400";
  if (col.type === 'date') {
    return <input type="date" value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={onBlur} className={common} />;
  }
  if (col.type === 'number') {
    return <input type="number" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={onBlur} className={common + ' text-right'} />;
  }
  return <input type="text" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={onBlur} className={common} />;
};

export const CashFlowPage = ({ batches = [], customers = {}, sellers = {}, isAdmin = false, onSave, onDelete }) => {
  const [view, setView] = useState('batches'); // 'batches' | 'summary' | 'print'
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [drafts, setDrafts] = useState({}); // { [rowId]: { field: value } } — chỉnh sửa tạm trước khi lưu
  const [newRow, setNewRow] = useState(BLANK_ROW);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(null);

  const customerLabel = (id) => customers[id] ? `${customers[id].companyName} (${id})` : (id || '—');
  const sellerLabel = (id) => sellers[id] ? sellers[id].companyName : (id || '—');

  const merged = useMemo(() => batches.map(b => ({ ...b, ...(drafts[b.id] || {}) })), [batches, drafts]);

  const filtered = merged.filter(b => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s
      || (b.batch_code || '').toLowerCase().includes(s)
      || customerLabel(b.customer_id).toLowerCase().includes(s)
      || (b.invoice_no || '').toLowerCase().includes(s);
    const matchCustomer = !customerFilter || b.customer_id === customerFilter;
    return matchSearch && matchCustomer;
  });

  const buildPayload = (row) => {
    const computed = deriveComputed(row);
    const payload = { customer_id: row.customer_id || null, seller_id: row.seller_id || null };
    COLS.forEach(c => {
      if (c.type === 'computed') return;
      const v = row[c.key];
      if (NUMBER_KEYS.includes(c.key)) payload[c.key] = (v === '' || v === undefined || v === null) ? null : Number(v);
      else if (DATE_KEYS.includes(c.key)) payload[c.key] = v || null;
      else payload[c.key] = v ?? null;
    });
    // Lưu kèm các cột tổng hợp quan trọng để tiện xuất báo cáo/đối chiếu về sau
    payload.total_due_on_arrival = computed.totalDueOnArrival;
    payload.amount_due_more = computed.amountDueMore;
    payload.remaining_debt = computed.remainingDebt;
    payload.total_customer_transferred = computed.totalCustomerTransferred;
    payload.diff_amount = computed.diffAmount;
    return payload;
  };

  const commitRow = async (id, row) => {
    setSaving(id || 'new');
    try {
      const saved = await onSave(id, buildPayload(row));
      if (id) setDrafts(d => { const next = { ...d }; delete next[id]; return next; });
      else setNewRow(BLANK_ROW);
      return saved;
    } finally {
      setSaving(null);
    }
  };

  const editExisting = (row, key, value) => {
    setDrafts(d => {
      const current = { ...(d[row.id] || {}), [key]: value };
      if (key === 'seller_id' && sellers[value]) {
        current.bank_account = sellers[value].bankAccount || '';
        current.bank_name = sellers[value].bankName || '';
      }
      return { ...d, [row.id]: current };
    });
  };

  const editNew = (key, value) => {
    setNewRow(r => {
      const next = { ...r, [key]: value };
      if (key === 'seller_id' && sellers[value]) {
        next.bank_account = sellers[value].bankAccount || '';
        next.bank_name = sellers[value].bankName || '';
      }
      return next;
    });
  };

  const toggleSelect = (id) => setSelectedIds(s => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectedBatches = merged.filter(b => selectedIds.has(b.id));

  if (view === 'summary') return <CashFlowSummary batches={batches} customers={customers} sellers={sellers} onBack={() => setView('batches')} />;
  if (view === 'print') {
    const firstCustomer = selectedBatches[0]?.customer_id;
    return (
      <PaymentRequestPrint
        customerId={firstCustomer}
        customer={customers[firstCustomer]}
        batches={selectedBatches}
        onClose={() => setView('batches')}
      />
    );
  }

  const customerOptions = Object.entries(customers).map(([id, c]) => ({ value: id, label: `${id} — ${c.companyName}` }));
  const sellerOptions = Object.entries(sellers).map(([id, s]) => ({ value: id, label: s.companyName }));

  const renderRow = (row, isNew) => {
    const computed = deriveComputed(row);
    const disabledAdminOnly = !isAdmin;
    return (
      <tr key={isNew ? 'new' : row.id} className={isNew ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
        {!isNew && (
          <td className="sticky left-0 bg-white px-2 border-r border-gray-200">
            <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} />
          </td>
        )}
        {isNew && <td className="sticky left-0 bg-blue-50/40 px-2 border-r border-gray-200 text-center text-blue-500 text-xs">Mới</td>}
        {COLS.map(col => {
          if (col.type === 'seller') {
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <select value={row.seller_id || ''} onChange={e => isNew ? editNew('seller_id', e.target.value) : editExisting(row, 'seller_id', e.target.value)}
                  onBlur={() => !isNew && drafts[row.id] && commitRow(row.id, row)}
                  className="w-full border-0 bg-white text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Chọn --</option>
                  {sellerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </td>
            );
          }
          if (col.type === 'customer') {
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <select value={row.customer_id || ''} onChange={e => isNew ? editNew('customer_id', e.target.value) : editExisting(row, 'customer_id', e.target.value)}
                  onBlur={async () => { if (isNew && row.customer_id) await commitRow(null, row); else if (!isNew && drafts[row.id]) await commitRow(row.id, row); }}
                  className="w-full border-0 bg-white text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">-- Chọn khách hàng --</option>
                  {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </td>
            );
          }
          if (col.type === 'computed') {
            const map = { cnyConverted: computed.cnyConverted, cnyDiff: computed.cnyDiff, totalDueOnArrival: computed.totalDueOnArrival,
              amountDueMore: computed.amountDueMore, remainingDebt: computed.remainingDebt, totalCustomerTransferred: computed.totalCustomerTransferred,
              diffAmount: computed.diffAmount, overdue: computed.isOverdue ? computed.remainingDebt : 0 };
            return <td key={col.key} style={{ minWidth: col.w }} className={`border-r border-gray-100 ${computed.isOverdue && col.key === 'overdue' ? 'text-red-600 font-medium' : ''}`}><Cell col={col} value={map[col.key]} /></td>;
          }
          const disabled = col.adminOnly && disabledAdminOnly;
          return (
            <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
              <Cell col={col} value={row[col.key]} disabled={disabled}
                onChange={(v) => isNew ? editNew(col.key, v) : editExisting(row, col.key, v)}
                onBlur={() => { if (isNew) { if (row.customer_id) commitRow(null, row); } else if (drafts[row.id]) commitRow(row.id, row); }} />
            </td>
          );
        })}
        {!isNew && (
          <td className="sticky right-0 bg-white px-2 border-l border-gray-200 whitespace-nowrap">
            {saving === row.id && <span className="text-xs text-blue-500 mr-2">Đang lưu...</span>}
            <button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">Xóa</button>
          </td>
        )}
        {isNew && <td className="sticky right-0 bg-blue-50/40 px-2 border-l border-gray-200"></td>}
      </tr>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">💰 Theo dõi dòng tiền</h1>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={() => setView('print')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium shadow">
              🖨️ In Đề Nghị Thanh Toán ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setView('summary')}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm">📊 Tổng hợp công nợ</button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">Nhập trực tiếp vào bảng như Excel — mỗi ô tự lưu khi bấm ra ngoài (Tab/click chỗ khác). Kéo ngang để xem hết các cột. Dòng cuối màu xanh nhạt để thêm lô mới.</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo mã lô, khách hàng, số hóa đơn..."
          className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tất cả khách hàng</option>
          {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto" style={{ maxHeight: '75vh' }}>
        <table className="text-sm border-collapse" style={{ minWidth: 3200 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="sticky left-0 bg-gray-50 px-2 py-2 border-r border-gray-200 z-20 w-8"></th>
              {COLS.map(col => (
                <th key={col.key} style={{ minWidth: col.w }} className={`text-left px-2 py-2 border-r border-gray-100 font-medium ${col.adminOnly ? 'text-amber-600' : ''}`}>
                  {col.label}{col.adminOnly && <span title="Chỉ admin sửa được"> 🔒</span>}
                </th>
              ))}
              <th className="sticky right-0 bg-gray-50 px-2 py-2 border-l border-gray-200 z-20 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => renderRow(row, false))}
            {renderRow(newRow, true)}
          </tbody>
        </table>
      </div>
    </div>
  );
};
