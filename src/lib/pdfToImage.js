// File: src/lib/pdfToImage.js
// Chuyển trang đầu của 1 file PDF thành ảnh (JPEG base64) để có thể đính kèm và in chung
// như ảnh thường — vì PDF gốc không nhúng trực tiếp được vào luồng in/PDF/Word hiện tại.
// Thư viện pdfjs-dist khá nặng nên chỉ tải khi thực sự có người upload PDF (lazy load),
// không làm tăng dung lượng tải ban đầu của toàn bộ app.
export async function pdfFirstPageToImage(file) {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const scale = 2; // độ phân giải đủ nét khi in
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
}
