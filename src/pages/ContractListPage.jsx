// File: src/pages/ContractListPage.jsx
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Badge } from '../components/Badge';
import { calcTotals, fmtNum } from '../helpers';
import { BulkContractViewer } from './BulkContractViewer';
import { SaleSearchDropdown } from '../components/SaleSearchDropdown';

const FEE_TYPES = ['DDH', 'BBBG', 'DDH_VC', 'BBBG_VC', 'DDH_UT', 'BBBG_UT'];
const PAGE_SIZE = 30;

export const ContractListPage = ({ type, contracts, customers, sellers, saleMap = {}, saleProfiles = [], setPage, setViewContract, onDelete, onDeleteMany, onAssign, onEdit }) => {
  const [assigningId, setAssigningId] = useState(null); // contractId đang được giao
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const labels = {
    HDNT: 'Hợp Đồng Nguyên Tắc', DDH: 'Đơn Đặt Hàng', BBBG: 'Biên Bản Bàn Giao',
    HDNT_VC: 'HĐ Nguyên Tắc (Vận chuyển)', DDH_VC: 'Đơn Đặt Dịch Vụ', BBBG_VC: 'Biên Bản Bàn Giao (Vận chuyển)',
    HDNT_UT: 'HĐ Nguyên Tắc (Ủy thác)', DDH_UT: 'Đơn Đặt Dịch Vụ Ủy Thác', BBBG_UT: 'Biên Bản Bàn Giao (Ủy thác)',
  };
  const createPages = {
    HDNT: 'create-hdnt', DDH: 'create-ddh', BBBG: 'create-bbbg',
    HDNT_VC: 'create-hdnt_vc', DDH_VC: 'create-ddh_vc', BBBG_VC: 'create-bbbg_vc',
    HDNT_UT: 'create-hdnt_ut', DDH_UT: 'create-ddh_ut', BBBG_UT: 'create-bbbg_ut',
  };
  const showTotal = FEE_TYPES.includes(type);

  const customerLabel = (c) => c.customerSnapshot?.companyName || customers[c.customerId]?.companyName || c.customerName || c.customerId;

  const allOfType = useMemo(
    () => Object.values(contracts).filter(c => c.type === type).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [contracts, type]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allOfType.filter(c => {
      const matchSearch = !q || c.contractId.toLowerCase().includes(q) || customerLabel(c).toLowerCase().includes(q);
      const matchFrom = !fromDate || (c.date || '') >= fromDate;
      const matchTo = !toDate || (c.date || '') <= toDate;
      return matchSearch && matchFrom && matchTo;
    });
  }, [allOfType, search, fromDate, toDate, customers]);

  const list = filtered.slice(0, visibleCount);
  const hasFilter = search || fromDate || toDate;

  const resetFilters = () => { setSearch(''); setFromDate(''); setToDate(''); setVisibleCount(PAGE_SIZE); setSelectedIds(new Set()); };

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleIds = list.map(c => c.contractId);
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

  const selectedContracts = allOfType.filter(c => selectedIds.has(c.contractId));

  const exportToExcel = () => {
    const data = filtered.map(c => {
      const sale = saleMap[c._createdBy] || saleMap[c._maSale];
      const row = {
        'Số hợp đồng': c.contractId,
        'Khách hàng': customerLabel(c),
        'Ngày': c.date || '',
      };
      if (showTotal) row['Tổng tiền'] = calcTotals(c.goods).total || 0;
      row['Sale'] = sale?.name || c._maSale || '';
      row['Phòng ban'] = sale?.deptName || '';
      row['Trạng thái'] = c.status || '';
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, labels[type].slice(0, 31));
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${labels[type].replace(/\s+/g, '_')}_${today}.xlsx`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{labels[type]}</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportToExcel} disabled={filtered.length === 0}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm disabled:opacity-50">📤 Xuất Excel</button>
          <button onClick={() => setPage(createPages[type])} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Tạo mới</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
          placeholder="🔍 Tìm theo số hợp đồng hoặc tên khách hàng..."
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span>Từ</span>
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <span>đến</span>
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        {hasFilter && (
          <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-700 px-2">✕ Xóa lọc</button>
        )}
      </div>

      {hasFilter && (
        <div className="text-xs text-gray-400 mb-2">Tìm thấy {filtered.length} / {allOfType.length} {labels[type]}</div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-3">
          <div className="text-sm text-blue-800 font-medium">✓ Đã chọn {selectedIds.size} hợp đồng</div>
          <div className="flex gap-2">
            <button onClick={() => setBulkOpen(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              🖨️ In / Tải gộp
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {allOfType.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Chưa có {labels[type]} nào</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Không tìm thấy {labels[type]} phù hợp với bộ lọc</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="cursor-pointer" />
              </th>
              <th className="text-left px-5 py-3">Số hợp đồng</th>
              <th className="text-left px-5 py-3">Khách hàng</th>
              <th className="text-left px-5 py-3">Ngày</th>
              {showTotal && <th className="text-left px-5 py-3">Tổng tiền</th>}
              <th className="text-left px-5 py-3">Sale</th>
              <th className="text-left px-5 py-3">Phòng ban</th>
              <th className="text-left px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map(c => {
                const total = calcTotals(c.goods).total;
                return (
                  <tr key={c.contractId} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(c.contractId)} onChange={() => toggleOne(c.contractId)} className="cursor-pointer" />
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-blue-700">{c.contractId}</td>
                    <td className="px-5 py-3 text-gray-700">{customerLabel(c)}</td>
                    <td className="px-5 py-3 text-gray-500">{c.date}</td>
                    {showTotal && <td className="px-5 py-3 text-gray-700 font-medium">{total ? fmtNum(total) + ' đ' : '–'}</td>}
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {saleProfiles.length > 0 ? (
                        assigningId === c.contractId ? (
                          <SaleSearchDropdown
                            saleProfiles={saleProfiles}
                            value={c._maSale || c._createdBy || ''}
                            onChange={async uuid => {
                              if (uuid) { try { await onAssign(c.contractId, uuid); } catch {} }
                              setAssigningId(null);
                            }}
                            placeholder="Chọn sale..."
                          />
                        ) : (
                          <button onClick={() => setAssigningId(c.contractId)}
                            className="hover:text-blue-600 hover:underline text-left w-full"
                            title="Bấm để giao cho sale khác">
                            {(saleMap[c._createdBy] || saleMap[c._maSale])?.name || c._maSale || <span className="text-gray-300 italic">Chưa gán</span>}
                          </button>
                        )
                      ) : (
                        (saleMap[c._createdBy] || saleMap[c._maSale])?.name || c._maSale || '–'
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{(saleMap[c._createdBy] || saleMap[c._maSale])?.deptName || '–'}</td>
                    <td className="px-5 py-3"><Badge color={c.status === 'Hoàn thành' ? 'green' : 'blue'}>{c.status}</Badge></td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <button onClick={() => setViewContract(c)} className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-3">Xem →</button>
                      <button onClick={() => onEdit(c)} className="text-yellow-600 hover:text-yellow-800 font-medium text-sm mr-3">Sửa</button>
                      <button onClick={() => onDelete(c.contractId)} className="text-red-500 hover:text-red-700 font-medium text-sm">Xóa</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {filtered.length > visibleCount && (
          <div className="p-4 text-center border-t border-gray-100">
            <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Xem thêm {Math.min(PAGE_SIZE, filtered.length - visibleCount)} hợp đồng (còn {filtered.length - visibleCount})
            </button>
          </div>
        )}
      </div>

      {bulkOpen && (
        <BulkContractViewer
          contracts={selectedContracts}
          sellers={sellers}
          customers={customers}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
};
