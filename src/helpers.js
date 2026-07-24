// File: src/helpers.js
import { normalizeText } from './utils/customerExcel';

// Lấy đúng Mã Sale của khách hàng để dùng khi sinh số hợp đồng/ĐĐH.
// Một số khách hàng cũ chỉ lưu Tên Sale mà chưa lưu Mã Sale (dữ liệu trước khi có dropdown chọn sale) —
// hàm này tự đối chiếu theo tên với hồ sơ đang đăng nhập hoặc danh sách saleProfiles (admin) để tìm ra mã đúng.
export const resolveSaleCode = (customer, { profile, saleProfiles = [] } = {}) => {
  const assigned = customer?.assignedSale;
  if (assigned?.code) return assigned.code;
  const name = assigned?.name;
  if (!name) return '';
  const target = normalizeText(name);
  if (profile?.full_name && normalizeText(profile.full_name) === target) return profile.ma_sale || '';
  const found = saleProfiles.find((p) => normalizeText(p.name) === target);
  return found?.ma_sale || '';
};

export const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `ngày ${dt.getDate()} tháng ${dt.getMonth() + 1} năm ${dt.getFullYear()}`;
};

export const fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN');

export const calcTotals = (goods) => {
  let subtotal = 0, vat = 0;
  (goods || []).forEach(g => {
    const pre = Number(g.thanhTien) || 0;
    const rate = g.vatRate !== undefined ? Number(g.vatRate) : 8;
    subtotal += pre;
    vat += Math.round(pre * rate / 100);
  });
  return { subtotal, vat, total: subtotal + vat };
};

// Tổng giá trị tiền hàng (USD) — dùng cho hợp đồng ủy thác nhập khẩu (không tính VAT, chỉ cộng thành tiền)
export const calcUSDTotal = (goods) => (goods || []).reduce((sum, g) => sum + (Number(g.thanhTien) || 0), 0);

const readHundred = (n) => {
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  if (n === 0) return '';
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  let s = '';
  if (h) s += ones[h] + ' trăm';
  if (t === 1) {
    s += ' mười';
    if (o === 5) s += ' lăm'; else if (o) s += ' ' + ones[o];
  } else if (t > 1) {
    s += ' ' + ones[t] + ' mươi';
    if (o === 1) s += ' mốt'; else if (o === 5) s += ' lăm'; else if (o) s += ' ' + ones[o];
  } else if (h && o) {
    s += ' lẻ ' + ones[o];
  } else if (o) {
    s += ones[o];
  }
  return s.trim();
};

export const numberToWords = (n, unit = 'đồng') => {
  const num = Math.round(Number(n) || 0);
  if (num === 0) return `Không ${unit}`;
  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  let parts = [], tmp = num, i = 0;
  while (tmp > 0) { parts.push([tmp % 1000, units[i++]]); tmp = Math.floor(tmp / 1000); }
  const words = parts.reverse().filter(p => p[0]).map(([v, u]) => readHundred(v) + (u ? ' ' + u : '')).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1) + ` ${unit}`;
};

export const getInitials = (name) => {
  if (!name) return '';
  const cleaned = name
    .replace(/công\s+ty/gi, ' ')
    .replace(/\btnhh\b/gi, ' ')
    .replace(/cổ\s+phần/gi, ' ')
    .replace(/\bcp\b/gi, ' ')
    .replace(/\bhkd\b/gi, ' ')
    .replace(/\bmtv\b/gi, ' ');
  const words = cleaned.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return name[0]?.toUpperCase() || '';
  return words.map(w => w[0].toUpperCase()).join('');
};

export const genSellerId = (sellers) => {
  const nums = Object.keys(sellers).map(k => parseInt(k.replace('SELLER', ''))).filter(x => !isNaN(x));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return 'SELLER' + String(next).padStart(3, '0');
};

export const genDeptId = (departments) => {
  const nums = Object.keys(departments).map(k => parseInt(k.replace('DEPT', ''))).filter(x => !isNaN(x));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return 'DEPT' + String(next).padStart(3, '0');
};

export const CONTRACT_ABBR = {
  HDNT: 'HĐNTMB', DDH: 'ĐĐH', BBBG: 'BBBG',
  HDNT_VC: 'HĐNTVC', DDH_VC: 'ĐHVC', BBBG_VC: 'BBBGVC',
  HDNT_UT: 'HĐNTUT', DDH_UT: 'ĐHUT', BBBG_UT: 'BBBGUT',
};

// Màu badge dùng chung cho mọi nơi hiển thị loại hợp đồng (Dashboard, danh sách, ContractViewer...)
export const TYPE_COLOR = {
  HDNT: 'green', DDH: 'yellow', BBBG: 'purple',
  HDNT_VC: 'green', DDH_VC: 'yellow', BBBG_VC: 'purple',
  HDNT_UT: 'green', DDH_UT: 'yellow', BBBG_UT: 'purple',
};

export const fmtYYMMDD = (dateStr) => {
  if (!dateStr) return 'YYMMDD';
  const d = new Date(dateStr + 'T00:00:00');
  return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
};

export const buildContractId = ({ type, date, saleCode, stt, sellerName, customerName }) => {
  const seq = String(stt || '').replace(/\D/g, '').slice(0, 3);
  const sellerInit = getInitials(sellerName) || '—';
  const customerInit = getInitials(customerName) || '—';
  const yymmdd = fmtYYMMDD(date);
  const maSale = saleCode || '—';
  const sttPad = seq ? seq.padStart(3, '0') : '—';
  const loai = CONTRACT_ABBR[type] || type;
  return `${yymmdd}/${maSale}/${sttPad}/${loai}/${sellerInit}-${customerInit}`;
};
