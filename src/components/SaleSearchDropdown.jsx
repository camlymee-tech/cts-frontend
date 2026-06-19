// File: src/components/SaleSearchDropdown.jsx
// Dropdown tìm kiếm sale — thay thế <select> thuần để có ô tìm kiếm.
// Dùng ở ContractListPage (inline) và ContractViewer (assign bar).
import { useState, useEffect, useRef } from 'react';

export const SaleSearchDropdown = ({ saleProfiles = [], value, onChange, placeholder = 'Giao cho sale...', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef();
  const inputRef = useRef();

  const current = saleProfiles.find(p => p.uuid === value);

  const filtered = saleProfiles.filter(p => {
    const q = query.toLowerCase();
    return !q
      || p.name.toLowerCase().includes(q)
      || (p.ma_sale || '').toLowerCase().includes(q)
      || (p.deptName || '').toLowerCase().includes(q);
  });

  // Đóng khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (p) => {
    onChange(p.uuid);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button type="button" onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[160px] text-left">
        <span className="flex-1 truncate text-gray-700">
          {current ? `${current.name}${current.ma_sale ? ` (${current.ma_sale})` : ''}` : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg w-72 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="🔍 Tìm tên, mã sale, phòng ban..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 italic">Không tìm thấy sale nào</div>
            ) : (
              filtered.map(p => (
                <button key={p.uuid} type="button" onClick={() => select(p)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between gap-2
                    ${p.uuid === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                  <span>{p.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{[p.ma_sale, p.deptName].filter(Boolean).join(' · ')}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
