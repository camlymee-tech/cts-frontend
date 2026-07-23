// File: src/pages/CashFlowPage.jsx
// Bảng theo dõi dòng tiền dạng nhập liệu trực tiếp kiểu Excel (mỗi dòng = 1 lô hàng).
import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { fmtNum } from '../helpers';
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
  { key: 'customer_id', label: 'Khách hàng', type: 'customer', w: 220, fromDntt: true },
  { key: 'goods_desc', label: 'Mô tả hàng hóa', type: 'text', w: 200, fromDntt: true },
  { key: 'amountVnd', label: 'Tiền hàng dự kiến (VNĐ)', type: 'computed', w: 170, formula: 'M×N' },
  { key: 'deposit_vnd', label: 'Tiền cọc (VNĐ)', type: 'number', w: 160, fromDntt: true },
  { key: 'customer_paid_total', label: 'Tổng KH đã chuyển lần 1 (VNĐ)', type: 'number', w: 180, fromDntt: true },
  { key: 'customer_paid_date', label: 'Ngày KH chuyển tiền', type: 'date', w: 150, fromDntt: true },
  { key: 'bank_account', label: 'Số tài khoản', type: 'text', w: 160, fromDntt: true },
  { key: 'bank_name', label: 'Ngân hàng', type: 'text', w: 220, fromDntt: true },
  { key: 'factory_paid_date', label: 'Ngày chuyển xưởng', type: 'date', w: 150 },
  { key: 'exchange_rate', label: 'Tỷ giá', type: 'number', w: 110, fromDntt: true },
  { key: 'amount_cny', label: 'Số tệ (Tiền hàng tệ)', type: 'number', w: 160, fromDntt: true },
  { key: 'cnyDiff', label: 'Phần dư sau khi thanh toán tiền hàng', type: 'computed', w: 190, formula: 'H-F' },
  { key: 'total_due_on_arrival', label: 'Phải trả cho CTS (VNĐ)', type: 'number', w: 170 },
  { key: 'amountDueMore', label: 'Còn phải thanh toán', type: 'computed', w: 170, formula: 'P-O' },
  { key: 'actual_collected', label: 'Khách chuyển tiền lần 2 (VNĐ)', type: 'number', w: 180 },
  { key: 'customer_final_payment_date', label: 'Ngày khách thanh toán lần 2', type: 'date', w: 170 },
  { key: 'totalCustomerTransferred', label: 'Tổng tiền KH chuyển vào Cty', type: 'computed', w: 180, formula: 'H+R' },
  { key: 'invoice_amount', label: 'Giá trị xuất hóa đơn', type: 'number', w: 170 },
  { key: 'diffAmount', label: 'Chênh lệch', type: 'computed', w: 150, formula: 'U-T' },
  { key: 'invoice_no', label: 'Số hóa đơn', type: 'invoice', w: 220 },
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
  const common = `w-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-2 py-1.5 text-sm disabled:text-gray-500 ${disabled ? 'bg-amber-50/60' : 'bg-white'}`;
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

