// File: src/utils/docExport.js
// Helper dùng chung để In / Tải PDF / Tải Word từ 1 vùng DOM (id="...").
// Tách riêng từ logic tương tự trong ContractViewer.jsx để dùng lại cho các trang mới
// (Sales Contract...) mà không phải sửa/đụng vào ContractViewer.jsx đang chạy ổn định.

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

export const safeFilename = (name, ext) =>
  ((name || 'sales-contract').replace(/[\/\\?%*:|"<>]/g, '-')) + ext;

const getFullHtml = (innerHTML, printStyle) => {
  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(el => `<link rel="stylesheet" href="${el.href}">`).join('\n');
  const styleTags = Array.from(document.querySelectorAll('style'))
    .map(el => el.outerHTML).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    ${styleLinks}${styleTags}
    <style>${printStyle}</style>
  </head><body>${innerHTML}</body></html>`;
};

export const doPrintZone = (zoneId, printStyle) => {
  const content = document.getElementById(zoneId).innerHTML;
  const w = window.open('', '_blank');
  if (!w) {
    alert('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup cho trang này rồi bấm lại.');
    return;
  }
  w.document.write(getFullHtml(content, printStyle));
  w.document.close();
  w.onload = () => { w.focus(); w.print(); w.close(); };
  setTimeout(() => { if (!w.closed) { w.focus(); w.print(); w.close(); } }, 800);
};

export const doDownloadPDFZone = async (zoneId, filename) => {
  await loadScriptOnce(HTML2PDF_SRC);
  const element = document.getElementById(zoneId);
  await window.html2pdf().set({
    margin: [20, 30, 20, 20], // [top, left, bottom, right] mm — chuẩn thể thức: trên 2, trái 3, dưới 2, phải 2 cm
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  }).from(element).save();
};

export const doDownloadWordZone = async (zoneId, filename, printStyle) => {
  await loadScriptOnce(HTMLDOCX_SRC);
  const element = document.getElementById(zoneId);
  const html = getFullHtml(element.innerHTML, printStyle);
  const blob = window.htmlDocx.asBlob(html, {
    orientation: 'portrait',
    margins: { top: 1134, right: 1134, bottom: 1134, left: 1701 }, // twip: trên 2 / phải 2 / dưới 2 / trái 3 cm
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
