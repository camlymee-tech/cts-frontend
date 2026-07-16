// File: src/pages/InvoiceGoodsBulkViewer.jsx
// Xem/in nhiều hóa đơn hàng hóa cùng lúc (mỗi hóa đơn 1 trang riêng khi in).
import { fmtNum } from '../helpers';

const PRINT_STYLE = `
  @page { size: A4 portrait; margin: 20mm; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.6; background: #fff; color: #000; margin: 0; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #555; padding: 4px 8px; }
  tr, td { page-break-inside: avoid !important; break-inside: avoid !important; }
  thead { display: table-header-group; }
  .no-print { display: none !important; }
  .bulk-item { page-break-after: always; break-after: page; }
  .bulk-item:last-child { page-break-after: auto; break-after: auto; }
`;

const InvoiceGoodsSheet = ({ inv }) => {
  const totalPre = inv.goods?.reduce((s, g) => s + (Number(g.thanhTien) || 0), 0) || 0;
  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: 4 }}>THÔNG TIN HÀNG HÓA THEO HÓA ĐƠN</h2>
      <p><b>Số hóa đơn:</b> {inv.invoice_no} &nbsp;&nbsp; <b>Ngày:</b> {inv.invoice_date || '—'}</p>
      <p><b>Khách hàng:</b> {inv.customer_name || '—'} {inv.customer_code ? `(${inv.customer_code})` : ''}</p>
      {inv.seller_name && <p><b>Bên bán:</b> {inv.seller_name} {inv.seller_tax_code ? `— MST: ${inv.seller_tax_code}` : ''}</p>}
      <table style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th style={{ width: 30 }}>STT</th>
            <th>Tên hàng hóa</th>
            <th style={{ width: 50 }}>ĐVT</th>
            <th style={{ width: 60 }}>SL</th>
            <th style={{ width: 90 }}>Đơn giá</th>
            <th style={{ width: 100 }}>Thành tiền</th>
            <th style={{ width: 50 }}>VAT%</th>
          </tr>
        </thead>
        <tbody>
          {(inv.goods || []).map((g, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{g.tenHang}</td>
              <td style={{ textAlign: 'center' }}>{g.dvt}</td>
              <td style={{ textAlign: 'right' }}>{fmtNum(g.soLuong)}</td>
              <td style={{ textAlign: 'right' }}>{fmtNum(g.donGia)}</td>
              <td style={{ textAlign: 'right' }}>{fmtNum(g.thanhTien)}</td>
              <td style={{ textAlign: 'center' }}>{g.vatRate}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="5" style={{ textAlign: 'right' }}>Tổng tiền hàng (trước thuế):</td>
            <td style={{ textAlign: 'right' }}>{fmtNum(totalPre)}</td>
            <td></td>
          </tr>
          <tr>
            <td colSpan="5" style={{ textAlign: 'right' }}><b>Tổng thanh toán (đã bao gồm thuế):</b></td>
            <td style={{ textAlign: 'right' }}><b>{fmtNum(inv.total || 0)}</b></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export const InvoiceGoodsBulkViewer = ({ invoices, onClose }) => {
  const getFullHtml = (innerHTML) => {
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((el) => `<link rel="stylesheet" href="${el.href}">`).join('\n');
    const styleTags = Array.from(document.querySelectorAll('style')).map((el) => el.outerHTML).join('\n');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${styleLinks}${styleTags}<style>${PRINT_STYLE}</style></head><body>${innerHTML}</body></html>`;
  };

  const doPrint = () => {
    const content = document.getElementById('invoice-bulk-print-zone').innerHTML;
    const w = window.open('', '_blank');
    if (!w) {
      alert('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup cho trang này rồi bấm lại.');
      return;
    }
    w.document.write(getFullHtml(content));
    w.document.close();
    w.onload = () => { w.focus(); w.print(); w.close(); };
    setTimeout(() => { if (!w.closed) { w.focus(); w.print(); w.close(); } }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-auto flex items-start justify-center p-4 pt-8">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b no-print flex-wrap gap-2">
          <div className="font-semibold text-gray-700">Đã chọn {invoices.length} hóa đơn</div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={doPrint} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1.5">
              🖨️ In / PDF
            </button>
            <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">✕ Đóng</button>
          </div>
        </div>
        <div className="p-10" id="invoice-bulk-print-zone">
          {invoices.map((inv, i) => (
            <div key={inv.id} className={`bulk-item ${i > 0 ? 'border-t-4 border-dashed border-gray-200 pt-10 mt-2' : ''}`}>
              <InvoiceGoodsSheet inv={inv} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
