// File: src/utils/invoiceGoodsExcel.js
// Đọc file Excel "Thông tin hàng hóa" — mỗi dòng là 1 mặt hàng, các dòng cùng
// Số hóa đơn sẽ được gộp lại thành 1 hóa đơn với danh sách hàng hóa bên trong.
import * as XLSX from 'xlsx';
import { normalizeText } from './customerExcel';

// Các biến thể tiêu đề cột (đã chuẩn hoá bỏ dấu, bỏ khoảng trắng) ứng với từng field
const HEADER_ALIASES = {
  invoiceNo: ['sohoadon'],
  invoiceDate: ['ngayhoadon'],
  customerCode: ['makhachhang'],
  customerName: ['tenkhachhang'],
  tenHang: ['tenhang'],
  dvt: ['dvt'],
  soLuong: ['soluong'],
  donGia: ['dongia'],
  thanhTien: ['thanhtien'],
  vatRate: ['thuesuat', 'thuesuatgtgt'],
  sellerName: ['tencongty'],
  sellerTaxCode: ['masothue'],
};

function buildFieldMap(headerRow) {
  const map = {}; // colIndex -> fieldKey
  headerRow.forEach((h, idx) => {
    const norm = normalizeText(h);
    if (!norm) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm) && map[idx] === undefined && !Object.values(map).includes(field)) {
        map[idx] = field;
        break;
      }
    }
  });
  return map;
}

function parseExcelDate(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return '';
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/); // yyyy-mm-dd sẵn
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  return s;
}

// Đọc số % dù ghi dạng "8%", "8", hoặc số thập phân 0.08 (Excel lưu % dưới dạng phân số)
function parsePercent(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v > 0 && v < 1 ? Math.round(v * 10000) / 100 : v;
  const s = String(v).trim().replace('%', '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Trả về { invoices: [{invoiceNo, invoiceDate, customerCode, customerName, sellerName, sellerTaxCode, goods:[...], total}], errors: [] }
export async function parseInvoiceGoodsFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (raw.length < 2) return { invoices: [], errors: ['File không có dữ liệu.'] };

  const fieldMap = buildFieldMap(raw[0]);
  if (!Object.values(fieldMap).includes('invoiceNo')) {
    return { invoices: [], errors: ['Không nhận diện được cột "Số hóa đơn". Vui lòng kiểm tra lại file.'] };
  }

  const groups = {}; // invoiceNo -> { meta..., goods: [] }
  const errors = [];

  for (let r = 1; r < raw.length; r++) {
    const line = raw[r];
    if (!line || line.every((c) => String(c).trim() === '')) continue;
    const rowNum = r + 1;

    const obj = {};
    line.forEach((cell, idx) => {
      const f = fieldMap[idx];
      if (f) obj[f] = typeof cell === 'string' ? cell.trim() : cell;
    });

    const invoiceNo = String(obj.invoiceNo || '').trim();
    if (!invoiceNo) { errors.push(`Dòng ${rowNum}: thiếu Số hóa đơn, đã bỏ qua.`); continue; }

    const customerName = String(obj.customerName || '').trim();
    const customerCode = String(obj.customerCode || '').trim();
    // Số hóa đơn có thể bị lặp lại giữa các khách hàng khác nhau (không phải mã duy nhất) —
    // nên phải gộp theo cặp Số hóa đơn + Tên khách hàng (lấy Tên khách hàng làm gốc), tránh gộp nhầm hàng hóa của khách khác.
    const groupKey = `${invoiceNo}||${normalizeText(customerName || customerCode)}`;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        invoiceNo,
        groupKey,
        invoiceDate: parseExcelDate(obj.invoiceDate),
        customerCode,
        customerName,
        sellerName: String(obj.sellerName || '').trim(),
        sellerTaxCode: String(obj.sellerTaxCode || '').trim(),
        goods: [],
      };
    }

    const tenHang = String(obj.tenHang || '').trim();
    if (!tenHang) continue; // dòng chỉ có thông tin chung, không có mặt hàng — bỏ qua phần hàng hóa

    const g = groups[groupKey];
    const soLuong = Number(obj.soLuong) || 0;
    const donGia = Number(obj.donGia) || 0;
    g.goods.push({
      stt: g.goods.length + 1,
      tenHang,
      dvt: String(obj.dvt || '').trim(),
      soLuong,
      donGia,
      thanhTien: Number(obj.thanhTien) || soLuong * donGia,
      vatRate: parsePercent(obj.vatRate),
    });
  }

  const invoices = Object.values(groups).map((inv) => ({
    ...inv,
    total: inv.goods.reduce((s, g) => s + (Number(g.thanhTien) || 0) * (1 + (Number(g.vatRate) || 0) / 100), 0),
  }));

  return { invoices, errors };
}
