// File: src/components/GoodsTable.jsx
import { calcTotals, fmtNum, numberToWords } from '../helpers';

export const GoodsTable = ({ goods, onChange }) => {
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

  const addRow = () => onChange([...goods, { stt: goods.length + 1, tenHang: '', dvt: '', soLuong: 0, donGia: 0, thanhTien: 0, vatRate: 8 }]);
  const del = (i) => onChange(goods.filter((_, idx) => idx !== i).map((g, idx) => ({ ...g, stt: idx + 1 })));
  const { subtotal, vat, total } = calcTotals(goods);
  const inCls = 'w-full bg-transparent focus:outline-none focus:bg-blue-50 rounded px-1 py-0.5 text-sm';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-xs">
            <th className="border border-gray-300 px-2 py-2 w-8">STT</th>
            <th className="border border-gray-300 px-2 py-2">Tên hàng hóa / Dịch vụ</th>
            <th className="border border-gray-300 px-2 py-2 w-14">ĐVT</th>
            <th className="border border-gray-300 px-2 py-2 w-20">Số lượng</th>
            <th className="border border-gray-300 px-2 py-2 w-24">Đơn giá (đ)</th>
            <th className="border border-gray-300 px-2 py-2 w-24">Thành tiền</th>
            <th className="border border-gray-300 px-2 py-2 w-16">% VAT</th>
            <th className="border border-gray-300 px-2 py-2 w-24">Tiền thuế</th>
            <th className="border border-gray-300 px-2 py-2 w-24">Sau thuế</th>
            <th className="border border-gray-300 px-1 py-2 w-8 no-print"></th>
          </tr>
        </thead>
        <tbody>
          {goods.length === 0 && (
            <tr>
              <td colSpan="10" className="border border-gray-300 p-4 text-center text-gray-400 italic text-sm">Chưa có hàng hóa</td>
            </tr>
          )}
          {goods.map((g, i) => {
            const pre = Number(g.thanhTien) || 0;
            const rate = g.vatRate !== undefined ? Number(g.vatRate) : 8;
            const tax = Math.round(pre * rate / 100);
            return (
              <tr key={i} className="hover:bg-blue-50/30">
                <td className="border border-gray-300 px-2 py-1 text-center text-gray-500">{i + 1}</td>
                <td className="border border-gray-300 px-1 py-1"><input value={g.tenHang} onChange={e => upd(i, 'tenHang', e.target.value)} className={inCls} /></td>
                <td className="border border-gray-300 px-1 py-1"><input value={g.dvt} onChange={e => upd(i, 'dvt', e.target.value)} className={inCls + ' text-center'} /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" min="0" value={g.soLuong} onChange={e => upd(i, 'soLuong', e.target.value)} className={inCls + ' text-right'} /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" min="0" value={g.donGia} onChange={e => upd(i, 'donGia', e.target.value)} className={inCls + ' text-right'} /></td>
                <td className="border border-gray-300 px-2 py-1 text-right">{fmtNum(pre)}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">
                  <select value={rate} onChange={e => upd(i, 'vatRate', Number(e.target.value))}
                    className="w-full bg-transparent focus:outline-none text-sm text-center">
                    {[0, 5, 8, 10].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right text-gray-600">{fmtNum(tax)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-semibold text-green-700">{fmtNum(pre + tax)}</td>
                <td className="border border-gray-300 px-1 py-1 text-center no-print">
                  <button onClick={() => del(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan="8" className="border border-gray-300 px-3 py-1.5 text-right text-sm">Tổng tiền hàng (trước thuế):</td>
            <td className="border border-gray-300 px-2 py-1.5 text-right text-sm font-medium">{fmtNum(subtotal)}</td>
            <td className="border border-gray-300 no-print"></td>
          </tr>
          <tr className="bg-gray-50">
            <td colSpan="8" className="border border-gray-300 px-3 py-1.5 text-right text-sm">Tổng tiền thuế VAT:</td>
            <td className="border border-gray-300 px-2 py-1.5 text-right text-sm text-gray-600">{fmtNum(vat)}</td>
            <td className="border border-gray-300 no-print"></td>
          </tr>
          <tr className="bg-green-50 font-bold">
            <td colSpan="8" className="border border-gray-300 px-3 py-2 text-right text-sm">Tổng thanh toán (đã bao gồm thuế):</td>
            <td className="border border-gray-300 px-2 py-2 text-right text-sm text-green-700">{fmtNum(total)}</td>
            <td className="border border-gray-300 no-print"></td>
          </tr>
        </tfoot>
      </table>
      <div className="flex items-center justify-between mt-2">
        <button onClick={addRow} className="text-blue-600 hover:text-blue-800 text-sm no-print">+ Thêm dòng</button>
        <div className="text-xs text-gray-500">Bằng chữ: <span className="font-medium text-gray-700">{numberToWords(total)}</span></div>
      </div>
    </div>
  );
};
