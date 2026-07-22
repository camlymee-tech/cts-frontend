// File: src/pages/CashFlowPage.jsx
// Bảng theo dõi dòng tiền dạng nhập liệu trực tiếp kiểu Excel (mỗi dòng = 1 lô hàng).
import { useState, useMemo, useRef, useEffect } from 'react';
import { fmtNum } from '../helpers';
import { PaymentRequestPrint } from './PaymentRequestPrint';
import { api } from '../lib/api';

const num = (v) => Number(v) || 0;

// Tính các cột suy ra (không lưu riêng, luôn tính lại từ dữ liệu gốc để không bị lệch)
export const deriveComputed = (r) => {
  const amountVnd = num(r.customer_paid_total) - num(r.deposit_vnd); // Tiền hàng dự kiến
  const cnyDiff = num(r.amount_cny) - num(r.cny_transferred); // Chênh lệch còn (CNY) = Số tệ - Số tiền chuyển
  const depositDeductChecked = !!r.deposit_deduct;
  const amountDueMore = num(r.total_due_on_arrival) - (depositDeductChecked ? num(r.deposit_vnd) : 0);
  const remainingDebt = amountDueMore - num(r.actual_collected);
  const totalCustomerTransferred = num(r.customer_paid_total) + num(r.actual_collected);
  const diffAmount = num(r.invoice_amount) - totalCustomerTransferred;
  return { amountVnd, cnyDiff, amountDueMore, remainingDebt, totalCustomerTransferred, diffAmount };
};

// Các cột lấy giá trị từ Đề Nghị Thanh Toán — khoá không cho sửa trực tiếp ở đây (trừ khi đang tạo dòng mới),
// muốn sửa phải quay lại Đề Nghị Thanh Toán.
const DNTT_FIELDS = ['seller_id', 'customer_id', 'goods_desc', 'deposit_vnd', 'customer_paid_total',
  'customer_paid_date', 'bank_account', 'bank_name', 'exchange_rate', 'amount_cny', 'cny_transferred',
  'note', 'payment_request_no'];

// Cấu hình cột — đúng thứ tự bảng "CHI TIẾT THEO DÕI CÔNG NỢ" (GUI_LY)
const COLS = [
  { key: 'batch_code', label: 'Mã lô', type: 'text', w: 120 },
  { key: 'payment_request_no', label: 'Số đề nghị TT', type: 'number', w: 130, fromDntt: true },
  { key: 'seller_id', label: 'Cty thu tiền (bên bán)', type: 'seller', w: 220, fromDntt: true },
  { key: 'customer_id', label: 'Khách hàng', type: 'customer', w: 240, fromDntt: true },
  { key: 'goods_desc', label: 'Mô tả hàng hóa', type: 'text', w: 240, fromDntt: true },
  { key: 'amountVnd', label: 'Tiền hàng dự kiến (VNĐ)', type: 'computed', w: 170 },
  { key: 'deposit_vnd', label: 'Tiền cọc (VNĐ)', type: 'number', w: 140, fromDntt: true },
  { key: 'customer_paid_total', label: 'Tổng KH đã chuyển (VNĐ)', type: 'number', w: 170, fromDntt: true },
  { key: 'customer_paid_date', label: 'Ngày KH chuyển tiền', type: 'date', w: 160, fromDntt: true },
  { key: 'bank_account', label: 'Số tài khoản', type: 'text', w: 180, fromDntt: true },
  { key: 'bank_name', label: 'Ngân hàng', type: 'text', w: 260, fromDntt: true },
  { key: 'factory_paid_date', label: 'Ngày chuyển xưởng', type: 'date', w: 160 },
  { key: 'exchange_rate', label: 'Tỷ giá', type: 'number', w: 110, fromDntt: true },
  { key: 'amount_cny', label: 'Số tệ (Tiền hàng tệ)', type: 'number', w: 150, fromDntt: true },
  { key: 'cny_transferred', label: 'Số tiền chuyển (CNY)', type: 'number', w: 160, fromDntt: true },
  { key: 'cnyDiff', label: 'Chênh lệch còn (CNY)', type: 'computed', w: 150 },
  { key: 'total_due_on_arrival', label: 'Tổng phải thu khi hàng về (VNĐ)', type: 'number', w: 190 },
  { key: 'deposit_deduct', label: 'Trừ tiền cọc', type: 'checkbox', w: 100 },
  { key: 'amountDueMore', label: 'Còn phải thanh toán', type: 'computed', w: 170 },
  { key: 'actual_collected', label: 'Số tiền đã thu thực tế (VNĐ)', type: 'number', w: 170 },
  { key: 'customer_final_payment_date', label: 'Ngày KH thanh toán phần còn lại', type: 'date', w: 190 },
  { key: 'remainingDebt', label: 'Công nợ còn lại (VNĐ)', type: 'computed', w: 170 },
  { key: 'totalCustomerTransferred', label: 'Tổng tiền KH chuyển vào Cty', type: 'computed', w: 180 },
  { key: 'invoice_amount', label: 'Giá trị xuất hóa đơn', type: 'number', w: 160 },
  { key: 'diffAmount', label: 'Chênh lệch', type: 'computed', w: 140 },
  { key: 'invoice_no', label: 'Số hóa đơn', type: 'invoice', w: 220 },
  { key: 'note', label: 'Ghi chú', type: 'text', w: 220, fromDntt: true },
];

