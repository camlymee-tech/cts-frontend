// File: src/pages/CashFlowSummary.jsx
import { useState, useMemo } from 'react';
import { fmtNum } from '../helpers';
import { PaymentRequestPrint } from './PaymentRequestPrint';
import { deriveComputed } from './CashFlowPage';

export const CashFlowSummary = ({ batches = [], customers = {}, sellers = {}, onBack }) => {
  const [search, setSearch] = useState('');
  const [printCustomerId, setPrintCustomerId] = useState(null);

  const rows = useMemo(() => {
    const byCustomer = {};
    batches.forEach(b => {
      const id = b.customer_id;
      if (!id) return;
      const c = deriveComputed(b);
      if (!byCustomer[id]) {
        byCustomer[id] = {
          customerId: id, sellerIds: new Set(), batchCount: 0,
          totalAmountVnd: 0, totalDeposit: 0, totalDueMore: 0, totalCollected: 0,
          totalRemainingDebt: 0, batchesInDebt: 0, maxOverdueDays: 0,
        };
      }
      const r = byCustomer[id];
      r.batchCount += 1;
      if (b.seller_id) r.sellerIds.add(b.seller_id);
      r.totalAmountVnd += Number(b.amount_vnd) || 0;
      r.totalDeposit += Number(b.deposit_vnd) || 0;
      r.totalDueMore += c.amountDueMore || 0;
      r.totalCollected += Number(b.actual_collected) || 0;
      r.totalRemainingDebt += c.remainingDebt || 0;
      if (c.remainingDebt > 0) r.batchesInDebt += 1;
      if (c.isOverdue) r.maxOverdueDays = Math.max(r.maxOverdueDays, c.overdueDays);
    });
    return Object.values(byCustomer);
  }, [batches]);

  const customerLabel = (id) => customers[id]?.companyName || id;
  const sellerLabelList = (idSet) => [...idSet].map(id => sellers[id]?.companyName || id).join(', ');

  const filtered = rows.filter(r => {
    const s = search.trim().toLowerCase();
    return !s || r.customerId.toLowerCase().includes(s) || customerLabel(r.customerId).toLowerCase().includes(s);
  });

  const grandTotal = filtered.reduce((acc, r) => ({
    batchCount: acc.batchCount + r.batchCount,
    totalAmountVnd: acc.totalAmountVnd + r.totalAmountVnd,
    totalDeposit: acc.totalDeposit + r.totalDeposit,
    totalDueMore: acc.totalDueMore + r.totalDueMore,
    totalCollected: acc.totalCollected + r.totalCollected,
    totalRemainingDebt: acc.totalRemainingDebt + r.totalRemainingDebt,
  }), { batchCount: 0, totalAmountVnd: 0, totalDeposit: 0, totalDueMore: 0, totalCollected: 0, totalRemainingDebt: 0 });

  if (printCustomerId) {
    const batchesOfCustomer = batches.filter(b => b.customer_id === printCustomerId);
    return (
      <PaymentRequestPrint
        customerId={printCustomerId}
        customer={customers[printCustomerId]}
        batches={batchesOfCustomer}
        onClose={() => setPrintCustomerId(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">← Quay lại</button>
          <h1 className="text-2xl font-bold text-gray-800">📊 Bảng báo cáo tổng hợp công nợ</h1>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo mã hoặc tên khách hàng..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có dữ liệu lô hàng nào để tổng hợp.</div>
        ) : (
          <table className="w-full text-sm min-w-[1100px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-3">Cty thu tiền</th>
              <th className="text-left px-4 py-3">Mã KH</th>
              <th className="text-left px-4 py-3">Tên khách hàng</th>
              <th className="text-right px-4 py-3">Số lô</th>
              <th className="text-right px-4 py-3">Tiền hàng</th>
              <th className="text-right px-4 py-3">Tiền cọc</th>
              <th className="text-right px-4 py-3">Còn phải thu</th>
              <th className="text-right px-4 py-3">Tiền đã thu</th>
              <th className="text-right px-4 py-3">Công nợ còn lại</th>
              <th className="text-right px-4 py-3">Số ngày nợ quá hạn</th>
              <th className="text-right px-4 py-3">Số lô còn nợ</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.customerId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{sellerLabelList(r.sellerIds) || '—'}</td>
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{r.customerId}</td>
                  <td className="px-4 py-3 text-gray-700">{customerLabel(r.customerId)}</td>
                  <td className="px-4 py-3 text-right">{r.batchCount}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(r.totalAmountVnd)}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(r.totalDeposit)}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(r.totalDueMore)}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(r.totalCollected)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.totalRemainingDebt > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmtNum(r.totalRemainingDebt)}</td>
                  <td className="px-4 py-3 text-right">{r.maxOverdueDays || '—'}</td>
                  <td className="px-4 py-3 text-right">{r.batchesInDebt}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setPrintCustomerId(r.customerId)} className="text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">🖨️ In DNTT</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td className="px-4 py-3" colSpan={3}>TỔNG CỘNG</td>
                <td className="px-4 py-3 text-right">{grandTotal.batchCount}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalAmountVnd)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalDeposit)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalDueMore)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalCollected)}</td>
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
