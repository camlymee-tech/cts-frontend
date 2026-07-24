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

// Dựng lại đúng giá trị option từ { customerId, branchIndex } — dùng để hiển thị đúng lựa chọn hiện tại
// (root hay 1 nhánh cụ thể) trên nút đã đóng của SearchableSelect.
export function encodeCustomerOptionValue(customerId, branchIndex) {
  return branchIndex == null ? customerId : `${customerId}${BRANCH_VALUE_SEP}${branchIndex}`;
}

// Tách giá trị chọn được thành { customerId, branchIndex } — branchIndex là null nếu chọn Mã gốc,
// dùng để lấy đúng thông tin (tên, địa chỉ...) của nhánh đã chọn thay vì luôn hiện thông tin gốc.
export function parseCustomerOptionValue(value) {
  if (!value) return { customerId: value, branchIndex: null };
  const idx = value.indexOf(BRANCH_VALUE_SEP);
  if (idx === -1) return { customerId: value, branchIndex: null };
  return { customerId: value.slice(0, idx), branchIndex: Number(value.slice(idx + BRANCH_VALUE_SEP.length)) };
}