const NUMBER_KEYS = COLS.filter(c => c.type === 'number').map(c => c.key);
const DATE_KEYS = COLS.filter(c => c.type === 'date').map(c => c.key);
const CHECKBOX_KEYS = COLS.filter(c => c.type === 'checkbox').map(c => c.key);

const BLANK_ROW = { customer_id: '', seller_id: '' };

// Ô "Số hóa đơn" — gõ để tìm trong "Hàng hóa theo hóa đơn", chọn xong tự điền Giá trị xuất hóa đơn
const InvoiceLinkCell = ({ value, onChange, onPick, onBlur, disabled }) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const timerRef = useRef(null);
  const justPickedRef = useRef(false); // tránh lưu đè bằng dữ liệu cũ khi vừa chọn 1 gợi ý (blur bắn ra ngay sau đó)

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const onClickOutside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const doSearch = (q) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const { rows } = await api.listInvoiceGoodsPaged({ search: q.trim(), limit: 10 });
        setResults(rows);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text" value={query} disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange?.(e.target.value); doSearch(e.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => { if (justPickedRef.current) { justPickedRef.current = false; return; } onBlur?.(); }, 150)}
        placeholder="Gõ để tìm số hóa đơn..."
        className="w-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100"
      />
      {open && query.trim() && (
        <div className="absolute z-30 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-xs text-gray-400">Đang tìm...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Không tìm thấy hóa đơn phù hợp</div>
          ) : results.map((inv) => (
            <button key={inv.id} type="button"
              onClick={() => { justPickedRef.current = true; setQuery(inv.invoice_no); setOpen(false); onPick(inv); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0">
              <div className="font-mono font-medium text-blue-600">{inv.invoice_no}</div>
              <div className="text-gray-500">{inv.customer_name} — {fmtNum(inv.total)} đ</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Cell = ({ col, value, onChange, onBlur, disabled }) => {
  if (col.type === 'computed') {
    const isMoney = typeof value === 'number';
    return <div className="px-2 py-1.5 text-right text-blue-900 bg-blue-50/70 whitespace-nowrap font-medium">{isMoney ? fmtNum(value) : (value || '')}</div>;
  }
  if (col.type === 'checkbox') {
    return (
      <div className={`flex justify-center py-1.5 ${disabled ? 'bg-amber-50/60' : ''}`}>
        <input type="checkbox" checked={!!value} disabled={disabled} onChange={e => { onChange(e.target.checked); onBlur?.(); }} />
      </div>
    );
  }
  const common = `w-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-2 py-1.5 text-sm disabled:text-gray-500 ${disabled ? 'bg-amber-50/60' : 'bg-white'}`;
  if (col.type === 'date') {
    return <input type="date" value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={onBlur} className={common} />;
  }
  if (col.type === 'number') {
    const display = value === '' || value === null || value === undefined ? '' : Number(value).toLocaleString('vi-VN');
    return (
      <input
        type="text" inputMode="decimal" value={display} disabled={disabled}
        onChange={e => { const raw = e.target.value.replace(/[^\d]/g, ''); onChange(raw === '' ? '' : raw); }}
        onBlur={onBlur} className={common + ' text-right'}
      />
    );
  }
  // Ô chữ đã khóa (lấy từ ĐNTT): hiện dạng chữ xuống dòng đầy đủ, không cắt bớt như ô input 1 dòng
  if (col.type === 'text' && disabled) {
    return <div className={`px-2 py-1.5 text-sm text-gray-600 bg-amber-50/60 whitespace-normal break-words leading-snug`}>{value || ''}</div>;
  }
  return <input type="text" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={onBlur} className={common} />;
};

export const CashFlowPage = ({ batches = [], customers = {}, sellers = {}, isAdmin = false, onSave, onDelete, initialCustomerFilter = '', onBack }) => {
  const [view, setView] = useState('batches'); // 'batches' | 'print'
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState(initialCustomerFilter);
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
      if (CHECKBOX_KEYS.includes(c.key)) payload[c.key] = v ? 1 : 0;
      else if (NUMBER_KEYS.includes(c.key)) payload[c.key] = (v === '' || v === undefined || v === null) ? null : Number(v);
      else if (DATE_KEYS.includes(c.key)) payload[c.key] = v || null;
      else payload[c.key] = v ?? null;
    });
    // Tự lấy Ngày KH chuyển tiền làm Ngày đặt hàng (không còn ô nhập riêng)
    payload.order_date = row.customer_paid_date || null;
    // Lưu kèm các cột tổng hợp quan trọng để tiện xuất báo cáo/đối chiếu về sau
    payload.amount_vnd = computed.amountVnd;
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
  const sellerOptions = Object.entries(sellers).map(([id, s]) => ({ value: id, label: s.shortName ? `[${s.shortName}] ${s.companyName}` : s.companyName }));

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
            const disabled = col.fromDntt && !isNew;
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <select value={row.seller_id || ''} disabled={disabled}
                  onChange={e => isNew ? editNew('seller_id', e.target.value) : editExisting(row, 'seller_id', e.target.value)}
                  onBlur={() => !isNew && drafts[row.id] && commitRow(row.id, row)}
                  className={`w-full border-0 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:text-gray-500 ${disabled ? 'bg-amber-50/60' : 'bg-white'}`}>
                  <option value="">-- Chọn --</option>
                  {sellerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </td>
            );
          }
          if (col.type === 'customer') {
            const disabled = col.fromDntt && !isNew;
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <select value={row.customer_id || ''} disabled={disabled}
                  onChange={e => isNew ? editNew('customer_id', e.target.value) : editExisting(row, 'customer_id', e.target.value)}
                  onBlur={async () => { if (isNew && row.customer_id) await commitRow(null, row); else if (!isNew && drafts[row.id]) await commitRow(row.id, row); }}
                  className={`w-full border-0 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:text-gray-500 ${disabled ? 'bg-amber-50/60' : 'bg-white'}`}>
                  <option value="">-- Chọn khách hàng --</option>
                  {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </td>
            );
          }
          if (col.type === 'invoice') {
            const pickInvoice = (inv) => {
              const applyField = (key, val) => isNew ? editNew(key, val) : editExisting(row, key, val);
              applyField('invoice_no', inv.invoice_no);
              applyField('invoice_amount', inv.total ?? '');
              // Áp dụng xong thì lưu ngay (giống các ô khác khi rời khỏi ô)
              setTimeout(() => {
                if (isNew) { if (row.customer_id) commitRow(null, { ...row, invoice_no: inv.invoice_no, invoice_amount: inv.total }); }
                else commitRow(row.id, { ...row, invoice_no: inv.invoice_no, invoice_amount: inv.total });
              }, 0);
            };
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <InvoiceLinkCell
                  value={row.invoice_no}
                  onChange={(v) => isNew ? editNew('invoice_no', v) : editExisting(row, 'invoice_no', v)}
                  onPick={pickInvoice}
                  onBlur={() => { if (isNew) { if (row.customer_id) commitRow(null, row); } else if (drafts[row.id]) commitRow(row.id, row); }}
                />
              </td>
            );
          }
          if (col.type === 'computed') {
            const map = { amountVnd: computed.amountVnd, cnyDiff: computed.cnyDiff,
              amountDueMore: computed.amountDueMore, remainingDebt: computed.remainingDebt,
              totalCustomerTransferred: computed.totalCustomerTransferred, diffAmount: computed.diffAmount };
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100"><Cell col={col} value={map[col.key]} /></td>;
          }
          const disabled = (col.fromDntt && !isNew) || (col.adminOnly && disabledAdminOnly);
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
          <button onClick={onBack}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm">📊 ← Quay lại tổng hợp</button>
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

      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span> Lấy từ Đề Nghị Thanh Toán — muốn sửa vào lại mục "Đề Nghị Thanh Toán"</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto" style={{ maxHeight: '75vh' }}>
        <table className="text-sm border-collapse" style={{ minWidth: 3600 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="sticky left-0 bg-gray-50 px-2 py-2 border-r border-gray-200 z-20 w-8"></th>
              {COLS.map(col => (
                <th key={col.key} style={{ minWidth: col.w }} className={`text-left align-bottom px-2 py-2 border-r border-gray-100 font-medium leading-snug ${col.fromDntt ? 'text-amber-700 bg-amber-50/60' : ''}`}>
                  {col.label}
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
