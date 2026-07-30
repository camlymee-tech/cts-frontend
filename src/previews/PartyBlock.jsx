// File: src/previews/PartyBlock.jsx
// emailLabel: bộ Mua bán dùng "Email", bộ Vận chuyển/Ủy thác dùng "Email nhận hồ sơ" — theo đúng từng file mẫu gốc.
export const PartyBlock = ({ heading, p, emailLabel = 'Email nhận hồ sơ' }) => (
  <div className="mb-3 text-sm">
    <div className="font-bold">{heading}: <strong>{p.companyName}</strong></div>
    <div>Địa chỉ: {p.address}</div>
    <div>Mã số thuế: {p.taxCode} &nbsp;|&nbsp; Điện thoại: {p.phone}</div>
    <div>{emailLabel}: {p.email}</div>
    <div>Số tài khoản: {p.bankAccount}{p.bankName ? ` tại ${p.bankName}` : ''}</div>
    <div>Người đại diện: <strong>{p.representative}</strong> &nbsp;–&nbsp; Chức vụ: {p.position}</div>
  </div>
);
