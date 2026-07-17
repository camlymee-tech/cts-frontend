// File: src/components/InvoiceGoodsPicker.jsx
import { useState, useRef, useEffect } from 'react';

// Đổi ngày yyyy-mm-dd sang dd/mm/yyyy cho dễ đọc; giữ nguyên nếu không đúng định dạng
const fmtDateShort = (d) => {
  if (!d) return '';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

// Ghép nhãn hiển thị: Số hóa đơn • Ngày • Khách hàng • Công ty bán
const labelOf = (inv) => {
  const parts = [inv.invoice_no];
  if (inv.invoice_date) parts.push(fmtDateShort(inv.invoice_date));
  if (inv.customer_name) parts.push(inv.customer_name);
  if (inv.seller_name) parts.push(inv.seller_name);
  return parts.join(' • ');
};

export const InvoiceGoodsPicker = ({ invoiceGoods = [], onApply }) => {
  const [selectedId, setSelectedId] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  if (invoiceGoods.length === 0) return null;

  const match = invoiceGoods.find((inv) => inv.id === selectedId);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? invoiceGoods.filter((inv) =>
        inv.invoice_no.toLowerCase().includes(q) ||
        (inv.customer_name || '').toLowerCase().includes(q) ||
        (inv.customer_code || '').toLowerCase().includes(q) ||
        (inv.seller_name || '').toLowerCase().includes(q)
      )
    : invoiceGoods;

  const pick = (inv) => { setSelectedId(inv.id); setQuery(''); setOpen(false); };
  const apply = () => { if (match) onApply(match); };

  return (
    <div className="flex items-center gap-2 flex-wrap bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">📦 Chọn số hóa đơn có sẵn:</span>
      <div ref={boxRef} className="relative min-w-[280px]">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-300">
          <span className={`truncate ${match ? 'text-gray-800' : 'text-gray-400'}`}>
            {match ? labelOf(match) : '-- Chọn --'}
          </span>
          <span className="text-gray-400 ml-2 shrink-0">▾</span>
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full min-w-[420px] bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
            <div className="p-2 border-b border-gray-100">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="🔍 Tìm theo số hóa đơn, tên khách hàng hoặc bên bán..."
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="overflow-y-auto max-h-64">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400 text-center">Không tìm thấy kết quả</div>
              ) : filtered.map((inv) => (
                <button key={inv.id} type="button" onClick={() => pick(inv)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${inv.id === selectedId ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'}`}>
                  {labelOf(inv)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={apply} disabled={!match}
        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
        Áp dụng
      </button>
      {match && (
        <span className="text-xs text-gray-500">
          {match.goods?.length || 0} mặt hàng
        </span>
      )}
    </div>
  );
};
