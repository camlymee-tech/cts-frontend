// File: src/components/Field.jsx
export const Field = ({ label, value, onChange, type = 'text', placeholder = '', cols = 1, required = false }) => (
  <div className={cols === 2 ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
    />
  </div>
);
