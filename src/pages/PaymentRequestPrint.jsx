// File: src/pages/PaymentRequestPrint.jsx
import { useState } from 'react';
import { fmtNum, numberToWords } from '../helpers';

const PRINT_STYLE = `
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; background: #fff; color: #000; margin: 0; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #555; padding: 4px 6px; }
  .no-print { display: none !important; }
  .no-border td, .no-border { border: none !important; padding: 2px 0 !important; }
`;

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDateVN = (d) => {
  if (!d) return '';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

const blankVoucherRow = () => ({ so: '', maDonHang: '', dienGiai: '', ctsPhaiThu: '', daThuKhach: '', chenhLech: '' });
const blankFxRow = () => ({ noiDung: '', tyGia: '', soTe: '', thanhTien: '' });

export const PaymentRequestPrint = ({ customerId, customer, batches = [], onClose }) => {
  const [requestDate, setRequestDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const firstBankBatch = batches.find(b => b.bank_account);
  const [receiveAccount, setReceiveAccount] = useState(
    firstBankBatch ? `${firstBankBatch.bank_account}${firstBankBatch.bank_name ? ` (${firstBankBatch.bank_name})` : ''}`
      : (customer?.bankAccount ? `${customer.bankAccount}${customer.bankName ? ` (${customer.bankName})` : ''}` : '')
  );
  const [receiverName, setReceiverName] = useState(customer?.representative || '');
  const [refundMethod, setRefundMethod] = useState('');
  const [note, setNote] = useState('');

  const [voucherRows, setVoucherRows] = useState(
    batches.length > 0
      ? batches.map((b, i) => ({
          so: String(i + 1),
          maDonHang: b.batch_code || '',
          dienGiai: b.goods_desc || '',
          ctsPhaiThu: b.deposit_vnd ?? '',
          daThuKhach: b.customer_paid_total ?? '',
          chenhLech: '',
        }))
      : [blankVoucherRow()]
  );
  const [fxRows, setFxRows] = useState([blankFxRow()]);

  const num = (v) => Number(v) || 0;

  const totalPhaiThu = voucherRows.reduce((s, r) => s + num(r.ctsPhaiThu), 0);
  const totalThuKhach = voucherRows.reduce((s, r) => s + num(r.daThuKhach), 0);
  const chenhLech = totalPhaiThu - totalThuKhach;
  const phaiThuKhach = chenhLech >= 0 ? chenhLech : 0;
  const phaiTraKhach = chenhLech < 0 ? chenhLech : 0;

  const totalTienChuyen = fxRows.reduce((s, r) => s + num(r.thanhTien), 0);
  const chenhLechConLai = totalTienChuyen + chenhLech;
  const soTienBangChu = numberToWords(Math.abs(totalTienChuyen || Math.abs(phaiTraKhach) || phaiThuKhach));

  const setVoucherField = (idx, key, val) => setVoucherRows(rows => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const addVoucherRow = () => setVoucherRows(rows => [...rows, blankVoucherRow()]);
  const removeVoucherRow = (idx) => setVoucherRows(rows => rows.filter((_, i) => i !== idx));

  const setFxField = (idx, key, val) => setFxRows(rows => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const addFxRow = () => setFxRows(rows => [...rows, blankFxRow()]);
  const removeFxRow = (idx) => setFxRows(rows => rows.filter((_, i) => i !== idx));

  const getFullHtml = (innerHTML) => {
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((el) => `<link rel="stylesheet" href="${el.href}">`).join('\n');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${styleLinks}<style>${PRINT_STYLE}</style></head><body>${innerHTML}</body></html>`;
  };

  const doPrint = () => {
    const content = document.getElementById('dntt-print-zone').innerHTML;
    const w = window.open('', '_blank');
    if (!w) { alert('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup cho trang này rồi bấm lại.'); return; }
    w.document.write(getFullHtml(content));
    w.document.close();
    w.onload = () => { w.focus(); w.print(); w.close(); };
    setTimeout(() => { if (!w.closed) { w.focus(); w.print(); w.close(); } }, 800);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 no-print">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">← Quay lại</button>
          <h1 className="text-xl font-bold text-gray-800">🖨️ Giấy Đề Nghị Thanh Toán — {customer?.companyName || customerId}</h1>
        </div>
        <button onClick={doPrint} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">🖨️ In / Xuất PDF</button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 no-print">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ngày đề nghị</label>
            <input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ngày yêu cầu thanh toán</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hình thức trả lại</label>
            <input value={refundMethod} onChange={e => setRefundMethod(e.target.value)} placeholder="VD: chuyển khoản ngân hàng" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Số tài khoản nhận tiền</label>
            <input value={receiveAccount} onChange={e => setReceiveAccount(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tên người nhận</label>
            <input value={receiverName} onChange={e => setReceiverName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-600 uppercase">Bảng chứng từ (tự nhập từng dòng)</label>
            <button onClick={addVoucherRow} className="text-blue-600 hover:text-blue-800 text-sm">+ Thêm dòng</button>
          </div>
          <div className="space-y-2">
            {voucherRows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.so} onChange={e => setVoucherField(i, 'so', e.target.value)} placeholder="Số" className="col-span-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input value={r.maDonHang} onChange={e => setVoucherField(i, 'maDonHang', e.target.value)} placeholder="Mã đơn hàng" className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input value={r.dienGiai} onChange={e => setVoucherField(i, 'dienGiai', e.target.value)} placeholder="Diễn giải" className="col-span-4 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" value={r.ctsPhaiThu} onChange={e => setVoucherField(i, 'ctsPhaiThu', e.target.value)} placeholder="CTS phải thu" className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" value={r.daThuKhach} onChange={e => setVoucherField(i, 'daThuKhach', e.target.value)} placeholder="Đã thu khách" className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => removeVoucherRow(i)} className="col-span-1 text-red-500 hover:text-red-700 text-sm">✕</button>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            I - Tổng phải thu: <b>{fmtNum(totalPhaiThu)}</b> &nbsp;|&nbsp; II - Tổng thu khách: <b>{fmtNum(totalThuKhach)}</b> &nbsp;|&nbsp; III - Chênh lệch: <b>{fmtNum(chenhLech)}</b>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-600 uppercase">Thanh toán ngoại tệ cho khách (nếu trả qua tài khoản Trung Quốc)</label>
            <button onClick={addFxRow} className="text-blue-600 hover:text-blue-800 text-sm">+ Thêm dòng</button>
          </div>
          <div className="space-y-2">
            {fxRows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.noiDung} onChange={e => setFxField(i, 'noiDung', e.target.value)} placeholder="Nội dung / tài khoản nhận" className="col-span-6 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" value={r.tyGia} onChange={e => setFxField(i, 'tyGia', e.target.value)} placeholder="Tỷ giá" className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" value={r.soTe} onChange={e => setFxField(i, 'soTe', e.target.value)} placeholder="Số tệ" className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" value={r.thanhTien} onChange={e => setFxField(i, 'thanhTien', e.target.value)} placeholder="Thành tiền" className="col-span-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => removeFxRow(i)} className="col-span-1 text-red-500 hover:text-red-700 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Vùng xem trước / dùng để in */}
      <div id="dntt-print-zone" className="bg-white border border-gray-200 rounded-xl p-8 mt-6" style={{ fontFamily: "'Times New Roman', serif" }}>
        <table className="no-border" style={{ marginBottom: 12 }}><tbody>
          <tr className="no-border"><td className="no-border" style={{ textAlign: 'center', fontWeight: 'bold' }}>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</td></tr>
          <tr className="no-border"><td className="no-border" style={{ textAlign: 'center', fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</td></tr>
        </tbody></table>

        <h2 style={{ textAlign: 'center', margin: '10px 0 2px' }}>GIẤY ĐỀ NGHỊ THANH TOÁN</h2>
        <p style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 0 }}>(V/v: Trả lại tiền thừa cho khách hàng)</p>

        <table className="no-border"><tbody>
          <tr className="no-border">
            <td className="no-border">Ngày đề nghị: <b>{fmtDateVN(requestDate)}</b></td>
            <td className="no-border">Ngày yêu cầu TT: <b>{fmtDateVN(dueDate)}</b></td>
          </tr>
          <tr className="no-border">
            <td className="no-border">Mã khách hàng: <b>{customerId}</b></td>
            <td className="no-border">Tên khách hàng: <b>{customer?.companyName || ''}</b></td>
          </tr>
          <tr className="no-border">
            <td className="no-border">Số tài khoản nhận tiền: <b>{receiveAccount}</b></td>
            <td className="no-border">Tên người nhận: <b>{receiverName}</b></td>
          </tr>
          <tr className="no-border"><td className="no-border" colSpan={2}>Hình thức trả lại: <b>{refundMethod}</b></td></tr>
        </tbody></table>

        <p style={{ marginTop: 10, marginBottom: 4 }}>Đề nghị thanh toán theo bảng kê sau:</p>
        <table style={{ marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>Số</th>
              <th style={{ width: 90 }}>Mã đơn hàng</th>
              <th>Diễn giải</th>
              <th style={{ width: 110 }}>CTS Phải thu</th>
              <th style={{ width: 110 }}>Đã thu khách</th>
              <th style={{ width: 110 }}>Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {voucherRows.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{r.so}</td>
                <td>{r.maDonHang}</td>
                <td>{r.dienGiai}</td>
                <td style={{ textAlign: 'right' }}>{r.ctsPhaiThu ? fmtNum(r.ctsPhaiThu) : ''}</td>
                <td style={{ textAlign: 'right' }}>{r.daThuKhach ? fmtNum(r.daThuKhach) : ''}</td>
                <td style={{ textAlign: 'right' }}>{(num(r.daThuKhach) || num(r.ctsPhaiThu)) ? fmtNum(num(r.daThuKhach) - num(r.ctsPhaiThu)) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="no-border"><tbody>
          <tr className="no-border"><td className="no-border">I - Tổng cộng số tiền phải thu</td><td className="no-border" style={{ textAlign: 'right', width: 140 }}>{fmtNum(totalPhaiThu)}</td></tr>
          <tr className="no-border"><td className="no-border">II - Tổng số tiền thu khách</td><td className="no-border" style={{ textAlign: 'right' }}>{fmtNum(totalThuKhach)}</td></tr>
          <tr className="no-border"><td className="no-border">III - Chênh lệch</td><td className="no-border" style={{ textAlign: 'right' }}>{fmtNum(chenhLech)}</td></tr>
          <tr className="no-border"><td className="no-border">1 - Công ty phải thu khách (I &gt; II)</td><td className="no-border" style={{ textAlign: 'right' }}>{fmtNum(phaiThuKhach)}</td></tr>
          <tr className="no-border"><td className="no-border">2 - Công ty còn phải trả khách (I &lt; II)</td><td className="no-border" style={{ textAlign: 'right' }}>{fmtNum(phaiTraKhach)}</td></tr>
        </tbody></table>

        <p style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>THANH TOÁN NGOẠI TỆ CHO KHÁCH</p>
        <table style={{ marginBottom: 4 }}>
          <thead><tr>
            <th>Nội dung</th>
            <th style={{ width: 80 }}>Tỷ giá</th>
            <th style={{ width: 100 }}>Số tệ</th>
            <th style={{ width: 130 }}>Thành tiền</th>
          </tr></thead>
          <tbody>
            {fxRows.map((r, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'pre-line' }}>{r.noiDung}</td>
                <td style={{ textAlign: 'right' }}>{r.tyGia}</td>
                <td style={{ textAlign: 'right' }}>{r.soTe ? fmtNum(r.soTe) : ''}</td>
                <td style={{ textAlign: 'right' }}>{r.thanhTien ? fmtNum(r.thanhTien) : ''}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Tổng tiền chuyển</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmtNum(totalTienChuyen)}</td>
            </tr>
            <tr>
              <td colSpan={3} style={{ textAlign: 'right' }}>Chênh lệch còn lại</td>
              <td style={{ textAlign: 'right' }}>{fmtNum(chenhLechConLai)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: 8 }}>Bằng chữ: <i>{soTienBangChu}</i></p>
        <p>Ghi chú: {note}</p>

        <table className="no-border" style={{ marginTop: 20 }}><tbody>
          <tr className="no-border"><td className="no-border" colSpan={4} style={{ textAlign: 'right' }}>Ngày {new Date(requestDate).getDate()} tháng {new Date(requestDate).getMonth() + 1} năm {new Date(requestDate).getFullYear()}</td></tr>
        </tbody></table>
        <table style={{ marginTop: 6 }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', width: '25%' }}>Người đề nghị</td>
              <td style={{ textAlign: 'center', width: '25%' }}>Trưởng phòng</td>
              <td style={{ textAlign: 'center', width: '25%' }}>Kế toán trưởng</td>
              <td style={{ textAlign: 'center', width: '25%' }}>Giám Đốc</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'center', fontStyle: 'italic', height: 60 }}>(Ký, họ tên)</td>
              <td style={{ textAlign: 'center', fontStyle: 'italic' }}>(Ký, họ tên)</td>
              <td style={{ textAlign: 'center', fontStyle: 'italic' }}>(Ký, họ tên)</td>
              <td style={{ textAlign: 'center', fontStyle: 'italic' }}>(Ký, đóng dấu)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
