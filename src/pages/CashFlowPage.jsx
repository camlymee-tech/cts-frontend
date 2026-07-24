// File: src/pages/CashFlowPage.jsx
// Bảng theo dõi dòng tiền dạng nhập liệu trực tiếp kiểu Excel (mỗi dòng = 1 lô hàng).
import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { fmtNum } from '../helpers';
import { buildCustomerOptions, resolveCustomerId, parseCustomerOptionValue, encodeCustomerOptionValue } from '../utils/customerOptions';
import { PaymentRequestPrint } from './PaymentRequestPrint';
import { api } from '../lib/api';

const num = (v) => Number(v) || 0;
const EMPTY_SET = new Set();

// Tính các cột suy ra (không lưu riêng, luôn tính lại từ dữ liệu gốc để không bị lệch)
export const deriveComputed = (r) => {
  const amountVnd = num(r.exchange_rate) * num(r.amount_cny); // Tiền hàng dự kiến = Tỷ giá x Số tệ
  const remainderAfterGoods = num(r.customer_paid_total) - amountVnd; // Phần dư sau khi thanh toán tiền hàng = Tổng KH đã chuyển - Tiền hàng dự kiến
  const amountDueMore = num(r.total_due_on_arrival) - remainderAfterGoods; // Còn phải thanh toán = Tổng phải thu khi hàng về - Phần dư sau khi thanh toán tiền hàng
  const totalCustomerTransferred = num(r.customer_paid_total) + num(r.actual_collected);
  const diffAmount = num(r.invoice_amount) - totalCustomerTransferred; // Chênh lệch (cột V)
  const remainingDebt = diffAmount; // Công nợ còn lại = Chênh lệch (cột V)
  return { amountVnd, remainderAfterGoods, amountDueMore, remainingDebt, totalCustomerTransferred, diffAmount };
};

// Các cột lấy giá trị từ Đề Nghị Thanh Toán — khoá không cho sửa trực tiếp ở đây (trừ khi đang tạo dòng mới),
// muốn sửa phải quay lại Đề Nghị Thanh Toán.
const DNTT_FIELDS = ['seller_id', 'customer_id', 'goods_desc', 'deposit_vnd', 'customer_paid_total',
  'customer_paid_date', 'bank_account', 'bank_name', 'exchange_rate', 'amount_cny', 'payment_request_no'];
// Chỉ gộp ô thật (rowSpan) với các cột chắc chắn giống nhau cho CẢ đề nghị thanh toán —
// không gộp Mô tả/Tiền cọc/Tổng KH đã chuyển/Tỷ giá/Số tệ vì mỗi dòng chứng từ có thể khác nhau.
// Đã bỏ gộp hoàn toàn (Số đề nghị TT / Cty thu tiền / Khách hàng / Ngày KH chuyển tiền / Số tài khoản / Ngân hàng) —
// mỗi dòng hiện riêng; việc gộp nhóm dòng nay chuyển sang cơ chế "Mã lô" (xem phần renderRow/batch grouping).
const MERGEABLE_KEYS = [];

