// File: src/components/ContractIdPreview.jsx
export const ContractIdPreview = ({ id }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-3">
    <div className="text-xs text-blue-600 font-medium mb-1">📄 Số hợp đồng (xem trước realtime)</div>
    <div className="font-mono font-bold text-blue-800 text-base break-all">{id}</div>
  </div>
);
