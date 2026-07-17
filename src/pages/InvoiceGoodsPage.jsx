// File: src/pages/InvoiceGoodsPage.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { parseInvoiceGoodsFile } from '../utils/invoiceGoodsExcel';
import { fmtNum } from '../helpers';
import { api } from '../lib/api';
import { Pagination } from '../components/Pagination';
import { InvoiceGoodsBulkViewer } from './InvoiceGoodsBulkViewer';

const PAGE_SIZE = 50;

// Bảng invoice_goods đã lên tới hàng chục nghìn dòng — không còn tải hết về client để lọc/phân trang
// nữa (từng khiến supabase-js tự lặp request 1000 dòng/lần để lấy hết, rất chậm). Giờ dùng RPC
// list_invoice_goods_paged để lọc + phân trang ngay ở DB, chỉ tải đúng số dòng cần hiển thị.
export const InvoiceGoodsPage = ({ onBulkImport, onDelete, onDeleteMany }) => {
  const [search, setSearch] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [saleFilter, setSaleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { done, total } | null
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const fileRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1); // 1-indexed
  const [loading, setLoading] = useState(true);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [saleOptions, setSaleOptions] = useState([]);

  const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // Đánh dấu request đang gọi mới nhất — nếu đổi filter/trang liên tiếp nhanh, request cũ trả về
  // trễ hơn request mới sẽ bị bỏ qua, tránh ghi đè kết quả đúng bằng dữ liệu đã lỗi thời.
  const requestIdRef = useRef(0);

  // Danh sách option cho 2 dropdown lọc — tải riêng 1 lần, nhẹ, không đụng cột hàng hóa nặng
  useEffect(() => {
    api.invoiceGoodsFilterOptions()
      .then(({ sellers: s, sales }) => { setSellerOptions(s); setSaleOptions(sales); })
      .catch(() => {});
  }, []);

  const loadPage = useCallback(async (pageToLoad) => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const { rows: newRows, totalCount: tc } = await api.listInvoiceGoodsPaged({
        search, seller: sellerFilter, sale: saleFilter, dateFrom, dateTo,
        limit: PAGE_SIZE, offset: (pageToLoad - 1) * PAGE_SIZE,
      });
      if (myRequestId !== requestIdRef.current) return; // đã có request mới hơn chạy sau, bỏ kết quả này
      // Trang hiện tại vừa bị xóa hết dòng cuối (VD: xóa dòng duy nhất ở trang cuối) — lùi về trang trước
      if (newRows.length === 0 && pageToLoad > 1 && tc > 0) {
        setPage(pageToLoad - 1);
        return;
      }
      setRows(newRows);
      setTotalCount(tc);
      setPage(pageToLoad);
    } catch (e) {
      console.error('Không tải được danh sách hóa đơn:', e.message);
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }, [search, sellerFilter, saleFilter, dateFrom, dateTo]);

  // Gõ tìm kiếm: debounce 300ms để tránh gọi API liên tục theo từng ký tự; đổi bộ lọc luôn quay về trang 1
  useEffect(() => {
    const t = setTimeout(() => { loadPage(1); setSelectedIds(new Set()); }, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sellerFilter, saleFilter, dateFrom, dateTo]);

  const handlePickFile = () => fileRef.current?.click();

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Chỉ áp dụng "chọn tất cả" cho các dòng đang tải sẵn (trang hiện tại), tránh chọn nhầm hàng nghìn dòng chưa tải
  const visibleIds = rows.map(inv => inv.id);
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

  const selectedInvoices = rows.filter(inv => selectedIds.has(inv.id));

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
      await loadPage(1); // tải lại để phản ánh dữ liệu vừa nhập
    } catch (err) {
      alert('Không đọc được file: ' + err.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleDeleteOne = async (id) => {
    const ok = await onDelete(id);
    if (ok) {
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      await loadPage(page); // tải lại trang hiện tại từ server (tự lùi trang nếu vừa xóa hết dòng cuối)
    }
  };

  const handleDeleteMany = async () => {
    const ids = Array.from(selectedIds);
    const ok = await onDeleteMany(ids);
    if (ok) {
      setSelectedIds(new Set());
      await loadPage(page);
    }
  };

  const clearFilters = () => { setSearch(''); setSellerFilter(''); setSaleFilter(''); setDateFrom(''); setDateTo(''); };
  const hasActiveFilters = search || sellerFilter || saleFilter || dateFrom || dateTo;

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
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm theo số hóa đơn, mã/tên khách hàng..."
          className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />

        <div>
          <label className="block text-xs text-gray-500 mb-1">Công ty bán</label>
          <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Tất cả bên bán</option>
            {sellerOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Sale phụ trách</label>
          <select value={saleFilter} onChange={(e) => setSaleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Tất cả Sale</option>
            {saleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">✕ Xóa lọc</button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="text-xs text-gray-400 mb-2">Trang {page}/{maxPage} — tổng cộng {totalCount} hóa đơn</div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-3">
          <div className="text-sm text-blue-800 font-medium">✓ Đã chọn {selectedIds.size} hóa đơn</div>
          <div className="flex gap-2">
            <button onClick={() => setBulkOpen(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              🖨️ In gộp
            </button>
            <button onClick={handleDeleteMany} className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100">
              🗑️ Xóa gộp
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-blue-700 hover:underline px-2">Bỏ chọn</button>
          </div>
        </div>
      )}

      {bulkOpen && <InvoiceGoodsBulkViewer invoices={selectedInvoices} onClose={() => setBulkOpen(false)} />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {loading ? '⏳ Đang tải danh sách hóa đơn...' : hasActiveFilters ? 'Không tìm thấy hóa đơn phù hợp.' : 'Chưa có hóa đơn nào. Bấm "Nhập Excel" để bắt đầu.'}
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
              {rows.map((inv, idx) => (
                <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleOne(inv.id)} className="cursor-pointer" />
                  </td>
                  <td className="px-5 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
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
                  <td className="px-5 py-3 text-gray-600">{inv.sale_name || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.goods?.length || 0}</td>
                  <td className="px-5 py-3 text-right font-medium">{fmtNum(inv.total || 0)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => handleDeleteOne(inv.id)} className="text-red-500 hover:text-red-700">Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} maxPage={maxPage} onChange={loadPage} disabled={loading} />
      </div>
    </div>
  );
};
