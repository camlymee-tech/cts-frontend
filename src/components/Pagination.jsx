// File: src/components/Pagination.jsx
import { useState } from 'react';

// Component phân trang dùng chung: dải số trang (rút gọn bằng "...") + nút Trước/Sau + ô nhảy nhanh tới trang
// (cần khi tổng số trang lớn — ví dụ vài trăm trang, bấm từng số không thực tế).
export const Pagination = ({ page, maxPage, onChange, disabled = false, siblingCount = 2 }) => {
  const [jumpValue, setJumpValue] = useState('');

  if (maxPage <= 1) return null;

  const go = (p) => {
    const clamped = Math.min(maxPage, Math.max(1, p));
    if (clamped !== page) onChange(clamped);
  };

  const handleJump = (e) => {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (!isNaN(n)) go(n);
    setJumpValue('');
  };

  // Luôn hiện trang 1 + trang cuối + vùng quanh trang hiện tại; xa quá thì rút gọn bằng "..."
  const pages = [1];
  const start = Math.max(2, page - siblingCount);
  const end = Math.min(maxPage - 1, page + siblingCount);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < maxPage - 1) pages.push('…');
  if (maxPage > 1) pages.push(maxPage);

  return (
    <div className="flex items-center justify-center flex-wrap gap-1.5 p-4 border-t border-gray-100">
      <button onClick={() => go(page - 1)} disabled={disabled || page <= 1}
        className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed">
        ← Trước
      </button>

      {pages.map((p, i) => p === '…' ? (
        <span key={`e${i}`} className="px-1 text-sm text-gray-400">…</span>
      ) : (
        <button key={p} onClick={() => go(p)} disabled={disabled}
          className={`min-w-[32px] px-2 py-1 rounded-lg text-sm font-medium disabled:opacity-50 ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          {p}
        </button>
      ))}

      <button onClick={() => go(page + 1)} disabled={disabled || page >= maxPage}
        className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed">
        Sau →
      </button>

      <form onSubmit={handleJump} className="flex items-center gap-1.5 ml-2">
        <span className="text-xs text-gray-400 whitespace-nowrap">Tới trang</span>
        <input type="number" min={1} max={maxPage} value={jumpValue} onChange={(e) => setJumpValue(e.target.value)}
          placeholder={String(page)}
          className="no-spinner w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <button type="submit" disabled={disabled}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium disabled:opacity-50">
          Đi
        </button>
      </form>
    </div>
  );
};
