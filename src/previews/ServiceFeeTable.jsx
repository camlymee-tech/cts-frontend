// File: src/previews/ServiceFeeTable.jsx
import { calcTotals, fmtNum, numberToWords } from '../helpers';

// Bảng phí dịch vụ trọn gói (1 dòng) — dùng cho Đơn Đặt Dịch Vụ và Biên Bản BG vận chuyển.
// goods: mảng 1 phần tử theo đúng cấu trúc goods chung của hệ thống (để tái dùng calcTotals).
export const ServiceFeeTable = ({ goods, feeLabel, totalLabel }) => {
  const { subtotal, vat, total } = calcTotals(goods);
  const rate = goods?.[0]?.vatRate !== undefined ? goods[0].vatRate : 8;
  return (
    <div className="mb-3">
      <table className="w-full border-collapse border border-gray-400 text-sm mb-2">
        <tbody>
          <tr>
            <td className="border border-gray-400 px-3 py-2 w-2/3">{feeLabel || 'Phí dịch vụ trọn gói (tạm tính)'}</td>
            <td className="border border-gray-400 px-3 py-2 text-right">{fmtNum(subtotal)}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-3 py-2">Thuế GTGT {rate}%</td>
            <td className="border border-gray-400 px-3 py-2 text-right">{fmtNum(vat)}</td>
          </tr>
          <tr className="font-bold bg-gray-50">
            <td className="border border-gray-400 px-3 py-2.5">{totalLabel || 'Tổng cộng giá trị sau thuế'}</td>
            <td className="border border-gray-400 px-3 py-2.5 text-right">{fmtNum(total)}</td>
          </tr>
        </tbody>
      </table>
      <div className="text-sm"><strong>Bằng chữ:</strong> {numberToWords(total)}</div>
    </div>
  );
};
