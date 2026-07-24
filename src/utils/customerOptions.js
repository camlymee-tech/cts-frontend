// File: src/utils/customerOptions.js
// Dựng danh sách option cho SearchableSelect "Khách hàng" — hiện cả Mã gốc và các Mã nhánh của khách đó
// để tìm/chọn dễ hơn. Chọn nhánh nào cũng lưu về đúng Mã khách hàng gốc (vì hợp đồng/đơn hàng chỉ lưu 1
// customer_id gốc), giá trị của option nhánh có hậu tố riêng để không trùng key với option gốc.
const BRANCH_VALUE_SEP = '::branch::';

export function buildCustomerOptions(customers) {
  const opts = [];
  Object.entries(customers).forEach(([id, c]) => {
    opts.push({ value: id, label: `${id} — ${c.companyName}` });
    (c.branches || []).forEach((b, i) => {
      const label = b.companyName || b.taxCode;
      if (!label) return;
      opts.push({ value: `${id}${BRANCH_VALUE_SEP}${i}`, label: `${id} — ${label} (nhánh)` });
    });
  });
  return opts;
}

// Chuyển giá trị chọn được (có thể là option nhánh) về đúng Mã khách hàng gốc để lưu vào state/hợp đồng.
export function resolveCustomerId(value) {
  if (!value) return value;
  const idx = value.indexOf(BRANCH_VALUE_SEP);
  return idx === -1 ? value : value.slice(0, idx);
}
