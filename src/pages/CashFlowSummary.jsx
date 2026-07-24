// File: src/pages/CashFlowSummary.jsx
import { useState, useMemo } from 'react';
import { fmtNum } from '../helpers';
import { PaymentRequestPrint } from './PaymentRequestPrint';
import { CashFlowPage, deriveComputed } from './CashFlowPage';

export const CashFlowSummary = ({ batches = [], customers = {}, sellers = {}, isAdmin = false, saleProfiles = [], onSave, onDelete, onOpenPaymentRequest }) => {
  const [search, setSearch] = useState('');
  const [printCustomerId, setPrintCustomerId] = useState(null);
  const [detailCustomerId, setDetailCustomerId] = useState(undefined); // undefined = không xem chi tiết; '' = xem tất cả; 'KHxxx' = 1 khách

  // Tra Mã Sale + Tên Sale theo uuid người tạo lô (created_by) — chỉ admin mới thấy được cột này.
  const saleInfoByUuid = useMemo(() => Object.fromEntries(saleProfiles.map(p => [p.uuid, { code: p.ma_sale, name: p.name }])), [saleProfiles]);

  const rows = useMemo(() => {
    const byCustomer = {};
    batches.forEach(b => {
      const id = b.customer_id;
      if (!id) return;
      const c = deriveComputed(b);
      if (!byCustomer[id]) {
        byCustomer[id] = {
          customerId: id, batchCount: 0,
          totalInvoiceAmount: 0, totalAmountVnd: 0, totalDueOnArrival: 0, totalTransferredToCompany: 0,
          totalRemainingDebt: 0, batchesInDebt: 0, saleCode: saleInfoByUuid[b.created_by]?.code || '', saleName: saleInfoByUuid[b.created_by]?.name || '',
        };
      }
      const r = byCustomer[id];
      r.batchCount += 1;
      r.totalInvoiceAmount += Number(b.invoice_amount) || 0;
      r.totalAmountVnd += Number(b.amount_vnd) || 0;
      r.totalDueOnArrival += Number(b.total_due_on_arrival) || 0;
      r.totalTransferredToCompany += c.totalCustomerTransferred || 0;
      r.totalRemainingDebt += c.remainingDebt || 0;
      if (c.remainingDebt > 0) r.batchesInDebt += 1;
    });
    return Object.values(byCustomer);
  }, [batches, saleInfoByUuid]);

  const customerLabel = (id) => customers[id]?.companyName || id;

  const filtered = rows.filter(r => {
    const s = search.trim().toLowerCase();
    return !s || r.customerId.toLowerCase().includes(s) || customerLabel(r.customerId).toLowerCase().includes(s);
  });

  const grandTotal = filtered.reduce((acc, r) => ({
    batchCount: acc.batchCount + r.batchCount,
    totalInvoiceAmount: acc.totalInvoiceAmount + r.totalInvoiceAmount,
    totalAmountVnd: acc.totalAmountVnd + r.totalAmountVnd,
    totalDueOnArrival: acc.totalDueOnArrival + r.totalDueOnArrival,
    totalTransferredToCompany: acc.totalTransferredToCompany + r.totalTransferredToCompany,
    totalRemainingDebt: acc.totalRemainingDebt + r.totalRemainingDebt,
  }), { batchCount: 0, totalInvoiceAmount: 0, totalAmountVnd: 0, totalDueOnArrival: 0, totalTransferredToCompany: 0, totalRemainingDebt: 0 });

  if (detailCustomerId !== undefined) {
    return (
      <CashFlowPage
        batches={batches} customers={customers} sellers={sellers} isAdmin={isAdmin}
        onSave={onSave} onDelete={onDelete}
        initialCustomerFilter={detailCustomerId}
        onBack={() => setDetailCustomerId(undefined)}
        onOpenPaymentRequest={onOpenPaymentRequest}
      />
    );
  }

  if (printCustomerId) {
    const batchesOfCustomer = batches.filter(b => b.customer_id === printCustomerId);
    return (
      <PaymentRequestPrint
        customerId={printCustomerId}
        customer={customers[printCustomerId]}
        batches={batchesOfCustomer}
        customers={customers}
        sellers={sellers}
        onSave={onSave}
        onClose={() => setPrintCustomerId(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">📊 Theo dõi từng khách</h1>
        </div>
        <button onClick={() => setDetailCustomerId('')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Nhập / xem lô hàng</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo mã hoặc tên khách hàng..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có dữ liệu lô hàng nào để tổng hợp.</div>
        ) : (
          <table className="w-full text-sm min-w-[950px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-3 font-semibold">Mã KH</th>
              {isAdmin && <th className="text-left px-4 py-3 font-semibold">Mã Sale</th>}
              {isAdmin && <th className="text-left px-4 py-3 font-semibold">Tên Sale</th>}
              <th className="text-center px-4 py-3 font-semibold">Số lô</th>
              <th className="text-right px-4 py-3 font-semibold">Tổng tiền xuất hóa đơn</th>
              <th className="text-right px-4 py-3 font-semibold">Tổng tiền KH chuyển vào Cty</th>
              <th className="text-right px-4 py-3 font-semibold">Tiền hàng</th>
              <th className="text-right px-4 py-3 font-semibold">Phải trả cho CTS (VNĐ)</th>
              <th className="text-right px-4 py-3 font-semibold text-rose-700 bg-rose-50">Công nợ còn lại</th>
              <th className="text-center px-4 py-3 font-semibold text-rose-700 bg-rose-50">Số lô còn nợ</th>
              <th className="px-4 py-3 w-24"></th>
            </tr></thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.customerId} className={`border-t border-gray-100 hover:bg-blue-50/40 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{r.customerId}</td>
                  {isAdmin && <td className="px-4 py-3 text-gray-600">{r.saleCode || '—'}</td>}
                  {isAdmin && <td className="px-4 py-3 text-gray-600">{r.saleName || '—'}</td>}
                  <td className="px-4 py-3 text-center text-gray-600">{r.batchCount}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtNum(r.totalInvoiceAmount)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtNum(r.totalTransferredToCompany)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtNum(r.totalAmountVnd)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtNum(r.totalDueOnArrival)}</td>
                  <td className={`px-4 py-3 text-right font-semibold bg-rose-50/70 ${r.totalRemainingDebt > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmtNum(r.totalRemainingDebt)}</td>
                  <td className="px-4 py-3 text-center font-medium bg-rose-50/70 text-gray-700">{r.batchesInDebt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setDetailCustomerId(r.customerId)} className="text-gray-600 hover:text-gray-800">🔍 Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td className="px-4 py-3">TỔNG CỘNG</td>
                {isAdmin && <td className="px-4 py-3"></td>}
                {isAdmin && <td className="px-4 py-3"></td>}
                <td className="px-4 py-3 text-center">{grandTotal.batchCount}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalInvoiceAmount)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalTransferredToCompany)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalAmountVnd)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalDueOnArrival)}</td>
                <td className="px-4 py-3 text-right bg-rose-100/70 text-rose-700">{fmtNum(grandTotal.totalRemainingDebt)}</td>
                <td className="px-4 py-3 bg-rose-100/70" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};
