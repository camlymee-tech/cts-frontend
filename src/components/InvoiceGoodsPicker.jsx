// File: src/components/InvoiceGoodsPicker.jsx
import { useState } from 'react';

export const InvoiceGoodsPicker = ({ invoiceGoods = [], onApply }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const match = invoiceGoods.find((inv) => inv.invoice_no === invoiceNo);

  const apply = () => {
    if (!match) return;
    onApply(match);
  };

  if (invoiceGoods.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">📦 Chọn số hóa đơn có sẵn:</span>
      <select value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[200px]">
        <option value="">-- Chọn --</option>
        {invoiceGoods.map((inv) => (
          <option key={inv.id} value={inv.invoice_no}>
            {inv.invoice_no}{inv.customer_name ? ` – ${inv.customer_name}` : ''}
          </option>
        ))}
      </select>
      <button onClick={apply} disabled={!match}
        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
        Áp dụng
      </button>
      {match && (
        <span className="text-xs text-gray-500">
          {match.goods?.length || 0} mặt hàng{match.invoice_date ? `, ngày ${match.invoice_date}` : ''}
        </span>
      )}
    </div>
  );
};
