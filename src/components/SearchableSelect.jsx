// File: src/components/SearchableSelect.jsx
import { useState, useRef, useEffect } from 'react';

// Dropdown có ô tìm kiếm — dùng cho danh sách dài (khách hàng, công ty bên bán...).
// options: [{ value, label }]
export const SearchableSelect = ({ label, value, onChange, options, placeholder = '-- Chọn --', required }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  const selected = options.find(o => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;

  const pick = (opt) => { onChange(opt.value); setQuery(''); setOpen(false); };

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-300">
        <span className={`truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>{selected ? selected.label : placeholder}</span>
        <span className="text-gray-400 ml-2 shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="🔍 Tìm theo mã hoặc tên..."
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="overflow-y-auto max-h-64">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400 text-center">Không tìm thấy kết quả</div>
            ) : filtered.map(opt => (
              <button key={opt.value} type="button" onClick={() => pick(opt)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${opt.value === value ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
