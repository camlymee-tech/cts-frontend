// File: src/pages/InvoiceGoodsPage.jsx
import { useState, useRef, useMemo } from 'react';
import { parseInvoiceGoodsFile } from '../utils/invoiceGoodsExcel';
import { normalizeText } from '../utils/customerExcel';
import { fmtNum } from '../helpers';
import { InvoiceGoodsBulkViewer } from './InvoiceGoodsBulkViewer';

const PAGE_SIZE = 50;

// Đối chiếu khách hàng của hóa đơn với danh sách Khách hàng thật để lấy đúng Sale phụ trách —
// giống hệt cách "Áp dụng hóa đơn" bên ĐĐH/BBBG đang làm (ưu tiên Mã KH, không có thì so tên).
function resolveSaleName(inv, customers) {
  if (inv.customer_code && customers[inv.customer_code]) {
    return customers[inv.customer_code].assignedSale?.name || '';
  }
  if (inv.customer_name) {
    const target = normalizeText(inv.customer_name);
    const found = Object.values(customers).find((c) => normalizeText(c.companyName) === target);
    if (found) return found.assignedSale?.name || '';
  }
  return '';
}

export const InvoiceGoodsPage = ({ invoiceGoods = [], customers = {}, sellers = {}, onBulkImport, onDelete, onDeleteMany }) => {
  const [search, setSearch] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [saleFilter, setSaleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { done, total } | null
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const fileRef = useRef(null);

  // Gắn sẵn tên Sale (đối chiếu theo khách hàng) vào từng hóa đơn để lọc/hiển thị
  const enriched = useMemo(
    () => invoiceGoods.map((inv) => ({ ...inv, _saleName: resolveSaleName(inv, customers) })),
    [invoiceGoods, customers]
  );

  const sellerOptions = useMemo(
    () => [...new Set(enriched.map((inv) => inv.seller_name).filter(Boolean))].sort(),
    [enriched]
  );
  const saleOptions = useMemo(
    () => [...new Set(enriched.map((inv) => inv._saleName).filter(Boolean))].sort(),
    [enriched]
  );

  const resetPage = () => setVisibleCount(PAGE_SIZE);

  const filtered = enriched.filter((inv) => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s
      || (inv.invoice_no || '').toLowerCase().includes(s)
      || (inv.customer_name || '').toLowerCase().includes(s)
      || (inv.customer_code || '').toLowerCase().includes(s);
    const matchSeller = !sellerFilter || inv.seller_name === sellerFilter;
    const matchSale = !saleFilter || inv._saleName === saleFilter;
    const matchFrom = !dateFrom || (inv.invoice_date && inv.invoice_date >= dateFrom);
    const matchTo = !dateTo || (inv.invoice_date && inv.invoice_date <= dateTo);
    return matchSearch && matchSeller && matchSale && matchFrom && matchTo;
  });

  const list = filtered.slice(0, visibleCount);
  const hasActiveFilters = search || sellerFilter || saleFilter || dateFrom || dateTo;

  const handlePickFile = () => fileRef.current?.click();

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Chỉ áp dụng "chọn tất cả" cho các dòng đang hiển thị (trang hiện tại), tránh chọn nhầm hàng nghìn dòng ẩn
  const visibleIds = list.map(inv => inv.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      }
      return new Set([...prev, ...visibleIds]);
    });
  };

  const selectedInvoices = invoiceGoods.filter(inv => selectedIds.has(inv.id));

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportProgress(null);
    try {
      const { invoices, errors } = await parseInvoiceGoodsFile(file);
      if (invoices.length === 0) {
        alert(`Không đọc được hóa đơn nào.\n\n${errors.join('\n') || 'File không có dữ liệu hợp lệ.'}`);
        return;
      }
      const proceed = confirm(
        `Tìm thấy ${invoices.length} hóa đơn trong file.` +
        (errors.length ? `\nCó ${errors.length} dòng bị bỏ qua (thiếu Số hóa đơn hoặc Tên hàng).` : '') +
        `\n\nBấm OK để nhập vào hệ thống. Số hóa đơn đã có sẽ được cập nhật đè lên dữ liệu cũ.` +
        (invoices.length > 300 ? `\n\nFile khá lớn — hệ thống sẽ nhập theo từng đợt, có thể mất vài phút, đừng tắt trình duyệt.` : '')
      );
      if (!proceed) return;

      const result = await onBulkImport(invoices, (done, total) => setImportProgress({ done, total }));
      let msg = `Đã nhập thành công ${result.success} hóa đơn.`;
      if (result.failed) msg += `\nLỗi: ${result.errors.join('\n')}`;
      alert(msg);
    } catch (err) {
      alert('Không đọc được file: ' + err.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const clearFilters = () => {
    setSearch(''); setSellerFilter(''); setSaleFilter(''); setDateFrom(''); setDateTo('');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">📦 Hàng hóa theo hóa đơn</h1>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChosen} className="hidden" />
          <button onClick={handlePickFile} disabled={importing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow disabled:opacity-50">
            {importing
              ? (importProgress ? `⏳ Đang nhập ${importProgress.done}/${importProgress.total}...` : '⏳ Đang đọc file...')
              : '📥 Nhập Excel'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm mb-4">
        Nhập file Excel "Thông tin hàng hóa" (mỗi dòng là 1 mặt hàng; các dòng cùng <b>Số hóa đơn</b> sẽ tự gộp lại thành 1 hóa đơn).
        Sau khi nhập, khi tạo <b>Đơn đặt hàng</b> hoặc <b>Biên bản bàn giao</b>, chỉ cần chọn đúng Số hóa đơn là hàng hóa + giá trị sẽ tự động điền vào.
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="🔍 Tìm theo số hóa đơn, mã/tên khách hàng..."
          className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />

        <div>
          <label className="block text-xs text-gray-500 mb-1">Công ty bán</label>
          <select value={sellerFilter} onChange={(e) => { setSellerFilter(e.target.value); resetPage(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Tất cả bên bán</option>
            {sellerOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Sale phụ trách</label>
          <select value={saleFilter} onChange={(e) => { setSaleFilter(e.target.value); resetPage(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Tất cả Sale</option>
            {saleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">✕ Xóa lọc</button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="text-xs text-gray-400 mb-2">Hiện {list.length} / {filtered.length} hóa đơn{invoiceGoods.length !== filtered.length ? ` (tổng cộng ${invoiceGoods.length})` : ''}</div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-3">
          <div className="text-sm text-blue-800 font-medium">✓ Đã chọn {selectedIds.size} hóa đơn</div>
          <div className="flex gap-2">
            <button onClick={() => setBulkOpen(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              🖨️ In gộp
            </button>
            <button
              onClick={async () => { const ok = await onDeleteMany(Array.from(selectedIds)); if (ok) setSelectedIds(new Set()); }}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              🗑️ Xóa gộp
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-blue-700 hover:underline px-2">Bỏ chọn</button>
          </div>
        </div>
      )}

      {bulkOpen && <InvoiceGoodsBulkViewer invoices={selectedInvoices} onClose={() => setBulkOpen(false)} />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {invoiceGoods.length === 0 ? 'Chưa có hóa đơn nào. Bấm "Nhập Excel" để bắt đầu.' : 'Không tìm thấy hóa đơn phù hợp.'}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="cursor-pointer" />
              </th>
              <th className="text-left px-5 py-3 w-14">STT</th>
              <th className="text-left px-5 py-3">Số hóa đơn</th>
              <th className="text-left px-5 py-3">Ngày</th>
              <th className="text-left px-5 py-3">Khách hàng</th>
              <th className="text-left px-5 py-3">Công ty bán</th>
              <th className="text-left px-5 py-3">Sale</th>
              <th className="text-left px-5 py-3">Số mặt hàng</th>
              <th className="text-right px-5 py-3">Tổng tiền</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map((inv, idx) => (
                <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleOne(inv.id)} className="cursor-pointer" />
                  </td>
                  <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-3 font-mono font-bold text-blue-600 relative group cursor-default">
                    {inv.invoice_no}
                    <div className="hidden group-hover:block absolute z-30 left-0 top-full mt-1 w-96 bg-gray-800 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none">
                      <div className="font-semibold mb-1.5">Chi tiết hàng hóa ({inv.goods?.length || 0} mặt hàng):</div>
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {(inv.goods || []).map((g, i) => (
                          <div key={i} className="flex justify-between gap-2 border-b border-gray-700 pb-1">
                            <span className="flex-1">{i + 1}. {g.tenHang} ({g.dvt}) — SL {fmtNum(g.soLuong)} × {fmtNum(g.donGia)}</span>
                            <span className="whitespace-nowrap">{fmtNum(g.thanhTien)} đ</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-right font-semibold mt-1.5 pt-1 border-t border-gray-600">Tổng: {fmtNum(inv.total || 0)} đ</div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{inv.invoice_date || '–'}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.customer_name || '–'}{inv.customer_code ? ` (${inv.customer_code})` : ''}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.seller_name || '–'}</td>
                  <td className="px-5 py-3 text-gray-600">{inv._saleName || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.goods?.length || 0}</td>
                  <td className="px-5 py-3 text-right font-medium">{fmtNum(inv.total || 0)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => onDelete(inv.id)} className="text-red-500 hover:text-red-700">Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {visibleCount < filtered.length && (
          <div className="p-4 text-center border-t border-gray-100">
            <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Xem thêm ({filtered.length - visibleCount} hóa đơn còn lại)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
