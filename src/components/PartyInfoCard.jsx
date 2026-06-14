// File: src/components/PartyInfoCard.jsx
export const PartyInfoCard = ({ title, p, extra }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
    <div className="font-semibold text-gray-700 mb-1">{title}</div>
    {p && p.companyName ? (
      <div className="text-gray-600 space-y-0.5">
        <div><strong className="text-gray-800">{p.companyName}</strong>{extra}</div>
        <div>Địa chỉ: {p.address || '—'}</div>
        <div>MST: {p.taxCode || '—'} &nbsp;•&nbsp; SĐT: {p.phone || '—'}</div>
        <div>Email: {p.email || '—'} &nbsp;•&nbsp; STK: {p.bankAccount || '—'}{p.bankName ? ` (${p.bankName})` : ''}</div>
        <div>Người đại diện: {p.representative || '—'}{p.position ? ` – ${p.position}` : ''}</div>
      </div>
    ) : <div className="text-gray-400 italic">Chưa chọn</div>}
  </div>
);
