// File: src/previews/GoodsTablePrint.jsx
import { calcTotals, fmtNum } from '../helpers';

export const GoodsTablePrint = ({ goods, finalLabel, hideVat = false }) => {
  const { subtotal, vat, total } = calcTotals(goods);

  // Đơn Đặt Hàng: giá trị lúc đặt hàng là TẠM TÍNH, CHƯA gồm thuế — không hiện cột/dòng VAT,
  // khác với Biên Bản Bàn Giao (quyết toán thực tế, có VAT). Không dùng chung 1 kiểu bảng cho cả 2.
  if (hideVat) {
    return (
      <table className="w-full border-collapse border border-gray-400 text-xs mb-3">
        <thead>
          <tr className="bg-gray-100">
            {['STT', 'Tên hàng', 'ĐVT', 'Số lượng', 'Đơn giá (Vnd)', 'Thành tiền (Vnd)'].map(h => (
              <th key={h} className="border border-gray-400 px-2 py-1.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(goods || []).map((g, i) => (
            <tr key={i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <td className="border border-gray-400 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-400 px-2 py-1">{g.tenHang}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{g.dvt}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(g.soLuong)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(g.donGia)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(Number(g.thanhTien) || 0)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-gray-50">
            <td colSpan="5" className="border border-gray-400 px-2 py-1.5 text-right">{finalLabel || 'Cộng tiền hàng'}</td>
            <td className="border border-gray-400 px-2 py-1.5 text-right">{fmtNum(subtotal)}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full border-collapse border border-gray-400 text-xs mb-3">
      <thead>
        <tr className="bg-gray-100">
          {['STT', 'Tên hàng', 'ĐVT', 'Số lượng', 'Đơn giá (Vnd)', 'Thành tiền', '% VAT', 'Tiền thuế', 'Sau thuế'].map(h => (
            <th key={h} className="border border-gray-400 px-2 py-1.5">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(goods || []).map((g, i) => {
          const pre = Number(g.thanhTien) || 0;
          const rate = g.vatRate !== undefined ? Number(g.vatRate) : 8;
          const tax = Math.round(pre * rate / 100);
          return (
            <tr key={i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <td className="border border-gray-400 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-400 px-2 py-1">{g.tenHang}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{g.dvt}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(g.soLuong)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(g.donGia)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(pre)}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{rate}%</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(tax)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(pre + tax)}</td>
            </tr>
          );
        })}
        <tr>
          <td colSpan="8" className="border border-gray-400 px-2 py-1 text-right">Tổng tiền hàng:</td>
          <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(subtotal)}</td>
        </tr>
        <tr>
          <td colSpan="8" className="border border-gray-400 px-2 py-1 text-right">Tổng tiền thuế VAT:</td>
          <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(vat)}</td>
        </tr>
        <tr className="font-bold bg-gray-50">
          <td colSpan="8" className="border border-gray-400 px-2 py-1.5 text-right">{finalLabel || 'Tổng cộng giá trị sau thuế:'}</td>
          <td className="border border-gray-400 px-2 py-1.5 text-right">{fmtNum(total)}</td>
        </tr>
      </tbody>
    </table>
  );
};
