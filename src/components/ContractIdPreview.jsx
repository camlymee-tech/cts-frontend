// File: src/components/ContractIdPreview.jsx
export const ContractIdPreview = ({ id, onChange, isAuto, onReset }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-3">
    <div className="flex items-center justify-between mb-1">
      <div className="text-xs text-blue-600 font-medium">📄 Số hợp đồng</div>
      {!isAuto && onReset && (
        <button type="button" onClick={onReset} className="text-xs text-blue-600 hover:underline">
          ↺ Tự động tính lại
        </button>
      )}
    </div>
    {onChange ? (
      <input
        value={id}
        onChange={e => onChange(e.target.value)}
        className="w-full font-mono font-bold text-blue-800 text-base bg-white border border-blue-200 rounded-lg px-2.5 py-2 break-all focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    ) : (
      <div className="font-mono font-bold text-blue-800 text-base break-all">{id}</div>
    )}
    {isAuto && (
      <p className="text-xs text-blue-400 mt-1">Tự động sinh từ thông tin bên trên. Có thể sửa trực tiếp nếu cần.</p>
    )}
  </div>
);
