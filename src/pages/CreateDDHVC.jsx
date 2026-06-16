// File: src/pages/CreateDDHVC.jsx
import { useState, useEffect } from 'react';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { Alert } from '../components/Alert';
import { PartyInfoCard } from '../components/PartyInfoCard';
import { ContractIdPreview } from '../components/ContractIdPreview';
import { ServiceFeeTable } from '../previews/ServiceFeeTable';
import { DDHVCPreview } from '../previews/DDHVCPreview';
import { buildContractId } from '../helpers';

export const CreateDDHVC = ({ sellers, customers, contracts, onSave, setPage, editData }) => {
  const isEdit = !!editData;
  const [sellerId, setSellerId] = useState(editData?.sellerId || '');
  const [customerId, setCustomerId] = useState(editData?.customerId || '');
  const [stt, setStt] = useState(editData?.stt || '');
  const [date, setDate] = useState(editData?.date || new Date().toISOString().slice(0, 10));
  const [feeAmount, setFeeAmount] = useState(editData?.goods?.[0]?.donGia ?? '');
  const [hdntVcId, setHdntVcId] = useState(editData?.relatedContracts?.hdnt_vc || '');
  const [showPreview, setShowPreview] = useState(false);
  // null = số hợp đồng tự sinh theo thông tin bên dưới; nếu khác null là người dùng đã tự sửa
  const [idOverride, setIdOverride] = useState(editData?.contractId ?? null);
  const seller = sellers[sellerId] || {};
  const customer = customers[customerId] || {};
  const saleCode = customer.assignedSale?.code || '';

  const matchingHDNTs = Object.values(contracts)
    .filter(c => c.type === 'HDNT_VC' && c.customerId === customerId && c.sellerId === sellerId)
    .sort((a, b) => b.contractId.localeCompare(a.contractId));

  useEffect(() => { setHdntVcId(matchingHDNTs[0]?.contractId || ''); }, [customerId, sellerId]);

  const fee = Number(feeAmount) || 0;
  const goods = fee > 0 ? [{ stt: 1, tenHang: 'Phí dịch vụ Logistics trọn gói', dvt: 'Trọn gói', soLuong: 1, donGia: fee, thanhTien: fee, vatRate: 8 }] : [];

  const autoContractId = buildContractId({ type: 'DDH_VC', date, saleCode, stt, sellerName: seller.companyName, customerName: customer.companyName });
  const contractId = idOverride !== null ? idOverride : autoContractId;
  const getContract = () => (customerId && sellerId) ? {
    contractId, type: 'DDH_VC', customerId, sellerId, saleCode, stt,
    customerName: customer.companyName, date, status: editData?.status || 'Hiệu lực', goods,
    relatedContracts: { hdnt_vc: hdntVcId }
  } : null;

  const save = async () => {
    if (!sellerId) return alert('Vui lòng chọn công ty bên bán');
    if (!customerId) return alert('Vui lòng chọn khách hàng');
    if (!stt.trim()) return alert('Vui lòng nhập STT (số thứ tự)');
    if (!contractId.trim()) return alert('Số hợp đồng không được để trống');
    if (fee <= 0) return alert('Vui lòng nhập phí dịch vụ trọn gói');
    if (!isEdit && contracts[contractId]) return alert('Số hợp đồng đã tồn tại:\n' + contractId);
    if (isEdit && contracts[contractId] && contractId !== editData.contractId) return alert('Số hợp đồng mới đã tồn tại:\n' + contractId);
    await onSave(getContract(), isEdit ? editData.contractId : null);
    setPage('ddh_vc');
  };

  const preview = getContract();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setPage('ddh_vc')} className="text-blue-600 hover:text-blue-800 text-sm">← Quay lại</button>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? '✏️ Sửa Đơn Đặt Dịch Vụ' : 'Tạo Đơn Đặt Dịch Vụ'}</h1>
        {isEdit && <span className="text-sm text-gray-500 font-mono">{editData.contractId}</span>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <SearchableSelect
            label="Khách hàng (Bên Thuê Dịch Vụ)" required
            value={customerId} onChange={setCustomerId}
            placeholder="-- Chọn khách hàng --"
            options={Object.entries(customers).map(([id, c]) => ({ value: id, label: `${id} – ${c.companyName}` }))}
          />
          <SearchableSelect
            label="Công ty bên bán (Bên Nhận Dịch Vụ)" required
            value={sellerId} onChange={setSellerId}
            placeholder="-- Chọn bên bán --"
            options={Object.entries(sellers).map(([id, s]) => ({ value: id, label: `${s.shortName ? `[${s.shortName}] ` : ''}${s.companyName}` }))}
          />
        </div>

        {(customerId || sellerId) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <PartyInfoCard title="Bên Thuê Dịch Vụ (tự điền)" p={customer} extra={customer.assignedSale?.code ? <span className="text-gray-400 font-normal"> • Sale: {customer.assignedSale.code}</span> : null} />
            <PartyInfoCard title="Bên Nhận Dịch Vụ (tự điền)" p={seller} extra={seller.shortName ? <span className="text-gray-400 font-normal"> • Viết tắt: {seller.shortName}</span> : null} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">STT (3 số) <span className="text-red-500">*</span></label>
            <input value={stt} onChange={e => setStt(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="VD: 001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ngày đặt dịch vụ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <Select label="Gắn HĐNT vận chuyển" value={hdntVcId} onChange={setHdntVcId}>
            <option value="">-- Không gắn --</option>
            {matchingHDNTs.map(h => <option key={h.contractId} value={h.contractId}>{h.contractId}</option>)}
          </Select>
        </div>

        {Object.keys(sellers).length === 0 && (
          <Alert type="warn">Chưa có công ty bên bán. <button onClick={() => setPage('settings')} className="underline font-medium">Thêm ngay →</button></Alert>
        )}
        {customerId && sellerId && (
          matchingHDNTs.length > 0
            ? <Alert type="info">🔗 Có {matchingHDNTs.length} HĐNT vận chuyển cho cặp này. {hdntVcId ? <>Đang gắn: <strong>{hdntVcId}</strong></> : 'Chưa chọn HĐNT để gắn.'}</Alert>
            : <Alert type="warn">Cặp KH + Cty bán này chưa có HĐNT vận chuyển nào. Bạn có thể tạo HĐNT trước, hoặc để trống.</Alert>
        )}
        {customerId && sellerId && stt && (
          <ContractIdPreview
            id={contractId}
            onChange={setIdOverride}
            isAuto={idOverride === null}
            onReset={() => setIdOverride(null)}
          />
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">Phí dịch vụ Logistics trọn gói (tạm tính, Vnđ) <span className="text-red-500">*</span></label>
          <input type="number" min="0" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder="VD: 15000000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3" />
          {fee > 0 ? (
            <ServiceFeeTable goods={goods} feeLabel="Phí dịch vụ Logistics trọn gói tạm tính (Vnd)" totalLabel="Tổng cộng giá trị sau thuế (Vnd)" />
          ) : (
            <div className="text-sm text-gray-400 italic">Nhập phí dịch vụ để tự động tính thuế GTGT 8% và tổng cộng.</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowPreview(p => !p)} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
          {showPreview ? '🙈 Ẩn xem trước' : '👁️ Xem trước đơn đặt dịch vụ'}
        </button>
        <button onClick={save} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm font-medium shadow">{isEdit ? '✓ Lưu thay đổi' : '✓ Lưu đơn đặt dịch vụ'}</button>
      </div>

      {showPreview && preview && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-8">
          <DDHVCPreview c={preview} seller={seller} customer={customer} />
        </div>
      )}
    </div>
  );
};
