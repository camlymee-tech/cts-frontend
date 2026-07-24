// File: src/pages/CnyFundPage.jsx
// Theo dõi hợp đồng ngoại thương — theo dõi riêng phần ngoại tệ (CNY) theo TỪNG khách hàng,
// giống cách "Tổng hợp công nợ" theo dõi VNĐ: 1 dòng/khách hàng, bấm vào xem chi tiết,
// và có thể tạo nhiều "đề nghị thanh toán ngoại tệ" (chi trả) theo thời gian cho khách đó.
import { useState, useMemo } from 'react';
import { fmtNum } from '../helpers';

const todayISO = () => new Date().toISOString().slice(0, 10);

export const CnyFundPage = ({ transactions = [], batches = [], customers = {}, sellers = {}, onSave, onDelete }) => {
  const [search, setSearch] = useState('');
  const [detailCustomerId, setDetailCustomerId] = useState(undefined); // undefined = xem danh sách; 'CTSxxx' = xem chi tiết 1 khách

  const customerLabel = (id) => customers[id]?.companyName || id || '—';

  // Đã chi trả cho từng lô (cộng dồn các giao dịch "Chi trả" đã gắn với lô đó)
  const paidByBatch = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.type === 'out' && t.batch_id) map[t.batch_id] = (map[t.batch_id] || 0) + (Number(t.amount_cny) || 0);
    });
    return map;
  }, [transactions]);

  const batchById = useMemo(() => Object.fromEntries(batches.map(b => [b.id, b])), [batches]);

  // Tổng hợp theo từng khách hàng: Đã thu khách hàng (theo tệ) = tổng Số tệ (amount_cny) của các lô hàng khách đó;
  // Thanh toán ngoại tệ = tổng đã chi trả cho các lô của khách đó; Còn lại = 2 số trên trừ nhau.
  const rows = useMemo(() => {
    const byCustomer = {};
    batches.forEach(b => {
      const id = b.customer_id;
      if (!id) return;
      const cny = Number(b.amount_cny) || 0;
      if (cny <= 0 && !paidByBatch[b.id]) return; // bỏ qua lô không liên quan gì tới ngoại tệ
      if (!byCustomer[id]) byCustomer[id] = { customerId: id, totalCny: 0, totalPaid: 0, batchCount: 0 };
      byCustomer[id].totalCny += cny;
      byCustomer[id].batchCount += 1;
    });
    transactions.forEach(t => {
      if (t.type !== 'out' || !t.batch_id) return;
      const b = batchById[t.batch_id];
      const id = b?.customer_id;
      if (!id) return;
      if (!byCustomer[id]) byCustomer[id] = { customerId: id, totalCny: 0, totalPaid: 0, batchCount: 0 };
      byCustomer[id].totalPaid += Number(t.amount_cny) || 0;
    });
    return Object.values(byCustomer).map(r => ({ ...r, remaining: r.totalCny - r.totalPaid }));
  }, [batches, transactions, paidByBatch, batchById]);

  const filtered = rows.filter(r => {
    const s = search.trim().toLowerCase();
    return !s || r.customerId.toLowerCase().includes(s) || customerLabel(r.customerId).toLowerCase().includes(s);
  });

  const grandTotal = filtered.reduce((acc, r) => ({
    totalCny: acc.totalCny + r.totalCny, totalPaid: acc.totalPaid + r.totalPaid, remaining: acc.remaining + r.remaining,
  }), { totalCny: 0, totalPaid: 0, remaining: 0 });

  if (detailCustomerId !== undefined) {
    return (
      <CnyCustomerDetail
        customerId={detailCustomerId}
        batches={batches.filter(b => b.customer_id === detailCustomerId)}
        transactions={transactions}
        paidByBatch={paidByBatch}
        batchById={batchById}
        customerLabel={customerLabel}
        onSave={onSave} onDelete={onDelete}
        onBack={() => setDetailCustomerId(undefined)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🏦 Theo dõi hợp đồng ngoại thương</h1>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo mã hoặc tên khách hàng..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có dữ liệu ngoại tệ nào để tổng hợp.</div>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-3 font-semibold">Mã KH</th>
              <th className="text-left px-4 py-3 font-semibold">Tên khách hàng</th>
              <th className="text-right px-4 py-3 font-semibold">Đã thu khách hàng (tệ)</th>
              <th className="text-right px-4 py-3 font-semibold">Thanh toán ngoại tệ</th>
              <th className="text-right px-4 py-3 font-semibold text-rose-700 bg-rose-50">Còn lại</th>
              <th className="px-4 py-3 w-24"></th>
            </tr></thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.customerId} className={`border-t border-gray-100 hover:bg-blue-50/40 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{r.customerId}</td>
                  <td className="px-4 py-3 text-gray-700">{customerLabel(r.customerId)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtNum(r.totalCny)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmtNum(r.totalPaid)}</td>
                  <td className={`px-4 py-3 text-right font-semibold bg-rose-50/70 ${r.remaining > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmtNum(r.remaining)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setDetailCustomerId(r.customerId)} className="text-gray-600 hover:text-gray-800">🔍 Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td className="px-4 py-3" colSpan={2}>TỔNG CỘNG</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalCny)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(grandTotal.totalPaid)}</td>
                <td className="px-4 py-3 text-right bg-rose-100/70 text-rose-700">{fmtNum(grandTotal.remaining)}</td>
                <td className="px-4 py-3 bg-rose-100/70"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

// Chi tiết 1 khách hàng: xem các lô cần trả ngoại tệ, và tạo nhiều "đề nghị thanh toán ngoại tệ" (chi trả)
// theo thời gian cho khách đó — mỗi lần chi trả luôn gắn với đúng 1 lô hàng cụ thể của khách này.
const CnyCustomerDetail = ({ customerId, batches, transactions, paidByBatch, batchById, customerLabel, onSave, onDelete, onBack }) => {
  const [showOutForm, setShowOutForm] = useState(false);
  const [outDate, setOutDate] = useState(todayISO());
  const [outAmount, setOutAmount] = useState('');
  const [outNote, setOutNote] = useState('');
  const [outBatchId, setOutBatchId] = useState('');
  const [saving, setSaving] = useState(false);

  const batchLabel = (b) => `${b.batch_code ? `[${b.batch_code}] ` : ''}${b.payment_request_no ? `Số ĐN ${b.payment_request_no} — ` : ''}${b.goods_desc || '(không có mô tả)'}`;

  const batchOptions = useMemo(() => batches
    .filter(b => Number(b.amount_cny) > 0)
    .map(b => ({ ...b, _paid: paidByBatch[b.id] || 0, _remaining: (Number(b.amount_cny) || 0) - (paidByBatch[b.id] || 0) }))
    .sort((a, b) => (b._remaining > 0) - (a._remaining > 0) || (b.order_date || '').localeCompare(a.order_date || '')), [batches, paidByBatch]);

  const customerTransactions = useMemo(() => transactions
    .filter(t => t.type === 'out' && t.batch_id && batchById[t.batch_id]?.customer_id === customerId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')), [transactions, batchById, customerId]);

  const totalCny = batches.reduce((s, b) => s + (Number(b.amount_cny) || 0), 0);
  const totalPaid = customerTransactions.reduce((s, t) => s + (Number(t.amount_cny) || 0), 0);
  const remaining = totalCny - totalPaid;

  const resetOutForm = () => { setOutDate(todayISO()); setOutAmount(''); setOutNote(''); setOutBatchId(''); setShowOutForm(false); };

  const submitOut = async () => {
    if (!outBatchId) return alert('Vui lòng chọn lô hàng cần trả.');
    if (!outAmount || Number(outAmount) <= 0) return alert('Vui lòng nhập Số tệ hợp lệ.');
    setSaving(true);
    try {
      await onSave(null, { type: 'out', date: outDate, amount_cny: Number(outAmount), note: outNote || null, batch_id: outBatchId });
      resetOutForm();
    } catch (e) {
      alert('Có lỗi khi lưu: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-800 text-sm">← Quay lại</button>
        <h1 className="text-2xl font-bold text-gray-800">🏦 {customerLabel(customerId)} <span className="text-gray-400 font-mono text-lg">({customerId})</span></h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">Đã thu khách hàng (tệ)</div>
          <div className="text-2xl font-bold text-blue-600">{fmtNum(totalCny)} <span className="text-sm font-normal text-gray-400">CNY</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">Thanh toán ngoại tệ (đã trả)</div>
          <div className="text-2xl font-bold text-emerald-600">{fmtNum(totalPaid)} <span className="text-sm font-normal text-gray-400">CNY</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">Còn lại</div>
          <div className={`text-2xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmtNum(remaining)} <span className="text-sm font-normal text-gray-400">CNY</span></div>
        </div>
      </div>

      <button onClick={() => setShowOutForm(v => !v)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow mb-4">
        + Thêm đề nghị thanh toán ngoại tệ
      </button>

      {showOutForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Đề nghị thanh toán ngoại tệ cho 1 lô hàng</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Chọn lô hàng cần trả <span className="text-red-500">*</span></label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {batchOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400 text-center">Khách này chưa có lô hàng nào có Số tệ &gt; 0</div>
              ) : batchOptions.map(b => (
                <button key={b.id} type="button" onClick={() => setOutBatchId(b.id)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 hover:bg-emerald-50 ${outBatchId === b.id ? 'bg-emerald-50 font-medium' : ''}`}>
                  <div>{batchLabel(b)}</div>
                  <div className="text-xs text-gray-400">
                    Cần trả: {fmtNum(b.amount_cny)} CNY — Đã trả: {fmtNum(b._paid)} — Còn nợ: <span className={b._remaining > 0 ? 'text-red-500' : 'text-gray-400'}>{fmtNum(b._remaining)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày</label>
              <input type="date" value={outDate} onChange={e => setOutDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Số tệ (CNY)</label>
              <input type="number" value={outAmount} onChange={e => setOutAmount(e.target.value)} placeholder="VD: 20000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú (không bắt buộc)</label>
              <input value={outNote} onChange={e => setOutNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submitOut} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button onClick={resetOutForm} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Huỷ</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">Các lô hàng cần thanh toán ngoại tệ của khách này</div>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 text-xs uppercase border-t border-gray-100">
            <th className="text-left px-4 py-2">Lô hàng</th>
            <th className="text-right px-4 py-2">Cần trả</th>
            <th className="text-right px-4 py-2">Đã trả</th>
            <th className="text-right px-4 py-2">Còn nợ</th>
          </tr></thead>
          <tbody>
            {batchOptions.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Không có lô hàng nào có Số tệ.</td></tr>
            ) : batchOptions.map(b => (
              <tr key={b.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-600">{batchLabel(b)}</td>
                <td className="px-4 py-2 text-right">{fmtNum(b.amount_cny)}</td>
                <td className="px-4 py-2 text-right text-emerald-600">{fmtNum(b._paid)}</td>
                <td className={`px-4 py-2 text-right font-medium ${b._remaining > 0 ? 'text-red-500' : 'text-gray-400'}`}>{fmtNum(b._remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">Lịch sử các đề nghị thanh toán ngoại tệ đã lưu</div>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 text-xs uppercase border-t border-gray-100">
            <th className="text-left px-4 py-2">Ngày</th>
            <th className="text-right px-4 py-2">Số tệ</th>
            <th className="text-left px-4 py-2">Lô hàng</th>
            <th className="text-left px-4 py-2">Ghi chú</th>
            <th className="px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {customerTransactions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Chưa có đề nghị thanh toán ngoại tệ nào cho khách này.</td></tr>
            ) : customerTransactions.map(t => (
              <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">{t.date}</td>
                <td className="px-4 py-2 text-right font-medium">{fmtNum(t.amount_cny)}</td>
                <td className="px-4 py-2 text-gray-500">{t.batch_id && batchById[t.batch_id] ? batchLabel(batchById[t.batch_id]) : '—'}</td>
                <td className="px-4 py-2 text-gray-500">{t.note || '—'}</td>
                <td className="px-4 py-2 text-right"><button onClick={() => onDelete(t.id)} className="text-red-500 hover:text-red-700 text-xs">Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
