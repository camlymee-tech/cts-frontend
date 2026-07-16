// File: src/pages/InvoiceGoodsPage.jsx
import { useState, useRef } from 'react';
import { parseInvoiceGoodsFile } from '../utils/invoiceGoodsExcel';
import { fmtNum } from '../helpers';

export const InvoiceGoodsPage = ({ invoiceGoods = [], onBulkImport, onDelete }) => {
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const filtered = invoiceGoods.filter((inv) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      (inv.invoice_no || '').toLowerCase().includes(s) ||
      (inv.customer_name || '').toLowerCase().includes(s) ||
      (inv.customer_code || '').toLowerCase().includes(s)
    );
  });

  const handlePickFile = () => fileRef.current?.click();

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const { invoices, errors } = await parseInvoiceGoodsFile(file);
      if (invoices.length === 0) {
        alert(`Không đọc được hóa đơn nào.\n\n${errors.join('\n') || 'File không có dữ liệu hợp lệ.'}`);
        return;
      }
      const proceed = confirm(
        `Tìm thấy ${invoices.length} hóa đơn trong file.` +
        (errors.length ? `\nCó ${errors.length} dòng bị bỏ qua (thiếu Số hóa đơn hoặc Tên hàng).` : '') +
        `\n\nBấm OK để nhập vào hệ thống. Số hóa đơn đã có sẽ được cập nhật đè lên dữ liệu cũ.`
      );
      if (!proceed) return;

      const result = await onBulkImport(invoices);
      let msg = `Đã nhập thành công ${result.success} hóa đơn.`;
      if (result.failed) msg += `\nLỗi: ${result.errors.join('\n')}`;
      alert(msg);
    } catch (err) {
      alert('Không đọc được file: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">📦 Hàng hóa theo hóa đơn</h1>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChosen} className="hidden" />
          <button onClick={handlePickFile} disabled={importing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow disabled:opacity-50">
            {importing ? '⏳ Đang nhập...' : '📥 Nhập Excel'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm mb-4">
        Nhập file Excel "Thông tin hàng hóa" (mỗi dòng là 1 mặt hàng; các dòng cùng <b>Số hóa đơn</b> sẽ tự gộp lại thành 1 hóa đơn).
        Sau khi nhập, khi tạo <b>Đơn đặt hàng</b> hoặc <b>Biên bản bàn giao</b>, chỉ cần chọn đúng Số hóa đơn là hàng hóa + giá trị sẽ tự động điền vào.
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm theo số hóa đơn, mã/tên khách hàng..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {invoiceGoods.length === 0 ? 'Chưa có hóa đơn nào. Bấm "Nhập Excel" để bắt đầu.' : 'Không tìm thấy hóa đơn phù hợp.'}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-5 py-3 w-14">STT</th>
              <th className="text-left px-5 py-3">Số hóa đơn</th>
              <th className="text-left px-5 py-3">Ngày</th>
              <th className="text-left px-5 py-3">Khách hàng</th>
              <th className="text-left px-5 py-3">Số mặt hàng</th>
              <th className="text-right px-5 py-3">Tổng tiền</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((inv, idx) => (
                <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-3 font-mono font-bold text-blue-600">{inv.invoice_no}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.invoice_date || '–'}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.customer_name || '–'}{inv.customer_code ? ` (${inv.customer_code})` : ''}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.goods?.length || 0}</td>
                  <td className="px-5 py-3 text-right font-medium">{fmtNum(inv.total || 0)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => onDelete(inv.id)} className="text-red-500 hover:text-red-700">Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
