// File: src/pages/ContractViewer.jsx
import { Badge } from '../components/Badge';
import { HDNTPreview } from '../previews/HDNTPreview';
import { DDHPreview } from '../previews/DDHPreview';
import { BBBGPreview } from '../previews/BBBGPreview';

export const ContractViewer = ({ contract, seller, customers, onClose, onDelete, onEdit }) => {
  const customer = customers[contract.customerId] || {};
  const PreviewComp = { HDNT: HDNTPreview, DDH: DDHPreview, BBBG: BBBGPreview }[contract.type] || HDNTPreview;

  const doPrint = () => {
    const content = document.getElementById('contract-print-zone').innerHTML;

    // Copy toàn bộ CSS hiện tại của app (Tailwind + style khác) sang trang in
    // để giữ đúng định dạng (in đậm, căn lề, khoảng cách...) như bản xem trước.
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(el => `<link rel="stylesheet" href="${el.href}">`).join('\n');
    const styleTags = Array.from(document.querySelectorAll('style'))
      .map(el => el.outerHTML).join('\n');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${contract.contractId}</title>
      ${styleLinks}
      ${styleTags}
      <style>
        @page { margin: 16mm; }
        body{font-family:'Times New Roman',serif;font-size:13px;line-height:1.8;background:#fff;color:#000;margin:0;padding:0;}
        table{border-collapse:collapse;width:100%;}
        td,th{border:1px solid #555;padding:4px 8px;}
        .no-print{display:none !important;}
      </style>
    </head><body>${content}</body></html>`);
    w.document.close();

    // Chờ CSS (đặc biệt là file Tailwind từ link rel="stylesheet") load xong rồi mới in
    w.onload = () => {
      w.focus();
      w.print();
      w.close();
    };
    // Phòng trường hợp onload không kích hoạt (một số trình duyệt)
    setTimeout(() => {
      if (!w.closed) { w.focus(); w.print(); w.close(); }
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-auto flex items-start justify-center p-4 pt-8">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b no-print">
          <div>
            <span className="font-mono font-bold text-blue-700 text-lg">{contract.contractId}</span>
            <Badge color={contract.type === 'HDNT' ? 'green' : contract.type === 'DDH' ? 'yellow' : 'purple'}>{contract.type}</Badge>
          </div>
          <div className="flex gap-2">
            <button onClick={doPrint} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1.5">🖨️ In / PDF</button>
            <button onClick={() => { onEdit(contract); onClose(); }} className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm hover:bg-blue-100">✏️ Sửa</button>
            <button onClick={() => onDelete(contract.contractId)} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm hover:bg-red-100">🗑️ Xóa</button>
            <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">✕ Đóng</button>
          </div>
        </div>
        <div className="p-10" id="contract-print-zone">
          <PreviewComp c={contract} seller={seller} customer={customer} />
        </div>
      </div>
    </div>
  );
};