// Đổi vị trí cột (0,1,2...) thành chữ cái kiểu Excel (A, B, ..., Z, AA, AB...)
const excelColLetter = (n) => {
  let s = '';
  n += 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Cấu hình cột — đúng thứ tự bảng "CHI TIẾT THEO DÕI CÔNG NỢ" (GUI_LY)
// formula: ký hiệu công thức hiển thị ở tiêu đề cho cột tự động tính (dùng chữ cái cột theo thứ tự bên dưới)
const COLS = [
  { key: 'batch_code', label: 'Mã lô', type: 'text', w: 130 },
  { key: 'payment_request_no', label: 'Số đề nghị TT', type: 'text', w: 140, fromDntt: true },
  { key: 'seller_id', label: 'Cty thu tiền (bên bán)', type: 'seller', w: 220, fromDntt: true },
  { key: 'customer_code_display', label: 'Mã khách', type: 'customerCode', w: 100 },
  { key: 'customer_id', label: 'Tên xuất hóa đơn', type: 'customer', w: 220, fromDntt: true },
  { key: 'goods_desc', label: 'Mô tả hàng hóa', type: 'text', w: 200, fromDntt: true },
  { key: 'amountVnd', label: 'Tiền hàng dự kiến (VNĐ)', type: 'computed', w: 170, formula: 'N×O' },
  { key: 'deposit_vnd', label: 'Tiền cọc (VNĐ)', type: 'number', w: 160, fromDntt: true },
  { key: 'customer_paid_total', label: 'Tổng KH đã chuyển lần 1 (VNĐ)', type: 'number', w: 180, fromDntt: true },
  { key: 'customer_paid_date', label: 'Ngày KH chuyển tiền', type: 'date', w: 150, fromDntt: true },
  { key: 'bank_account', label: 'Số tài khoản', type: 'text', w: 160, fromDntt: true },
  { key: 'bank_name', label: 'Ngân hàng', type: 'text', w: 220, fromDntt: true },
  { key: 'factory_paid_date', label: 'Ngày chuyển xưởng', type: 'date', w: 150 },
  { key: 'exchange_rate', label: 'Tỷ giá', type: 'number', w: 110, fromDntt: true },
  { key: 'amount_cny', label: 'Số tệ (Tiền hàng tệ)', type: 'number', w: 160, fromDntt: true },
  { key: 'cnyDiff', label: 'Phần dư sau khi thanh toán tiền hàng', type: 'computed', w: 190, formula: 'I-G' },
  { key: 'total_due_on_arrival', label: 'Phải trả cho CTS (VNĐ)', type: 'number', w: 170 },
  { key: 'amountDueMore', label: 'Còn phải thanh toán', type: 'computed', w: 170, formula: 'Q-P' },
  { key: 'actual_collected', label: 'Khách chuyển tiền lần 2 (VNĐ)', type: 'number', w: 180 },
  { key: 'customer_final_payment_date', label: 'Ngày khách thanh toán lần 2', type: 'date', w: 170 },
  { key: 'totalCustomerTransferred', label: 'Tổng tiền KH chuyển vào Cty', type: 'computed', w: 180, formula: 'I+S' },
  { key: 'invoice_amount', label: 'Giá trị xuất hóa đơn', type: 'number', w: 170 },
  { key: 'diffAmount', label: 'Chênh lệch', type: 'computed', w: 150, formula: 'V-U' },
  { key: 'note', label: 'Ghi chú', type: 'text', w: 220 },
];

// Bản rút gọn cột riêng cho "Theo dõi dòng tiền" của Hợp đồng ngoại thương — bỏ hẳn các cột không dùng
// (Mã lô, Cty thu tiền, Số tài khoản, Ngân hàng, Phải trả cho CTS, Còn phải thanh toán, Khách chuyển tiền lần 2,
// Ngày khách thanh toán lần 2, Giá trị xuất hóa đơn, Chênh lệch, Tiền hàng dự kiến, Phần dư sau khi thanh toán,
// Tổng tiền KH chuyển vào Cty); "Tiền vào" (Đã thu khách — customer_paid_total) và "Tiền ra" (Đã thanh toán
// ngoại tệ — amount_cny) đặt cạnh nhau để dễ so sánh từng dòng; "Tiền cọc" đổi tên thành "CTS phải thu".
const COLS_FX = [
  { key: 'payment_request_no', label: 'Số đề nghị TT', type: 'text', w: 140, fromDntt: true },
  { key: 'customer_code_display', label: 'Mã khách', type: 'customerCode', w: 100 },
  { key: 'customer_id', label: 'Tên xuất hóa đơn', type: 'customer', w: 220, fromDntt: true },
  { key: 'goods_desc', label: 'Mô tả hàng hóa', type: 'text', w: 200, fromDntt: true },
  { key: 'customer_paid_total', label: 'Tiền vào (CNY)', type: 'number', w: 160, fromDntt: true },
  { key: 'amount_cny', label: 'Tiền ra (CNY)', type: 'number', w: 160, fromDntt: true },
  { key: 'deposit_vnd', label: 'CTS phải thu', type: 'number', w: 160, fromDntt: true },
  { key: 'customer_paid_date', label: 'Ngày KH chuyển tiền', type: 'date', w: 150, fromDntt: true },
  { key: 'factory_paid_date', label: 'Ngày chuyển xưởng', type: 'date', w: 150 },
  { key: 'note', label: 'Ghi chú', type: 'text', w: 220 },
];

const NUMBER_KEYS = COLS.filter(c => c.type === 'number').map(c => c.key);
const DATE_KEYS = COLS.filter(c => c.type === 'date').map(c => c.key);
const CHECKBOX_KEYS = COLS.filter(c => c.type === 'checkbox').map(c => c.key);
// Các cột tiền/số lượng sẽ CỘNG DỒN lên dòng gốc khi gộp theo Mã lô (Tỷ giá không cộng vì là đơn giá, không phải tổng)
const SUM_KEYS = ['deposit_vnd', 'customer_paid_total', 'amount_cny', 'total_due_on_arrival', 'actual_collected', 'invoice_amount'];
// Trong số các cột trên, đây là các cột NHẬP TAY (không khoá từ Đề Nghị Thanh Toán) — khi đã gộp nhóm,
// chị sẽ nhập thẳng TỔNG ở dòng gốc, không nhập riêng từng dòng con nữa.
const EDITABLE_SUM_KEYS = ['total_due_on_arrival', 'actual_collected', 'invoice_amount'];

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
    return <div className="px-2 py-1.5 text-right text-emerald-800 bg-emerald-50 whitespace-nowrap font-medium">{isMoney ? fmtNum(value) : (value || '')}</div>;
  }
  if (col.type === 'checkbox') {
    return (
      <div className={`flex justify-center py-1.5 ${disabled ? 'bg-amber-50/60' : ''}`}>
        <input type="checkbox" checked={!!value} disabled={disabled} onChange={e => { onChange(e.target.checked); onBlur?.(); }} />
      </div>
    );
  }
  const common = `w-full border focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 rounded px-2 py-1.5 text-sm disabled:text-gray-500 ${disabled ? 'bg-amber-50/60 border-transparent' : 'bg-white border-gray-200 hover:border-gray-300'}`;
  if (col.type === 'date') {
    return <input type="date" value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={onBlur} className={common + ' text-right'} />;
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

export const CashFlowPage = ({ batches = [], customers = {}, sellers = {}, isAdmin = false, onSave, onDelete, initialCustomerFilter = '', onBack, onOpenPaymentRequest, isFxContract = false }) => {
  const cols = isFxContract ? COLS_FX : COLS; // Hợp đồng ngoại thương dùng bộ cột rút gọn riêng
  const [view, setView] = useState('batches'); // 'batches' | 'print'
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState(initialCustomerFilter);
  const [sellerFilter, setSellerFilter] = useState('');
  const [drafts, setDrafts] = useState({}); // { [rowId]: { field: value } } — chỉnh sửa tạm trước khi lưu
  const [newRow, setNewRow] = useState(BLANK_ROW);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(null);
  const [collapsedBatches, setCollapsedBatches] = useState(new Set()); // các Mã lô đang thu gọn (ẩn dòng con)
  const [grouping, setGrouping] = useState(false); // đang gán Mã lô chung cho các dòng đã chọn

  const customerLabel = (id) => customers[id] ? `${customers[id].companyName} (${id})` : (id || '—');
  // Nếu dòng này được tạo từ 1 Mã nhánh cụ thể (qua Đề Nghị Thanh Toán), hiện đúng tên nhánh đó
  // thay vì luôn hiện tên khách hàng gốc.
  const customerDisplayLabel = (row) => {
    const id = row.customer_id;
    const c = customers[id];
    if (!c) return id || '—';
    if (row.branch_tax_code) {
      const branch = (c.branches || []).find(b => b.id === row.branch_tax_code);
      if (branch) return `${branch.companyName || branch.taxCode} (${id})`;
    }
    return customerLabel(id);
  };
  const sellerLabel = (id) => sellers[id] ? sellers[id].companyName : (id || '—');

  const merged = useMemo(() => batches.map(b => ({ ...b, ...(drafts[b.id] || {}) })), [batches, drafts]);

  const filtered = merged.filter(b => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s
      || (b.batch_code || '').toLowerCase().includes(s)
      || customerLabel(b.customer_id).toLowerCase().includes(s)
      || (b.invoice_no || '').toLowerCase().includes(s);
    const matchCustomer = !customerFilter || b.customer_id === customerFilter;
    const matchSeller = !sellerFilter || b.seller_id === sellerFilter;
    return matchSearch && matchCustomer && matchSeller;
  });

  const buildPayload = (row) => {
    const computed = deriveComputed(row);
    const payload = { customer_id: row.customer_id || null, seller_id: row.seller_id || null };
    cols.forEach(c => {
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

  const toggleCollapseBatch = (code) => setCollapsedBatches(s => {
    const next = new Set(s);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  // Gộp các dòng đã chọn (checkbox) thành 1 lô NGAY, không hỏi Mã lô — tự gán 1 mã tạm để liên kết
  // các dòng lại với nhau; chị có thể bấm vào ô Mã lô ở dòng gốc để tự gõ lại tên mình muốn bất cứ lúc nào.
  // Chỉ cho gộp khi các dòng đã chọn có CÙNG 1 Số đề nghị TT — khác số thì để nguyên, không gộp nhầm.
  const handleGroupSelected = async () => {
    if (selectedIds.size < 2) return;
    const selectedRows = merged.filter(r => selectedIds.has(r.id));
    const reqNos = new Set(selectedRows.map(r => (r.payment_request_no ?? '').toString().trim()));
    if (reqNos.size !== 1 || [...reqNos][0] === '') {
      alert('Chỉ gộp được các dòng có CÙNG 1 Số đề nghị TT. Chị kiểm tra lại các dòng đã chọn nhé.');
      return;
    }
    const maxNo = merged.reduce((max, b) => {
      const m = /^LO(\d+)$/i.exec((b.batch_code || '').trim());
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    const code = `LO${maxNo + 1}`;
    setGrouping(true);
    try {
      for (const id of selectedIds) {
        await onSave(id, { batch_code: code });
      }
      setSelectedIds(new Set());
    } catch (e) {
      alert('Có lỗi khi gộp lô: ' + e.message);
    } finally {
      setGrouping(false);
    }
  };

  // Đổi lại tên Mã lô cho cả nhóm — gõ trực tiếp ở dòng gốc, áp dụng cho tất cả các dòng con.
  const renameGroupCode = async (items, newCode) => {
    const code = newCode.trim();
    if (!code) return;
    const toUpdate = items.filter(it => it.row.batch_code !== code);
    if (toUpdate.length === 0) return;
    setGrouping(true);
    try {
      for (const it of toUpdate) {
        await onSave(it.row.id, { batch_code: code });
      }
    } catch (e) {
      alert('Có lỗi khi đổi Mã lô: ' + e.message);
    } finally {
      setGrouping(false);
    }
  };

  // Bỏ gộp 1 nhóm Mã lô: xoá Mã lô khỏi tất cả các dòng, ĐỒNG THỜI tách hẳn thành các Đề Nghị Thanh Toán
  // độc lập — dòng đầu tiên giữ nguyên Số đề nghị TT cũ, các dòng còn lại được đổi sang số riêng (thêm hậu tố
  // -2, -3...) để không còn dính chung 1 đề nghị nữa, tránh sửa 1 dòng lại kéo theo dòng kia.
  const handleUngroup = async (items) => {
    setGrouping(true);
    try {
      const [first, ...rest] = items;
      if (first) await onSave(first.row.id, { batch_code: null });
      for (let idx = 0; idx < rest.length; idx++) {
        const it = rest[idx];
        const patch = { batch_code: null };
        const origReq = (it.row.payment_request_no ?? '').toString().trim();
        if (origReq) patch.payment_request_no = `${origReq}-${idx + 2}`;
        await onSave(it.row.id, patch);
      }
    } catch (e) {
      alert('Có lỗi khi bỏ gộp: ' + e.message);
    } finally {
      setGrouping(false);
    }
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
        customers={customers}
        sellers={sellers}
        onSave={onSave}
        onDelete={onDelete}
        onClose={() => setView('batches')}
      />
    );
  }

  const customerOptions = buildCustomerOptions(customers);
  const sellerOptions = Object.entries(sellers).map(([id, s]) => ({ value: id, label: s.shortName ? `[${s.shortName}] ${s.companyName}` : s.companyName }));

  // Mỗi dòng có 1 ô tích riêng — việc gộp nhóm hiển thị (root/con) nay xử lý riêng ở displayItems bên dưới.
  const filteredWithMeta = useMemo(() => filtered.map((row) => ({
    row, isFirstInGroup: true, groupSize: 1, groupIds: [row.id],
  })), [filtered]);

  // Chỉ gộp gốc/con theo Mã lô (do người dùng tự gán qua "Gộp thành lô") — Số đề nghị TT luôn hiện riêng
  // từng dòng, không tự động gộp nữa (dễ gây nhầm lẫn khi nhiều dòng chỉ tình cờ trùng số).
  const displayItems = useMemo(() => {
    const byCode = {};
    filteredWithMeta.forEach(it => { if (it.row.batch_code) (byCode[it.row.batch_code] ||= []).push(it); });
    const consumedByBatch = new Set();
    const result = [];
    filteredWithMeta.forEach(it => {
      if (consumedByBatch.has(it.row.id)) return;
      const code = it.row.batch_code;
      const group = code ? byCode[code] : null;
      if (group && group.length > 1) {
        group.forEach(g => consumedByBatch.add(g.row.id));
        result.push({ kind: 'group', groupKey: `batch-${code}`, keyField: 'batch_code', label: code, items: group });
      } else {
        result.push({ kind: 'single', item: it });
      }
    });
    return result;
  }, [filteredWithMeta]);

  // Dòng "gốc" của 1 nhóm Mã lô: tổng cộng dồn các cột tiền
  // (SUM_KEYS + các cột tự tính), các cột còn lại hiện giá trị chung nếu mọi dòng con giống nhau, ngược lại hiện "—".
  // Nhập TỔNG trực tiếp ở dòng gốc cho các cột tiền nhập tay (Phải trả cho CTS, Khách chuyển tiền lần 2,
  // Giá trị xuất hóa đơn): lưu toàn bộ số vừa nhập vào dòng ĐẦU TIÊN của nhóm, các dòng con còn lại đặt về 0 —
  // để tổng cộng dồn hiển thị ở dòng gốc luôn đúng bằng đúng số chị vừa gõ, không cần nhập riêng từng dòng con.

  // Áp dụng 1 giá trị chung (không phải tiền, VD ngày) cho cả nhóm: lưu vào dòng ĐẦU TIÊN, xoá ở các dòng con còn lại.
  const setGroupField = async (rows, key, value) => {
    const [first, ...rest] = rows;
    await commitRow(first.id, { ...first, [key]: value });
    for (const r of rest) {
      if (r[key]) await commitRow(r.id, { ...r, [key]: null });
    }
  };

  const setGroupTotal = async (rows, key, value) => {
    const val = value === '' ? 0 : Number(value) || 0;
    const [first, ...rest] = rows;
    await commitRow(first.id, { ...first, [key]: val });
    for (const r of rest) {
      if (num(r[key]) !== 0) await commitRow(r.id, { ...r, [key]: 0 });
    }
  };

  // Các cột có giá trị GIỐNG NHAU cho cả nhóm (trừ cột định danh nhóm và các cột tiền/tự tính đã xử lý riêng) —
  // những cột này chỉ cần hiện 1 lần ở dòng gốc, dòng con sẽ để trống.
  const getCommonKeys = (items, keyField) => {
    const rows = items.map(it => it.row);
    const keys = new Set([keyField]); // cột định danh nhóm (Mã lô) luôn giống nhau cả nhóm — ẩn ở dòng con
    // Số đề nghị TT luôn hiện đầy đủ ở MỌI dòng (kể cả dòng con) để bấm vào xem/sửa lại đề nghị đó.
    const NEVER_BLANK_KEYS = ['payment_request_no'];
    cols.forEach(col => {
      if (col.key === keyField || col.type === 'computed' || SUM_KEYS.includes(col.key) || NEVER_BLANK_KEYS.includes(col.key)) return;
      const vals = new Set(rows.map(r => r[col.key] ?? ''));
      if (vals.size === 1 && rows[0][col.key] !== null && rows[0][col.key] !== '' && rows[0][col.key] !== undefined) keys.add(col.key);
    });
    return keys;
  };

  const renderGroupRoot = (groupKey, keyField, label, items) => {
    const rows = items.map(it => it.row);
    const groupIds = rows.map(r => r.id);
    const collapsed = collapsedBatches.has(groupKey);
    const sumField = (key) => rows.reduce((s, r) => s + num(r[key]), 0);
    const sumComputed = (fn) => rows.reduce((s, r) => s + fn(deriveComputed(r)), 0);
    const commonValue = (key) => {
      const vals = new Set(rows.map(r => r[key] ?? ''));
      return vals.size === 1 ? rows[0][key] : null;
    };
    const computedFns = {
      amountVnd: (c) => c.amountVnd,
      cnyDiff: (c) => c.remainderAfterGoods,
      amountDueMore: (c) => c.amountDueMore,
      totalCustomerTransferred: (c) => c.totalCustomerTransferred,
      diffAmount: (c) => c.diffAmount,
    };
    return (
      <tr key={`group-${groupKey}`} className="bg-yellow-50 hover:bg-yellow-100/70 border-b border-gray-200">
        <td className="sticky left-0 bg-yellow-50 px-2 border-r border-gray-200 align-top">
          <input type="checkbox" checked={groupIds.every(id => selectedIds.has(id))} onChange={() => toggleSelectGroup(groupIds)} />
        </td>
        {cols.map(col => {
          let content;
          if (col.key === keyField) {
            content = (
              <span className="flex items-center gap-1.5">
                <button type="button" onClick={() => toggleCollapseBatch(groupKey)} className="text-gray-400 hover:text-blue-700">
                  {collapsed ? '⌄' : '︿'}
                </button>
                {keyField === 'payment_request_no' ? (
                  <button type="button" onClick={() => onOpenPaymentRequest?.(rows[0].customer_id, rows[0].payment_request_no, rows.map(r => r.id))} className="text-blue-600 hover:text-blue-800 underline font-medium" title="Bấm để sửa lại ở Đề Nghị Thanh Toán">
                    {label}
                  </button>
                ) : (
                  <input
                    type="text" defaultValue={label} key={`${groupKey}-code-${label}`}
                    onBlur={(e) => renameGroupCode(items, e.target.value)}
                    title="Gõ để đổi tên Mã lô cho cả nhóm"
                    className="border-2 border-blue-300 rounded px-1.5 py-0.5 text-sm text-blue-600 font-medium bg-blue-50/40"
                  />
                )}
                <button type="button" onClick={() => handleUngroup(items)} className="text-xs text-red-400 hover:text-red-600 underline" title="Bỏ gộp — tách các dòng con ra hiện riêng lại">
                  Bỏ gộp
                </button>
              </span>
            );
          } else if (col.key === 'customer_final_payment_date') {
            const same = commonValue('customer_final_payment_date');
            content = (
              <input
                type="date" defaultValue={same || ''} key={`${groupKey}-cfpd-${same}`}
                onBlur={(e) => setGroupField(rows, 'customer_final_payment_date', e.target.value || null)}
                className="w-full border-2 border-blue-300 rounded px-1.5 py-1 text-sm text-right bg-blue-50/40"
              />
            );
          } else if (EDITABLE_SUM_KEYS.includes(col.key)) {
            content = (
              <input
                type="text" inputMode="numeric"
                defaultValue={sumField(col.key) ? fmtNum(sumField(col.key)) : ''}
                key={`${groupKey}-${col.key}-${sumField(col.key)}`}
                onBlur={(e) => { const raw = e.target.value.replace(/\D/g, ''); setGroupTotal(rows, col.key, raw); }}
                className="w-full border-2 border-blue-300 rounded px-1.5 py-1 text-sm text-right bg-blue-50/40"
              />
            );
          } else if (SUM_KEYS.includes(col.key)) {
            content = <span className="block text-right">{fmtNum(sumField(col.key))}</span>;
          } else if (col.type === 'computed' && computedFns[col.key]) {
            content = <span className="block text-right text-emerald-800">{fmtNum(sumComputed(computedFns[col.key]))}</span>;
          } else if (col.key === 'seller_id') {
            const same = commonValue('seller_id');
            const label = same ? (sellers[same] ? (sellers[same].shortName ? `[${sellers[same].shortName}] ${sellers[same].companyName}` : sellers[same].companyName) : same) : null;
            content = label ? <span className="whitespace-normal break-words leading-snug">{label}</span> : <span className="text-gray-400">—</span>;
          } else if (col.key === 'customer_code_display') {
            const same = commonValue('customer_id');
            content = same ? <span className="text-gray-500">{same}</span> : <span className="text-gray-400">—</span>;
          } else if (col.key === 'customer_id') {
            const same = commonValue('customer_id');
            const sameBranch = commonValue('branch_tax_code');
            let label = null;
            if (same) {
              const c = customers[same];
              const branch = sameBranch && c ? (c.branches || []).find(b => b.id === sameBranch) : null;
              label = branch ? `${branch.companyName || branch.taxCode} (${same})` : customerLabel(same);
            }
            content = label ? <span className="whitespace-normal break-words leading-snug">{label}</span> : <span className="text-gray-400">—</span>;
          } else {
            const same = commonValue(col.key);
            if (same === null || same === '' || same === undefined) content = <span className="text-gray-400">—</span>;
            else content = <span className={col.type === 'number' ? 'block text-right' : ''}>{col.type === 'number' ? fmtNum(same) : same}</span>;
          }
          return (
            <td key={col.key} style={{ minWidth: col.w }} className="border-r border-b border-gray-100 px-2 py-1.5 text-sm align-top">
              {content}
            </td>
          );
        })}
        <td className="sticky right-0 bg-yellow-50 px-2 border-l border-gray-200"></td>
      </tr>
    );
  };

  // Cùng 1 đề nghị thanh toán thì chọn/bỏ chọn tất cả các dòng trong nhóm cùng lúc
  const toggleSelectGroup = (ids) => setSelectedIds(s => {
    const next = new Set(s);
    const allSelected = ids.every(id => next.has(id));
    ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
    return next;
  });

  const renderRow = (row, isNew, isFirstInGroup = true, groupSize = 1, groupIds = [row.id], isChild = false, commonKeys = EMPTY_SET) => {
    const computed = deriveComputed(row);
    const disabledAdminOnly = !isAdmin;
    return (
      <tr key={isNew ? 'new' : row.id} className={isNew ? 'bg-blue-50/40' : (isChild ? 'bg-white hover:bg-gray-50' : 'bg-yellow-50 hover:bg-yellow-100/70')}>
        {!isNew && isFirstInGroup && (
          isChild
            ? <td className="sticky left-0 bg-white px-2 border-r border-gray-200 text-center text-gray-300 text-xs" title="Đã gộp — chọn ở dòng gốc phía trên">🔒</td>
            : (
              <td rowSpan={groupSize > 1 ? groupSize : undefined} className="sticky left-0 bg-yellow-50 px-2 border-r border-gray-200 align-top">
                <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelectGroup(groupIds)} />
              </td>
            )
        )}
        {isNew && <td className="sticky left-0 bg-blue-50/40 px-2 border-r border-gray-200 text-center text-blue-500 text-xs">Mới</td>}
        {cols.map(col => {
          if (isChild && commonKeys.has(col.key)) {
            // Thông tin này giống nhau cho cả nhóm (kể cả cột định danh nhóm) — đã hiện 1 lần ở dòng gốc rồi, dòng con để trống.
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 bg-white text-center text-gray-300 text-xs" title="Đã hiện ở dòng gốc phía trên">🔒</td>;
          }
          if (col.key === 'batch_code' && !isChild) {
            // Dòng đơn lẻ/chưa gộp — ô Mã lô style giống hệt ô "gõ được ở dòng gốc" (viền xanh) để nhất quán,
            // gõ trùng mã ở 2 dòng sẽ tự gộp lại thành nhóm.
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-1">
                <input
                  type="text" defaultValue={row.batch_code || ''} key={`${row.id || 'new'}-batch-${row.batch_code || ''}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (isNew) { editNew('batch_code', v); if (row.customer_id) commitRow(null, { ...row, batch_code: v }); }
                    else commitRow(row.id, { ...row, batch_code: v });
                  }}
                  className="w-full border-2 border-blue-300 rounded px-1.5 py-1 text-sm bg-blue-50/40"
                />
              </td>
            );
          }
          if (col.type === 'seller') {
            const disabled = col.fromDntt && !isNew;
            const merging = disabled && MERGEABLE_KEYS.includes(col.key);
            if (merging && !isFirstInGroup) return null; // đã được gộp vào ô của dòng đầu nhóm
            const rowSpan = merging && groupSize > 1 ? groupSize : undefined;
            if (disabled) {
              const label = sellers[row.seller_id] ? (sellers[row.seller_id].shortName ? `[${sellers[row.seller_id].shortName}] ${sellers[row.seller_id].companyName}` : sellers[row.seller_id].companyName) : '';
              return (
                <td key={col.key} rowSpan={rowSpan} style={{ minWidth: col.w }} className="border-r border-b border-gray-100 px-2 py-1.5 text-sm bg-amber-50/60 text-gray-600 whitespace-normal break-words leading-snug align-top">
                  {label}
                </td>
              );
            }
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <select value={row.seller_id || ''} disabled={disabled}
                  onChange={e => isNew ? editNew('seller_id', e.target.value) : editExisting(row, 'seller_id', e.target.value)}
                  onBlur={() => !isNew && drafts[row.id] && commitRow(row.id, row)}
                  className="w-full border border-gray-200 hover:border-gray-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 bg-white">
                  <option value="">-- Chọn --</option>
                  {sellerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </td>
            );
          }
          if (col.type === 'customerCode') {
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 px-2 py-1.5 text-sm text-gray-500">
                {row.customer_id || '—'}
              </td>
            );
          }
          if (col.type === 'customer') {
            const disabled = col.fromDntt && !isNew;
            const merging = disabled && MERGEABLE_KEYS.includes(col.key);
            if (merging && !isFirstInGroup) return null;
            const rowSpan = merging && groupSize > 1 ? groupSize : undefined;
            if (disabled) {
              return (
                <td key={col.key} rowSpan={rowSpan} style={{ minWidth: col.w }} className="border-r border-b border-gray-100 px-2 py-1.5 text-sm bg-amber-50/60 text-gray-600 whitespace-normal break-words leading-snug align-top">
                  {customerDisplayLabel(row)}
                </td>
              );
            }
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <select value={(() => {
                    const idx = row.branch_tax_code ? (customers[row.customer_id]?.branches || []).findIndex(b => b.id === row.branch_tax_code) : -1;
                    return encodeCustomerOptionValue(row.customer_id || '', idx >= 0 ? idx : null);
                  })()} disabled={disabled}
                  onChange={e => {
                    const { customerId: v, branchIndex } = parseCustomerOptionValue(e.target.value);
                    const branchTaxCode = branchIndex != null ? (customers[v]?.branches?.[branchIndex]?.id || null) : null;
                    if (isNew) { editNew('customer_id', v); editNew('branch_tax_code', branchTaxCode); }
                    else { editExisting(row, 'customer_id', v); editExisting(row, 'branch_tax_code', branchTaxCode); }
                  }}
                  onBlur={async () => { if (isNew && row.customer_id) await commitRow(null, row); else if (!isNew && drafts[row.id]) await commitRow(row.id, row); }}
                  className="w-full border border-gray-200 hover:border-gray-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 bg-white">
                  <option value="">-- Chọn khách hàng --</option>
                  {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </td>
            );
          }
          if (col.type === 'computed') {
            const map = { amountVnd: computed.amountVnd, cnyDiff: computed.remainderAfterGoods,
              amountDueMore: computed.amountDueMore, remainingDebt: computed.remainingDebt,
              totalCustomerTransferred: computed.totalCustomerTransferred, diffAmount: computed.diffAmount };
            // "Tiền hàng dự kiến" và "Phần dư sau khi thanh toán tiền hàng" vẫn hiện chi tiết từng dòng con —
            // các cột tự tính còn lại chỉ hiện tổng ở dòng gốc như trước.
            const SHOW_DETAIL_AT_CHILD = ['amountVnd', 'cnyDiff'];
            const blankAtChild = isChild && !SHOW_DETAIL_AT_CHILD.includes(col.key);
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100"><Cell col={col} value={blankAtChild ? '' : map[col.key]} /></td>;
          }
          if (isChild && col.key === 'customer_final_payment_date') {
            // Ngày khách thanh toán lần 2 chỉ cần lấy/hiện ở dòng gốc — dòng con để trống.
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 bg-white text-center text-gray-300 text-xs" title="Đã hiện ở dòng gốc phía trên">🔒</td>;
          }
          if (isChild && EDITABLE_SUM_KEYS.includes(col.key)) {
            // Đã gộp nhóm — số tổng nhập ở dòng gốc phía trên, dòng con không nhập riêng nữa.
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 bg-white text-center text-gray-300 text-xs" title="Nhập ở dòng gốc phía trên">🔒</td>;
          }
          const disabled = (col.fromDntt && !isNew) || (col.adminOnly && disabledAdminOnly);
          const merging = disabled && MERGEABLE_KEYS.includes(col.key);
          if (merging && !isFirstInGroup) return null; // đã được gộp vào ô của dòng đầu nhóm
          const rowSpan = merging && groupSize > 1 ? groupSize : undefined;
          if (col.key === 'payment_request_no' && !isNew && row.payment_request_no != null) {
            return (
              <td key={col.key} rowSpan={rowSpan} style={{ minWidth: col.w }} className="border-r border-b border-gray-100 align-top px-2 py-1.5 text-sm bg-amber-50/60 text-right">
                <button type="button" onClick={() => onOpenPaymentRequest?.(row.customer_id, row.payment_request_no, [row.id])}
                  className="text-blue-600 hover:text-blue-800 underline font-medium" title="Bấm để sửa lại ở Đề Nghị Thanh Toán">
                  {row.payment_request_no}
                </button>
              </td>
            );
          }
          if (rowSpan) {
            let display = row[col.key] ?? '';
            if (col.type === 'number' && display !== '') display = fmtNum(display);
            return (
              <td key={col.key} rowSpan={rowSpan} style={{ minWidth: col.w }} className={`border-r border-b border-gray-100 align-top px-2 py-1.5 text-sm bg-amber-50/60 text-gray-600 whitespace-normal break-words leading-snug ${col.type === 'number' ? 'text-right' : ''}`}>
                {display}
              </td>
            );
          }
          return (
            <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
              <Cell col={col} value={row[col.key]} disabled={disabled}
                onChange={(v) => isNew ? editNew(col.key, v) : editExisting(row, col.key, v)}
                onBlur={() => { if (isNew) { if (row.customer_id) commitRow(null, row); } else if (drafts[row.id]) commitRow(row.id, row); }} />
            </td>
          );
        })}
        {!isNew && (
          <td className={`sticky right-0 px-2 border-l border-gray-200 whitespace-nowrap ${isChild ? 'bg-white' : 'bg-yellow-50'}`}>
            {saving === row.id && <span className="text-xs text-blue-500 mr-2">Đang lưu...</span>}
            <button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">Xóa</button>
          </td>
        )}
        {isNew && <td className="sticky right-0 bg-blue-50/40 px-2 border-l border-gray-200"></td>}
      </tr>
    );
  };

  return (
    <div className="-mx-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 px-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">📊 ← Quay lại tổng hợp</button>
          <h1 className="text-2xl font-bold text-gray-800">💰 Theo dõi dòng tiền</h1>
        </div>
        <div className="flex items-center gap-3">
          {!isFxContract && selectedIds.size >= 2 && (
            <button onClick={handleGroupSelected} disabled={grouping} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow disabled:opacity-50">
              {grouping ? '⏳ Đang gộp...' : `🔗 Gộp thành lô (${selectedIds.size})`}
            </button>
          )}
          {selectedIds.size > 0 && (
            <button onClick={() => setView('print')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium shadow">
              🖨️ In Đề Nghị Thanh Toán ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3 px-6">Bảng chỉ để theo dõi/bổ sung thêm thông tin cho các lô đã có từ Đề Nghị Thanh Toán — không tạo lô mới trực tiếp ở đây. Nhấn số ở cột "Số đề nghị TT" để quay lại sửa ở Đề Nghị Thanh Toán. Kéo ngang để xem hết các cột.</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap px-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo mã lô, khách hàng, số hóa đơn..."
          className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Tất cả công ty bán</option>
          {sellerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs px-6 flex-wrap">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span> Lấy từ Đề Nghị Thanh Toán — muốn sửa vào lại mục "Đề Nghị Thanh Toán"</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 inline-block"></span> Dòng gốc / dòng chưa gộp — nền vàng như nhau, dòng gốc có mũi tên để thu gọn/mở ra</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-300 inline-block"></span> Dòng con (đã gộp vào 1 nhóm) — nền trắng để phân biệt</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-flex items-center justify-center text-[8px]">🔒</span> Đã gộp — khoá ở dòng con, xem/sửa ở dòng gốc phía trên</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-300 inline-block"></span> Gõ được ở dòng gốc — áp dụng cho cả nhóm</span>
      </div>

      <div className="bg-white border-y border-gray-200 overflow-auto" style={{ maxHeight: '75vh' }}>
        <table className="text-sm border-collapse" style={{ minWidth: 3600 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="sticky left-0 bg-gray-50 px-2 py-2 border-r border-gray-200 z-20 w-8"></th>
              {cols.map((col, i) => (
                <th key={col.key} style={{ minWidth: col.w }}
                  className={`text-left align-bottom px-2 py-2 border-r border-gray-100 font-medium leading-snug ${col.fromDntt ? 'text-amber-700 bg-amber-50/60' : ''} ${col.type === 'computed' ? 'text-emerald-700 bg-emerald-50' : ''}`}>
                  <div>{col.label}</div>
                  <div className="normal-case font-mono opacity-70">{excelColLetter(i)}{col.formula ? ` = ${col.formula}` : ''}</div>
                </th>
              ))}
              <th className="sticky right-0 bg-gray-50 px-2 py-2 border-l border-gray-200 z-20 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map(d => d.kind === 'group'
              ? (
                <Fragment key={`group-${d.groupKey}`}>
                  {renderGroupRoot(d.groupKey, d.keyField, d.label, d.items)}
                  {!collapsedBatches.has(d.groupKey) && d.items.map(({ row, isFirstInGroup, groupSize, groupIds }) => renderRow(row, false, isFirstInGroup, groupSize, groupIds, true, getCommonKeys(d.items, d.keyField)))}
                </Fragment>
              )
              : renderRow(d.item.row, false, d.item.isFirstInGroup, d.item.groupSize, d.item.groupIds)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
