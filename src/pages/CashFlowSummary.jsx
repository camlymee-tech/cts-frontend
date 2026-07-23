// File: src/pages/CashFlowSummary.jsx
import { useState, useMemo } from 'react';
import { fmtNum } from '../helpers';
import { PaymentRequestPrint } from './PaymentRequestPrint';
import { CashFlowPage, deriveComputed } from './CashFlowPage';

export const CashFlowSummary = ({ batches = [], customers = {}, sellers = {}, isAdmin = false, onSave, onDelete, onOpenPaymentRequest }) => {
  const [search, setSearch] = useState('');
  const [printCustomerId, setPrintCustomerId] = useState(null);
  const [detailCustomerId, setDetailCustomerId] = useState(undefined); // undefined = không xem chi tiết; '' = xem tất cả; 'KHxxx' = 1 khách

  const rows = useMemo(() => {
    const byCustomer = {};
    batches.forEach(b => {
      const id = b.customer_id;
      if (!id) return;
      const c = deriveComputed(b);
      if (!byCustomer[id]) {
        byCustomer[id] = {
          customerId: id, batchCount: 0,
          totalInvoiceAmount: 0, totalAmountVnd: 0, totalDueOnArrival: 0,
          totalRemainingDebt: 0, batchesInDebt: 0,
        };
      }
      const r = byCustomer[id];
      r.batchCount += 1;
      r.totalInvoiceAmount += Number(b.invoice_amount) || 0;
      r.totalAmountVnd += Number(b.amount_vnd) || 0;
      r.totalDueOnArrival += Number(b.total_due_on_arrival) || 0;
      r.totalRemainingDebt += c.remainingDebt || 0;
      if (c.remainingDebt > 0) r.batchesInDebt += 1;
    });
    return Object.values(byCustomer);
  }, [batches]);

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
    totalRemainingDebt: acc.totalRemainingDebt + r.totalRemainingDebt,
  }), { batchCount: 0, totalInvoiceAmount: 0, totalAmountVnd: 0, totalDueOnArrival: 0, totalRemainingDebt: 0 });

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
          <h1 className="text-2xl font-bold text-gray-800">💰 Theo dõi dòng tiền — 📊 Tổng hợp công nợ</h1>
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
          <table className="w-full text-sm min-w-[900px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-3">Mã KH</th>
              <th className="text-right px-4 py-3">Số lô</th>
              <th className="text-right px-4 py-3">Tổng tiền xuất hóa đơn</th>
              <th className="text-right px-4 py-3">Tiền hàng</th>
              <th className="text-right px-4 py-3">Tổng phải thu khi hàng về (VNĐ)</th>
              <th className="text-right px-4 py-3">Công nợ còn lại</th>
              <th className="text-right px-4 py-3">Số lô còn nợ</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.customerId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{r.customerId}</td>
                  <td className="px-4 py-3 text-right">{r.batchCount}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(r.totalInvoiceAmount)}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(r.totalAmountVnd)}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(r.totalDueOnArrival)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.totalRemainingDebt > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmtNum(r.totalRemainingDebt)}</td>
                  <td className="px-4 py-3 text-right">{r.batchesInDebt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setDetailCustomerId(r.customerId)} className="text-gray-600 hover:text-gray-800 mr-3">🔍 Chi tiết</button>
                    <button onClick={() => setPrintCustomerId(r.customerId)} className="text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">🖨️ In DNTT</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td className="px-4 py-3">TỔNG CỘNG</td>
                <td className="px-4 py-3 text-right">{grandTotal.batchCount}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalInvoiceAmount)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalAmountVnd)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalDueOnArrival)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalRemainingDebt)}</td>
                <td className="px-4 py-3" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};
