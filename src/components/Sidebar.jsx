// File: src/components/Sidebar.jsx
export const Sidebar = ({ page, setPage, counts, onLogout, isAdmin }) => {
  const nav = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    ...(isAdmin ? [{ id: 'settings', icon: '⚙️', label: 'Cài đặt' }] : []),
    { id: 'customers', icon: '👥', label: 'Khách hàng' },
    null,
    { id: 'hdnt', icon: '📋', label: 'HĐ Nguyên Tắc', count: counts.HDNT, color: 'bg-green-500' },
    { id: 'ddh', icon: '📦', label: 'Đơn Đặt Hàng', count: counts.DDH, color: 'bg-yellow-500' },
    { id: 'bbbg', icon: '✅', label: 'Biên Bản BG', count: counts.BBBG, color: 'bg-purple-500' },
    ...(isAdmin ? [
      null,
      { id: 'admin-users', icon: '👤', label: 'Quản lý tài khoản' },
    ] : []),
  ];

  return (
    <aside className="w-60 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col no-print" style={{ minHeight: '100vh' }}>
      <div className="p-5 border-b border-blue-700">
        <div className="text-lg font-bold tracking-wide">CTS Contracts</div>
        <div className="text-blue-300 text-xs mt-0.5">CTS Logistics Vietnam</div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map((item, i) => item === null ? (
          <div key={i} className="border-t border-blue-700 my-3" />
        ) : (
          <button key={item.id} onClick={() => setPage(item.id)}
            className={`sidebar-btn w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm ${page === item.id || page.startsWith(item.id + '-') ? 'bg-blue-600 shadow-md' : 'hover:bg-blue-700/60'}`}>
            <span>{item.icon} <span className="ml-1">{item.label}</span></span>
            {item.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full text-white font-medium ${item.color || 'bg-blue-500'}`}>{item.count}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-blue-700">
        <button onClick={onLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-blue-300 hover:bg-blue-700/60 hover:text-white">
          🚪 Đăng xuất
        </button>
        <div className="text-blue-400 text-xs mt-2 px-3">CTS01-Ly • v2.0</div>
      </div>
    </aside>
  );
};
