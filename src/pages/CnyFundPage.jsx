// File: src/pages/CnyFundPage.jsx
// Sổ quỹ ngoại tệ (CNY) riêng — tách khỏi "Theo dõi dòng tiền" (vốn quy hết về VNĐ).
// Theo dõi: đang có bao nhiêu CNY trong quỹ, đã trả bao nhiêu, còn nợ (theo các lô hàng) bao nhiêu.
import { useState, useMemo } from 'react';
import { fmtNum } from '../helpers';

const todayISO = () => new Date().toISOString().slice(0, 10);

export const CnyFundPage = ({ transactions = [], batches = [], customers = {}, sellers = {}, onSave, onDelete }) => {
  const [showInForm, setShowInForm] = useState(false);
  const [showOutForm, setShowOutForm] = useState(false);
  const [inDate, setInDate] = useState(todayISO());
  const [inAmount, setInAmount] = useState('');
  const [inNote, setInNote] = useState('');
  const [outDate, setOutDate] = useState(todayISO());
  const [outAmount, setOutAmount] = useState('');
  const [outNote, setOutNote] = useState('');
  const [outBatchId, setOutBatchId] = useState('');
  const [batchQuery, setBatchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const customerLabel = (id) => customers[id]?.companyName || id || '—';
  const sellerLabel = (id) => sellers[id]?.companyName || id || '—';
  const batchLabel = (b) => `${b.batch_code ? `[${b.batch_code}] ` : ''}${customerLabel(b.customer_id)} — ${b.goods_desc || '(không có mô tả)'}`;

  // Đã trả cho từng lô (cộng dồn các giao dịch "Chi trả" đã gắn với lô đó)
  const paidByBatch = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.type === 'out' && t.batch_id) map[t.batch_id] = (map[t.batch_id] || 0) + (Number(t.amount_cny) || 0);
    });
    return map;
  }, [transactions]);

  // Danh sách lô có Số tệ (amount_cny) > 0 — để chọn khi Chi trả, kèm số đã trả/còn nợ của từng lô
  const batchOptions = useMemo(() => {
    return batches
      .filter(b => Number(b.amount_cny) > 0)
      .map(b => ({
        ...b,
        _paid: paidByBatch[b.id] || 0,
        _remaining: (Number(b.amount_cny) || 0) - (paidByBatch[b.id] || 0),
      }))
      .sort((a, b) => (b._remaining > 0) - (a._remaining > 0) || (b.order_date || '').localeCompare(a.order_date || ''));
  }, [batches, paidByBatch]);

  const filteredBatchOptions = useMemo(() => {
    const q = batchQuery.trim().toLowerCase();
    if (!q) return batchOptions;
    return batchOptions.filter(b => batchLabel(b).toLowerCase().includes(q));
  }, [batchOptions, batchQuery]);

  const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + (Number(t.amount_cny) || 0), 0);
  const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + (Number(t.amount_cny) || 0), 0);
  const balance = totalIn - totalOut;
  const totalObligation = batches.reduce((s, b) => s + (Number(b.amount_cny) || 0), 0);
  const remainingDebt = totalObligation - totalOut;

  const resetInForm = () => { setInDate(todayISO()); setInAmount(''); setInNote(''); setShowInForm(false); };
  const resetOutForm = () => { setOutDate(todayISO()); setOutAmount(''); setOutNote(''); setOutBatchId(''); setBatchQuery(''); setShowOutForm(false); };

  const submitIn = async () => {
    if (!inAmount || Number(inAmount) <= 0) return alert('Vui lòng nhập Số tệ hợp lệ.');
    setSaving(true);
    try {
      await onSave(null, { type: 'in', date: inDate, amount_cny: Number(inAmount), note: inNote || null });
      resetInForm();
    } catch (e) {
      alert('Có lỗi khi lưu: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitOut = async () => {
    if (!outBatchId) return alert('Vui lòng chọn lô hàng cần chi trả.');
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

  const batchById = useMemo(() => Object.fromEntries(batches.map(b => [b.id, b])), [batches]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">💴 Quỹ ngoại tệ (CNY)</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">🔵 Đang có trong quỹ</div>
          <div className="text-2xl font-bold text-blue-600">{fmtNum(balance)} <span className="text-sm font-normal text-gray-400">CNY</span></div>
          <div className="text-xs text-gray-400 mt-1">Thu vào: {fmtNum(totalIn)} — Đã chi: {fmtNum(totalOut)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">🟢 Đã trả (theo lô hàng)</div>
          <div className="text-2xl font-bold text-emerald-600">{fmtNum(totalOut)} <span className="text-sm font-normal text-gray-400">CNY</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">🔴 Còn nợ (theo lô hàng)</div>
          <div className={`text-2xl font-bold ${remainingDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmtNum(remainingDebt)} <span className="text-sm font-normal text-gray-400">CNY</span></div>
          <div className="text-xs text-gray-400 mt-1">Tổng cần trả: {fmtNum(totalObligation)}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setShowInForm(v => !v); setShowOutForm(false); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">
          + Thu vào quỹ
        </button>
        <button onClick={() => { setShowOutForm(v => !v); setShowInForm(false); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow">
          + Chi trả cho 1 lô hàng
        </button>
      </div>

      {showInForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Thu vào quỹ (mua/nạp thêm CNY)</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày</label>
              <input type="date" value={inDate} onChange={e => setInDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Số tệ (CNY)</label>
              <input type="number" value={inAmount} onChange={e => setInAmount(e.target.value)} placeholder="VD: 50000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú (không bắt buộc)</label>
              <input value={inNote} onChange={e => setInNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submitIn} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button onClick={resetInForm} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Huỷ</button>
          </div>
        </div>
      )}

      {showOutForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Chi trả cho 1 lô hàng</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Chọn lô hàng cần trả <span className="text-red-500">*</span></label>
            <input value={batchQuery} onChange={e => setBatchQuery(e.target.value)} placeholder="🔍 Tìm theo mã lô, khách hàng, mô tả hàng hóa..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredBatchOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400 text-center">Không tìm thấy lô hàng nào có Số tệ &gt; 0</div>
              ) : filteredBatchOptions.map(b => (
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-2.5">Ngày</th>
              <th className="text-left px-4 py-2.5">Loại</th>
              <th className="text-right px-4 py-2.5">Số tệ (CNY)</th>
              <th className="text-left px-4 py-2.5">Lô hàng liên quan</th>
              <th className="text-left px-4 py-2.5">Ghi chú</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có giao dịch nào trong sổ quỹ.</td></tr>
            ) : transactions.map(t => {
              const b = t.batch_id ? batchById[t.batch_id] : null;
              return (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-2.5">
                    {t.type === 'in'
                      ? <span className="inline-block bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">Thu vào quỹ</span>
                      : <span className="inline-block bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-full font-medium">Chi trả</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{fmtNum(t.amount_cny)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{b ? batchLabel(b) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{t.note || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => onDelete(t.id)} className="text-red-500 hover:text-red-700 text-xs">Xóa</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
