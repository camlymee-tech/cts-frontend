// File: src/pages/PaymentRequestPrint.jsx
// Giấy Đề Nghị Thanh Toán — vừa là màn nhập liệu thật (lưu ngược vào bảng lô hàng), vừa in ra giấy.
import { useState, useEffect } from 'react';
import { fmtNum, numberToWords } from '../helpers';
import { SearchableSelect } from '../components/SearchableSelect';

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

const blankVoucherRow = () => ({ dienGiai: '', ctsPhaiThu: '', daThuKhach: '' });
const blankFxRow = () => ({ noiDung: '', tyGia: '', soTe: '' });

// Ô nhập số hiển thị có dấu chấm phân cách hàng nghìn (VD: 1.000.000) ngay khi gõ
const MoneyInput = ({ value, onChange, className }) => {
  const display = value === '' || value === null || value === undefined ? '' : Number(value).toLocaleString('vi-VN');
  return (
    <input
      type="text" inputMode="numeric" value={display}
      onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); onChange(raw === '' ? '' : raw); }}
      className={className}
    />
  );
};

export const PaymentRequestPrint = ({ customerId: initialCustomerId, customer: initialCustomer, batches: initialBatches, customers = {}, sellers = {}, onSave, onSelectCustomer, onClose }) => {
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const customer = customers[customerId] || initialCustomer;
  const batchesOfCustomer = initialBatches ? initialBatches.filter(b => !customerId || b.customer_id === customerId) : [];

  const [requestDate, setRequestDate] = useState(todayISO());

  const [sellerId, setSellerId] = useState('');
  const [receiveAccount, setReceiveAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [note, setNote] = useState('');
  const [voucherRows, setVoucherRows] = useState([blankVoucherRow()]);
  const [fxRows, setFxRows] = useState([blankFxRow()]);
  const [saving, setSaving] = useState(false);

  // Nếu mở kèm sẵn danh sách lô của khách (đến từ nút "In DNTT") — tự điền bảng chứng từ từ đó
  useEffect(() => {
    if (batchesOfCustomer.length > 0) {
      setVoucherRows(batchesOfCustomer.map(b => ({
        dienGiai: b.goods_desc || '', ctsPhaiThu: b.deposit_vnd ?? '', daThuKhach: b.customer_paid_total ?? '',
      })));
      const firstBank = batchesOfCustomer.find(b => b.bank_account);
      if (firstBank) { setReceiveAccount(firstBank.bank_account || ''); setBankName(firstBank.bank_name || ''); }
      if (batchesOfCustomer[0]?.seller_id) setSellerId(batchesOfCustomer[0].seller_id);
    }
    // chỉ chạy 1 lần khi mở kèm sẵn dữ liệu, không tự chạy lại khi người dùng đang gõ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const num = (v) => Number(v) || 0;

  const totalPhaiThu = voucherRows.reduce((s, r) => s + num(r.ctsPhaiThu), 0);
  const totalThuKhach = voucherRows.reduce((s, r) => s + num(r.daThuKhach), 0);
  const chenhLech = totalPhaiThu - totalThuKhach;
  const phaiThuKhach = chenhLech >= 0 ? chenhLech : 0;
  const phaiTraKhach = chenhLech < 0 ? chenhLech : 0;

  // Thành tiền = Tỷ giá × Số tệ (tự tính, không nhập tay)
  const fxThanhTien = (r) => num(r.tyGia) * num(r.soTe);
  const totalTienChuyen = fxRows.reduce((s, r) => s + fxThanhTien(r), 0);
  const chenhLechConLai = totalTienChuyen + chenhLech;
  const soTienBangChu = numberToWords(Math.abs(totalTienChuyen || Math.abs(phaiTraKhach) || phaiThuKhach));

  const setVoucherField = (idx, key, val) => setVoucherRows(rows => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const addVoucherRow = () => setVoucherRows(rows => [...rows, blankVoucherRow()]);
  const removeVoucherRow = (idx) => setVoucherRows(rows => rows.filter((_, i) => i !== idx));

  const setFxField = (idx, key, val) => setFxRows(rows => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const addFxRow = () => setFxRows(rows => [...rows, blankFxRow()]);
  const removeFxRow = (idx) => setFxRows(rows => rows.filter((_, i) => i !== idx));

  const pickSeller = (id) => {
    setSellerId(id);
    if (sellers[id]) { setReceiveAccount(sellers[id].bankAccount || ''); setBankName(sellers[id].bankName || ''); }
  };

  // Lưu ngược từng dòng chứng từ thành 1 lô hàng mới trong bảng theo dõi của khách hàng này
  const handleSaveToSystem = async () => {
    if (!customerId) return alert('Vui lòng chọn khách hàng trước khi lưu.');
    const rowsToSave = voucherRows.filter(r => num(r.ctsPhaiThu) || num(r.daThuKhach) || r.dienGiai.trim());
    if (rowsToSave.length === 0) return alert('Chưa có dòng chứng từ nào để lưu.');
    setSaving(true);
    try {
      for (const r of rowsToSave) {
        await onSave(null, {
          customer_id: customerId,
          seller_id: sellerId || null,
          goods_desc: r.dienGiai || null,
          deposit_vnd: r.ctsPhaiThu === '' ? null : num(r.ctsPhaiThu),
          customer_paid_total: r.daThuKhach === '' ? null : num(r.daThuKhach),
          bank_account: receiveAccount || null,
          bank_name: bankName || null,
          order_date: requestDate,
          note: note || null,
        });
      }
      alert(`Đã lưu ${rowsToSave.length} lô hàng mới vào bảng theo dõi dòng tiền của khách hàng này.`);
      // Sau khi lưu xong, reset về trống để làm tiếp đề nghị thanh toán mới
      if (!initialCustomerId) { setCustomerId(''); onSelectCustomer?.(''); }
      setSellerId('');
      setReceiveAccount('');
      setBankName('');
      setNote('');
      setVoucherRows([blankVoucherRow()]);
      setFxRows([blankFxRow()]);
      setRequestDate(todayISO());
    } catch (err) {
      alert('Có lỗi khi lưu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

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

  const customerOptions = Object.entries(customers).map(([id, c]) => ({ value: id, label: `${id} — ${c.companyName}` }));
  const sellerOptions = Object.entries(sellers).map(([id, s]) => ({ value: id, label: s.shortName ? `[${s.shortName}] ${s.companyName}` : s.companyName }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 no-print">
        <div className="flex items-center gap-3">
          {onClose && <button onClick={onClose} className="text-gray-500 hover:text-gray-700">← Quay lại</button>}
          <h1 className="text-xl font-bold text-gray-800">🧾 Giấy Đề Nghị Thanh Toán{customer ? ` — ${customer.companyName}` : ''}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSaveToSystem} disabled={saving || !customerId}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu vào hệ thống'}
          </button>
          <button onClick={doPrint} disabled={!customerId} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">🖨️ In / Xuất PDF</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 no-print">
        {!initialCustomerId && (
          <div className="max-w-sm">
            <SearchableSelect label="Khách hàng" required value={customerId}
              onChange={(v) => { setCustomerId(v); onSelectCustomer?.(v); }}
              placeholder="-- Chọn khách hàng --" options={customerOptions} />
          </div>
        )}

        {customerId && (
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ngày làm đề nghị</label>
              <input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <SearchableSelect label="Cty thu tiền (bên bán)" value={sellerId} onChange={pickSeller}
                placeholder="-- Chọn --" options={sellerOptions} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Số tài khoản nhận tiền</label>
              <input value={receiveAccount} onChange={e => setReceiveAccount(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ngân hàng</label>
              <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {customerId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-600 uppercase">Bảng chứng từ — mỗi dòng sẽ lưu thành 1 lô hàng mới</label>
            <button onClick={addVoucherRow} className="text-blue-600 hover:text-blue-800 text-sm">+ Thêm dòng</button>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1 px-1">
            <label className="col-span-6 text-xs text-gray-500">Diễn giải</label>
            <label className="col-span-3 text-xs text-gray-500">CTS phải thu (tiền cọc)</label>
            <label className="col-span-2 text-xs text-gray-500">Đã thu khách (tổng KH đã chuyển)</label>
          </div>
          <div className="space-y-2">
            {voucherRows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.dienGiai} onChange={e => setVoucherField(i, 'dienGiai', e.target.value)} className="col-span-6 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <MoneyInput value={r.ctsPhaiThu} onChange={v => setVoucherField(i, 'ctsPhaiThu', v)} className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
                <MoneyInput value={r.daThuKhach} onChange={v => setVoucherField(i, 'daThuKhach', v)} className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
                <button onClick={() => removeVoucherRow(i)} className="col-span-1 text-red-500 hover:text-red-700 text-sm">✕</button>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            I - Tổng phải thu: <b>{fmtNum(totalPhaiThu)}</b> &nbsp;|&nbsp; II - Tổng thu khách: <b>{fmtNum(totalThuKhach)}</b> &nbsp;|&nbsp; III - Chênh lệch: <b>{fmtNum(chenhLech)}</b>
          </div>
        </div>
        )}

        {customerId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-600 uppercase">Thanh toán ngoại tệ cho khách (nếu trả qua tài khoản Trung Quốc)</label>
            <button onClick={addFxRow} className="text-blue-600 hover:text-blue-800 text-sm">+ Thêm dòng</button>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1 px-1">
            <label className="col-span-6 text-xs text-gray-500">Nội dung / tài khoản nhận</label>
            <label className="col-span-2 text-xs text-gray-500">Tỷ giá</label>
            <label className="col-span-2 text-xs text-gray-500">Số tệ</label>
            <label className="col-span-2 text-xs text-gray-500">Thành tiền (tự tính)</label>
          </div>
          <div className="space-y-2">
            {fxRows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.noiDung} onChange={e => setFxField(i, 'noiDung', e.target.value)} className="col-span-6 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <MoneyInput value={r.tyGia} onChange={v => setFxField(i, 'tyGia', v)} className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
                <MoneyInput value={r.soTe} onChange={v => setFxField(i, 'soTe', v)} className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
                <div className="col-span-1 text-sm text-gray-500 text-right pr-1">{fmtNum(fxThanhTien(r))}</div>
                <button onClick={() => removeFxRow(i)} className="col-span-1 text-red-500 hover:text-red-700 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
        )}

        {customerId && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        )}
      </div>

      {/* Vùng xem trước / dùng để in */}
      {customerId && (
      <div id="dntt-print-zone" className="bg-white border border-gray-200 rounded-xl p-8 mt-6" style={{ fontFamily: "'Times New Roman', serif" }}>
        <table className="no-border" style={{ marginBottom: 12 }}><tbody>
          <tr className="no-border"><td className="no-border" style={{ textAlign: 'center', fontWeight: 'bold' }}>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</td></tr>
          <tr className="no-border"><td className="no-border" style={{ textAlign: 'center', fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</td></tr>
        </tbody></table>

        <h2 style={{ textAlign: 'center', margin: '10px 0 2px' }}>GIẤY ĐỀ NGHỊ THANH TOÁN</h2>

        <table className="no-border"><tbody>
          <tr className="no-border">
            <td className="no-border">Ngày đề nghị: <b>{fmtDateVN(requestDate)}</b></td>
          </tr>
          <tr className="no-border">
            <td className="no-border">Mã khách hàng: <b>{customerId}</b></td>
            <td className="no-border">Tên khách hàng: <b>{customer?.companyName || ''}</b></td>
          </tr>
          <tr className="no-border">
            <td className="no-border" colSpan={2}>Công ty bên bán: <b>{sellers[sellerId]?.companyName || '—'}</b></td>
          </tr>
          <tr className="no-border">
            <td className="no-border" colSpan={2}>Số tài khoản nhận tiền: <b>{receiveAccount}{bankName ? ` (${bankName})` : ''}</b></td>
          </tr>
        </tbody></table>

        <p style={{ marginTop: 10, marginBottom: 4 }}>Đề nghị thanh toán theo bảng kê sau:</p>
        <table style={{ marginBottom: 8 }}>
          <thead>
            <tr>
              <th>Diễn giải</th>
              <th style={{ width: 120 }}>CTS Phải thu</th>
              <th style={{ width: 120 }}>Đã thu khách</th>
              <th style={{ width: 120 }}>Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {voucherRows.map((r, i) => (
              <tr key={i}>
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
                <td style={{ textAlign: 'right' }}>{fmtNum(fxThanhTien(r))}</td>
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
      )}
    </div>
  );
};
