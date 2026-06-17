// File: src/pages/Dashboard.jsx
import { Badge } from '../components/Badge';
import { TYPE_COLOR } from '../helpers';

export const Dashboard = ({ customers, contracts, setPage }) => {
  const counts = { HDNT: 0, DDH: 0, BBBG: 0, HDNT_VC: 0, DDH_VC: 0, BBBG_VC: 0, HDNT_UT: 0, DDH_UT: 0, BBBG_UT: 0 };
  Object.values(contracts).forEach(c => { if (counts[c.type] !== undefined) counts[c.type]++; });
  const recent = Object.values(contracts).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);

  const Stat = ({ label, value, color, sub }) => (
    <div className={`rounded-xl p-5 ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="font-medium mt-1">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );

  const QuickBtn = ({ color, icon, title, sub, page }) => (
    <button onClick={() => setPage(page)} className={`${color} text-white rounded-xl p-4 text-left hover:opacity-90 transition shadow`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs opacity-80">{sub}</div>
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Tổng quan</div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Stat label="Khách hàng" value={Object.keys(customers).length} color="bg-blue-50 text-blue-700 border border-blue-200" />
        <Stat label="HĐNT mua bán" value={counts.HDNT} color="bg-green-50 text-green-700 border border-green-200" />
        <Stat label="ĐĐH mua bán" value={counts.DDH} color="bg-yellow-50 text-yellow-700 border border-yellow-200" />
        <Stat label="BBBG mua bán" value={counts.BBBG} color="bg-purple-50 text-purple-700 border border-purple-200" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Stat label="HĐNT vận chuyển" value={counts.HDNT_VC} color="bg-green-50 text-green-700 border border-green-200" />
        <Stat label="ĐHVC" value={counts.DDH_VC} color="bg-yellow-50 text-yellow-700 border border-yellow-200" />
        <Stat label="BBBG vận chuyển" value={counts.BBBG_VC} color="bg-purple-50 text-purple-700 border border-purple-200" />
        <Stat label="Tổng số hợp đồng" value={Object.values(counts).reduce((a, b) => a + b, 0)} color="bg-blue-50 text-blue-700 border border-blue-200" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="HĐNT ủy thác" value={counts.HDNT_UT} color="bg-green-50 text-green-700 border border-green-200" />
        <Stat label="ĐH ủy thác" value={counts.DDH_UT} color="bg-yellow-50 text-yellow-700 border border-yellow-200" />
        <Stat label="BBBG ủy thác" value={counts.BBBG_UT} color="bg-purple-50 text-purple-700 border border-purple-200" />
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">🛍️ Tạo nhanh — Hợp đồng mua bán</div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <QuickBtn color="bg-green-600" icon="📋" title="Tạo HĐNT" sub="Hợp đồng nguyên tắc" page="create-hdnt" />
        <QuickBtn color="bg-yellow-500" icon="📦" title="Tạo ĐĐH" sub="Đơn đặt hàng + AI VAT" page="create-ddh" />
        <QuickBtn color="bg-purple-600" icon="✅" title="Tạo BBBG" sub="Biên bản bàn giao" page="create-bbbg" />
        <QuickBtn color="bg-blue-600" icon="👥" title="Khách hàng" sub="Thêm / sửa / xóa" page="customers" />
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">🚚 Tạo nhanh — Hợp đồng vận chuyển</div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <QuickBtn color="bg-green-600" icon="📋" title="Tạo HĐNT vận chuyển" sub="Cung cấp dịch vụ Logistics" page="create-hdnt_vc" />
        <QuickBtn color="bg-yellow-500" icon="📦" title="Tạo Đơn Đặt Dịch Vụ" sub="Phí dịch vụ trọn gói" page="create-ddh_vc" />
        <QuickBtn color="bg-purple-600" icon="✅" title="Tạo BBBG vận chuyển" sub="Biên bản bàn giao" page="create-bbbg_vc" />
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">🤝 Tạo nhanh — Hợp đồng ủy thác</div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <QuickBtn color="bg-green-600" icon="📋" title="Tạo HĐNT ủy thác" sub="Ủy thác nhập khẩu hàng hóa" page="create-hdnt_ut" />
        <QuickBtn color="bg-yellow-500" icon="📦" title="Tạo Đơn Đặt Dịch Vụ" sub="Giá trị hàng + phí trọn gói" page="create-ddh_ut" />
        <QuickBtn color="bg-purple-600" icon="✅" title="Tạo BBBG ủy thác" sub="Biên bản bàn giao" page="create-bbbg_ut" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">🕐 Hợp đồng gần đây</div>
        {recent.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có hợp đồng nào. Bắt đầu tạo mới!</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-2.5">Số HĐ</th>
              <th className="text-left px-4 py-2.5">Loại</th>
              <th className="text-left px-4 py-2.5">Khách hàng</th>
              <th className="text-left px-4 py-2.5">Ngày</th>
              <th className="text-left px-4 py-2.5">Trạng thái</th>
            </tr></thead>
            <tbody>
              {recent.map(c => (
                <tr key={c.contractId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-blue-700 font-medium">{c.contractId}</td>
                  <td className="px-4 py-2.5">
                    <Badge color={TYPE_COLOR[c.type] || 'gray'}>{c.type}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{c.customerSnapshot?.companyName || c.customerName || c.customerId}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.date}</td>
                  <td className="px-4 py-2.5"><Badge color="blue">{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
