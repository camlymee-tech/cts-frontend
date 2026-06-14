// File: src/previews/PartyBlock.jsx
export const PartyBlock = ({ heading, p }) => (
  <div className="mb-3 text-sm">
    <div className="font-bold">{heading}: <strong>{p.companyName}</strong></div>
    <div>Địa chỉ: {p.address}</div>
    <div>Mã số thuế: {p.taxCode} &nbsp;|&nbsp; Điện thoại: {p.phone}</div>
    <div>Email nhận hồ sơ: {p.email}</div>
    <div>Số tài khoản: {p.bankAccount}{p.bankName ? ` tại ${p.bankName}` : ''}</div>
    <div>Người đại diện: <strong>{p.representative}</strong> &nbsp;–&nbsp; Chức vụ: {p.position}</div>
  </div>
);