export const CashFlowPage = ({ batches = [], customers = {}, sellers = {}, isAdmin = false, onSave, onDelete, initialCustomerFilter = '', onBack, onOpenPaymentRequest }) => {
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

  // Bỏ gộp 1 nhóm Mã lô: xoá Mã lô khỏi tất cả các dòng trong nhóm, trả về hiện riêng từng dòng như cũ.
  const handleUngroup = async (items) => {
    setGrouping(true);
    try {
      for (const it of items) {
        await onSave(it.row.id, { batch_code: null });
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

  const customerOptions = Object.entries(customers).map(([id, c]) => ({ value: id, label: `${id} — ${c.companyName}` }));
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
  // Chọn/gõ Số hóa đơn ở dòng gốc: áp dụng cho dòng ĐẦU TIÊN của nhóm (kèm Giá trị xuất hóa đơn nếu có),
  // các dòng con còn lại xoá Số hóa đơn + Giá trị xuất hóa đơn — vì thông tin này giờ chỉ lấy ở dòng gốc.
  const setGroupInvoice = async (rows, invoiceNo, invoiceAmount) => {
    const [first, ...rest] = rows;
    const firstPatch = { invoice_no: invoiceNo };
    if (invoiceAmount !== undefined) firstPatch.invoice_amount = invoiceAmount === '' ? 0 : Number(invoiceAmount) || 0;
    await commitRow(first.id, { ...first, ...firstPatch });
    for (const r of rest) {
      if (r.invoice_no || num(r.invoice_amount) !== 0) await commitRow(r.id, { ...r, invoice_no: null, invoice_amount: 0 });
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
    COLS.forEach(col => {
      if (col.key === keyField || col.type === 'computed' || SUM_KEYS.includes(col.key)) return;
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
      <tr key={`group-${groupKey}`} className="bg-gray-50/70 border-b border-gray-200">
        <td className="sticky left-0 bg-gray-50/70 px-2 border-r border-gray-200 align-top">
          <input type="checkbox" checked={groupIds.every(id => selectedIds.has(id))} onChange={() => toggleSelectGroup(groupIds)} />
        </td>
        {COLS.map(col => {
          let content;
          if (col.key === keyField) {
            content = (
              <span className="flex items-center gap-1.5">
                <button type="button" onClick={() => toggleCollapseBatch(groupKey)} className="text-gray-400 hover:text-blue-700">
                  {collapsed ? '⌄' : '︿'}
                </button>
                {keyField === 'payment_request_no' ? (
                  <button type="button" onClick={() => onOpenPaymentRequest?.(rows[0].customer_id, rows[0].payment_request_no)} className="text-blue-600 hover:text-blue-800 underline font-medium" title="Bấm để sửa lại ở Đề Nghị Thanh Toán">
                    {label}
                  </button>
                ) : (
                  <input
                    type="text" defaultValue={label} key={`${groupKey}-code-${label}`}
                    onBlur={(e) => renameGroupCode(items, e.target.value)}
                    title="Gõ để đổi tên Mã lô cho cả nhóm"
                    className="border border-gray-200 rounded px-1.5 py-0.5 text-sm text-blue-600 font-medium bg-white w-24"
                  />
                )}
                <button type="button" onClick={() => handleUngroup(items)} className="text-xs text-red-400 hover:text-red-600 underline" title="Bỏ gộp — tách các dòng con ra hiện riêng lại">
                  Bỏ gộp
                </button>
              </span>
            );
          } else if (col.key === 'invoice_no') {
            const same = commonValue('invoice_no');
            const pickInvoiceForGroup = (inv) => {
              setGroupInvoice(rows, inv.invoice_no, inv.total ?? '');
            };
            content = (
              <InvoiceLinkCell
                value={same || ''}
                onChange={(v) => setGroupInvoice(rows, v, undefined)}
                onPick={pickInvoiceForGroup}
                onBlur={() => {}}
              />
            );
          } else if (EDITABLE_SUM_KEYS.includes(col.key)) {
            content = (
              <input
                type="text" inputMode="numeric"
                defaultValue={sumField(col.key) ? fmtNum(sumField(col.key)) : ''}
                key={`${groupKey}-${col.key}-${sumField(col.key)}`}
                onBlur={(e) => { const raw = e.target.value.replace(/\D/g, ''); setGroupTotal(rows, col.key, raw); }}
                className="w-full border border-gray-200 rounded px-1.5 py-1 text-sm text-right bg-white"
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
          } else if (col.key === 'customer_id') {
            const same = commonValue('customer_id');
            content = same ? <span className="whitespace-normal break-words leading-snug">{customerLabel(same)}</span> : <span className="text-gray-400">—</span>;
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
        <td className="sticky right-0 bg-gray-50/70 px-2 border-l border-gray-200"></td>
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
      <tr key={isNew ? 'new' : row.id} className={isNew ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
        {!isNew && isFirstInGroup && (
          <td rowSpan={groupSize > 1 ? groupSize : undefined} className="sticky left-0 bg-white px-2 border-r border-gray-200 align-top">
            <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelectGroup(groupIds)} />
          </td>
        )}
        {isNew && <td className="sticky left-0 bg-blue-50/40 px-2 border-r border-gray-200 text-center text-blue-500 text-xs">Mới</td>}
        {COLS.map(col => {
          if (isChild && commonKeys.has(col.key)) {
            // Thông tin này giống nhau cho cả nhóm (kể cả cột định danh nhóm) — đã hiện 1 lần ở dòng gốc rồi, dòng con để trống.
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 bg-gray-50/40"></td>;
          }
          if (col.key === 'batch_code' && !isNew) {
            // Mã lô chỉ gán được qua nút "Gộp thành lô" (hiện ở dòng gốc) — không gõ tay trực tiếp vào ô của từng dòng nữa.
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 px-2 py-1.5 text-sm text-gray-400">
                {row.batch_code || '—'}
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
                  className="w-full border-0 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="">-- Chọn --</option>
                  {sellerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
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
                  {customerLabel(row.customer_id)}
                </td>
              );
            }
            return (
              <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 p-0">
                <select value={row.customer_id || ''} disabled={disabled}
                  onChange={e => isNew ? editNew('customer_id', e.target.value) : editExisting(row, 'customer_id', e.target.value)}
                  onBlur={async () => { if (isNew && row.customer_id) await commitRow(null, row); else if (!isNew && drafts[row.id]) await commitRow(row.id, row); }}
                  className="w-full border-0 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
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
            const map = { amountVnd: computed.amountVnd, cnyDiff: computed.remainderAfterGoods,
              amountDueMore: computed.amountDueMore, remainingDebt: computed.remainingDebt,
              totalCustomerTransferred: computed.totalCustomerTransferred, diffAmount: computed.diffAmount };
            // "Tiền hàng dự kiến" và "Phần dư sau khi thanh toán tiền hàng" vẫn hiện chi tiết từng dòng con —
            // các cột tự tính còn lại chỉ hiện tổng ở dòng gốc như trước.
            const SHOW_DETAIL_AT_CHILD = ['amountVnd', 'cnyDiff'];
            const blankAtChild = isChild && !SHOW_DETAIL_AT_CHILD.includes(col.key);
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100"><Cell col={col} value={blankAtChild ? '' : map[col.key]} /></td>;
          }
          if (isChild && col.key === 'invoice_no') {
            // Số hóa đơn chỉ cần lấy/hiện ở dòng gốc (đi cùng Giá trị xuất hóa đơn) — dòng con để trống.
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 bg-gray-50/40"></td>;
          }
          if (isChild && EDITABLE_SUM_KEYS.includes(col.key)) {
            // Đã gộp nhóm — số tổng nhập ở dòng gốc phía trên, dòng con không nhập riêng nữa.
            return <td key={col.key} style={{ minWidth: col.w }} className="border-r border-gray-100 bg-gray-50/40"></td>;
          }
          const disabled = (col.fromDntt && !isNew) || (col.adminOnly && disabledAdminOnly);
          const merging = disabled && MERGEABLE_KEYS.includes(col.key);
          if (merging && !isFirstInGroup) return null; // đã được gộp vào ô của dòng đầu nhóm
          const rowSpan = merging && groupSize > 1 ? groupSize : undefined;
          if (col.key === 'payment_request_no' && !isNew && row.payment_request_no != null) {
            return (
              <td key={col.key} rowSpan={rowSpan} style={{ minWidth: col.w }} className="border-r border-b border-gray-100 align-top px-2 py-1.5 text-sm bg-amber-50/60 text-right">
                <button type="button" onClick={() => onOpenPaymentRequest?.(row.customer_id, row.payment_request_no)}
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
    <div className="-mx-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 px-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">📊 ← Quay lại tổng hợp</button>
          <h1 className="text-2xl font-bold text-gray-800">💰 Theo dõi dòng tiền</h1>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size >= 2 && (
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
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block"></span> Dòng gốc (của 1 Mã lô đã gộp, hoặc tự động theo Số đề nghị TT) — tổng cộng dồn từ các dòng con bên dưới, bấm mũi tên để thu gọn/mở ra</span>
      </div>

      <div className="bg-white border-y border-gray-200 overflow-auto" style={{ maxHeight: '75vh' }}>
        <table className="text-sm border-collapse" style={{ minWidth: 3600 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="sticky left-0 bg-gray-50 px-2 py-2 border-r border-gray-200 z-20 w-8"></th>
              {COLS.map((col, i) => (
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
