// File: src/pages/BulkContractViewer.jsx
// Xem/in/tải PDF/Word nhiều hợp đồng cùng lúc (gộp thành 1 file, mỗi hợp đồng 1 trang riêng).
import { useState } from 'react';
import { HDNTPreview } from '../previews/HDNTPreview';
import { DDHPreview } from '../previews/DDHPreview';
import { BBBGPreview } from '../previews/BBBGPreview';
import { HDNTVCPreview } from '../previews/HDNTVCPreview';
import { DDHVCPreview } from '../previews/DDHVCPreview';
import { BBBGVCPreview } from '../previews/BBBGVCPreview';
import { HDNTUTPreview } from '../previews/HDNTUTPreview';
import { DDHUTPreview } from '../previews/DDHUTPreview';
import { BBBGUTPreview } from '../previews/BBBGUTPreview';

const PREVIEW_MAP = {
  HDNT: HDNTPreview, DDH: DDHPreview, BBBG: BBBGPreview,
  HDNT_VC: HDNTVCPreview, DDH_VC: DDHVCPreview, BBBG_VC: BBBGVCPreview,
  HDNT_UT: HDNTUTPreview, DDH_UT: DDHUTPreview, BBBG_UT: BBBGUTPreview,
};

const HTML2PDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
const HTMLDOCX_SRC = 'https://unpkg.com/html-docx-js/dist/html-docx.js';

const loadScriptOnce = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('Không tải được thư viện. Kiểm tra kết nối mạng.'));
  document.head.appendChild(script);
});

const safeFilename = (name, ext) => ((name || 'hop-dong').replace(/[\/\\?%*:|"<>]/g, '-')) + ext;

const PRINT_STYLE = `
  @page {
    size: A4 portrait;
    margin: 25mm 20mm 25mm 35mm;
  }
  body {
    font-family: 'Times New Roman', serif;
    font-size: 13px;
    line-height: 1.8;
    background: #fff;
    color: #000;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #555; padding: 4px 8px; }
  tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  td { page-break-inside: avoid !important; break-inside: avoid !important; }
  thead { display: table-header-group; }
  .no-print { display: none !important; }
  .bulk-item { page-break-after: always; break-after: page; }
  .bulk-item:last-child { page-break-after: auto; break-after: auto; }
`;

export const BulkContractViewer = ({ contracts, sellers, customers, onClose }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [wordLoading, setWordLoading] = useState(false);

  const resolveParties = (c) => ({
    customer: c.customerSnapshot || customers[c.customerId] || {},
    seller: c.sellerSnapshot || sellers[c.sellerId] || {},
  });

  const getFullHtml = (innerHTML) => {
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(el => `<link rel="stylesheet" href="${el.href}">`).join('\n');
    const styleTags = Array.from(document.querySelectorAll('style'))
      .map(el => el.outerHTML).join('\n');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      ${styleLinks}${styleTags}
      <style>${PRINT_STYLE}</style>
    </head><body>${innerHTML}</body></html>`;
  };

  const baseName = () => `gop-${contracts.length}-hopdong-${contracts[0]?.type || ''}`;

  const doPrint = () => {
    const content = document.getElementById('bulk-print-zone').innerHTML;
    const w = window.open('', '_blank');
    if (!w) {
      alert('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup cho trang này (thường có biểu tượng 🚫 trên thanh địa chỉ) rồi bấm lại.');
      return;
    }
    w.document.write(getFullHtml(content));
    w.document.close();
    w.onload = () => { w.focus(); w.print(); w.close(); };
    setTimeout(() => { if (!w.closed) { w.focus(); w.print(); w.close(); } }, 800);
  };

  const doDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await loadScriptOnce(HTML2PDF_SRC);
      const element = document.getElementById('bulk-print-zone');
      await window.html2pdf().set({
        margin: [25, 35, 25, 20],
        filename: safeFilename(baseName(), '.pdf'),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(element).save();
    } catch (err) {
      alert(err.message || 'Có lỗi khi tạo file PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const doDownloadWord = async () => {
    setWordLoading(true);
    try {
      await loadScriptOnce(HTMLDOCX_SRC);
      const element = document.getElementById('bulk-print-zone');
      const html = getFullHtml(element.innerHTML);
      const blob = window.htmlDocx.asBlob(html, {
        orientation: 'portrait',
        margins: { top: 1417, right: 1134, bottom: 1417, left: 1984 },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFilename(baseName(), '.docx');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Có lỗi khi tạo file Word.');
    } finally {
      setWordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-auto flex items-start justify-center p-4 pt-8">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b no-print flex-wrap gap-2">
          <div className="font-semibold text-gray-700">Đã chọn {contracts.length} hợp đồng</div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={doPrint}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1.5">
              🖨️ In / PDF
            </button>
            <button onClick={doDownloadPDF} disabled={pdfLoading}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm hover:bg-emerald-100 disabled:opacity-60 flex items-center gap-1.5">
              {pdfLoading ? '⏳ Đang tạo...' : '📥 Tải PDF (gộp)'}
            </button>
            <button onClick={doDownloadWord} disabled={wordLoading}
              className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm hover:bg-blue-100 disabled:opacity-60 flex items-center gap-1.5">
              {wordLoading ? '⏳ Đang tạo...' : '📄 Tải Word (gộp)'}
            </button>
            <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">✕ Đóng</button>
          </div>
        </div>
        <div className="p-10" id="bulk-print-zone">
          {contracts.map((c, i) => {
            const PreviewComp = PREVIEW_MAP[c.type] || HDNTPreview;
            const { customer, seller } = resolveParties(c);
            return (
              <div key={c.contractId} className={`bulk-item ${i > 0 ? 'border-t-4 border-dashed border-gray-200 pt-10 mt-2' : ''}`}>
                <PreviewComp c={c} seller={seller} customer={customer} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
