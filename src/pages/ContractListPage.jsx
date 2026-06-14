// File: src/pages/ContractListPage.jsx
import { Badge } from '../components/Badge';
import { calcTotals, fmtNum } from '../helpers';

export const ContractListPage = ({ type, contracts, customers, setPage, setViewContract, onDelete, onEdit }) => {
  const labels = { HDNT: 'Hợp Đồng Nguyên Tắc', DDH: 'Đơn Đặt Hàng', BBBG: 'Biên Bản Bàn Giao' };
  const createPages = { HDNT: 'create-hdnt', DDH: 'create-ddh', BBBG: 'create-bbbg' };
  const list = Object.values(contracts).filter(c => c.type === type).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{labels[type]}</h1>
        <button onClick={() => setPage(createPages[type])} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">+ Tạo mới</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Chưa có {labels[type]} nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-5 py-3">Số hợp đồng</th>
              <th className="text-left px-5 py-3">Khách hàng</th>
              <th className="text-left px-5 py-3">Ngày</th>
              {(type === 'DDH' || type === 'BBBG') && <th className="text-left px-5 py-3">Tổng tiền</th>}
              <th className="text-left px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody>
              {list.map(c => {
                const total = calcTotals(c.goods).total;
                return (
                  <tr key={c.contractId} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono font-bold text-blue-700">{c.contractId}</td>
                    <td className="px-5 py-3 text-gray-700">{customers[c.customerId]?.companyName || c.customerId}</td>
                    <td className="px-5 py-3 text-gray-500">{c.date}</td>
                    {(type === 'DDH' || type === 'BBBG') && <td className="px-5 py-3 text-gray-700 font-medium">{total ? fmtNum(total) + ' đ' : '–'}</td>}
                    <td className="px-5 py-3"><Badge color={c.status === 'Hoàn thành' ? 'green' : 'blue'}>{c.status}</Badge></td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <button onClick={() => setViewContract(c)} className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-3">Xem →</button>
                      <button onClick={() => onEdit(c)} className="text-yellow-600 hover:text-yellow-800 font-medium text-sm mr-3">Sửa</button>
                      <button onClick={() => onDelete(c.contractId)} className="text-red-500 hover:text-red-700 font-medium text-sm">Xóa</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
