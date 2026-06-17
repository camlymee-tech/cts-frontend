// File: src/components/GoodsTableUSD.jsx
import { calcUSDTotal, fmtNum } from '../helpers';

// Bảng hàng hóa định giá bằng USD (không tính VAT theo dòng) + tỷ giá quy đổi sang VNĐ.
// Dùng cho Đơn Đặt Dịch Vụ Ủy Thác Nhập Khẩu.
export const GoodsTableUSD = ({ goods, onChange, exchangeRate, onExchangeRateChange }) => {
  const upd = (i, f, v) => {
    const rows = goods.map((g, idx) => {
      if (idx !== i) return g;
      const updated = { ...g, [f]: v };
      if (f === 'soLuong' || f === 'donGia') {
        updated.thanhTien = (Number(updated.soLuong) || 0) * (Number(updated.donGia) || 0);
      }
      return updated;
    });
    onChange(rows);
  };

  const addRow = () => onChange([...goods, { stt: goods.length + 1, tenHang: '', dvt: '', soLuong: 0, donGia: 0, thanhTien: 0 }]);
  const del = (i) => onChange(goods.filter((_, idx) => idx !== i).map((g, idx) => ({ ...g, stt: idx + 1 })));
  const totalUsd = calcUSDTotal(goods);
  const rate = Number(exchangeRate) || 0;
  const totalVnd = Math.round(totalUsd * rate);
  const inCls = 'w-full bg-transparent focus:outline-none focus:bg-blue-50 rounded px-1 py-0.5 text-sm';

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs">
              <th className="border border-gray-300 px-2 py-2 w-8">STT</th>
              <th className="border border-gray-300 px-2 py-2">Tên hàng hóa</th>
              <th className="border border-gray-300 px-2 py-2 w-14">ĐVT</th>
              <th className="border border-gray-300 px-2 py-2 w-20">Số lượng</th>
              <th className="border border-gray-300 px-2 py-2 w-28">Đơn giá (USD)</th>
              <th className="border border-gray-300 px-2 py-2 w-28">Thành tiền (USD)</th>
              <th className="border border-gray-300 px-1 py-2 w-8 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {goods.length === 0 && (
              <tr>
                <td colSpan="7" className="border border-gray-300 p-4 text-center text-gray-400 italic text-sm">Chưa có hàng hóa</td>
              </tr>
            )}
            {goods.map((g, i) => (
              <tr key={i} className="hover:bg-blue-50/30">
                <td className="border border-gray-300 px-2 py-1 text-center text-gray-500">{i + 1}</td>
                <td className="border border-gray-300 px-1 py-1"><input value={g.tenHang} onChange={e => upd(i, 'tenHang', e.target.value)} className={inCls} /></td>
                <td className="border border-gray-300 px-1 py-1"><input value={g.dvt} onChange={e => upd(i, 'dvt', e.target.value)} className={inCls + ' text-center'} /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" min="0" value={g.soLuong} onChange={e => upd(i, 'soLuong', e.target.value)} className={inCls + ' text-right'} /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" min="0" step="0.01" value={g.donGia} onChange={e => upd(i, 'donGia', e.target.value)} className={inCls + ' text-right'} /></td>
                <td className="border border-gray-300 px-2 py-1 text-right">{fmtNum(g.thanhTien)}</td>
                <td className="border border-gray-300 px-1 py-1 text-center no-print">
                  <button onClick={() => del(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan="5" className="border border-gray-300 px-3 py-1.5 text-right text-sm">Tổng giá trị tiền hàng theo tờ khai tạm tính (USD):</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right text-sm font-medium">{fmtNum(totalUsd)}</td>
              <td className="border border-gray-300 no-print"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <button onClick={addRow} className="text-blue-600 hover:text-blue-800 text-sm no-print">+ Thêm dòng</button>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-600">Tỷ giá thỏa thuận (VNĐ/USD):</label>
          <input type="number" min="0" value={exchangeRate} onChange={e => onExchangeRateChange(e.target.value)} placeholder="VD: 26000"
            className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>
      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm flex justify-between">
        <span className="text-blue-700">Tổng giá trị tiền hàng theo tỷ giá thỏa thuận tạm tính (VNĐ):</span>
        <span className="font-bold text-blue-800">{fmtNum(totalVnd)} đ</span>
      </div>
    </div>
  );
};
