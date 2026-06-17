// File: src/pages/CreateBBBG.jsx
import { useState, useEffect, useRef } from 'react';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { Alert } from '../components/Alert';
import { PartyInfoCard } from '../components/PartyInfoCard';
import { ContractIdPreview } from '../components/ContractIdPreview';
import { GoodsTable } from '../components/GoodsTable';
import { BBBGPreview } from '../previews/BBBGPreview';
import { buildContractId } from '../helpers';
import { api } from '../lib/api';

export const CreateBBBG = ({ sellers, customers, contracts, onSave, setPage, editData }) => {
  const isEdit = !!editData;
  const [sellerId, setSellerId] = useState(editData?.sellerId || '');
  const [customerId, setCustomerId] = useState(editData?.customerId || '');
  const [stt, setStt] = useState(editData?.stt || '');
  const [date, setDate] = useState(editData?.date || new Date().toISOString().slice(0, 10));
  const [goods, setGoods] = useState(editData?.goods || []);
  const [hdntId, setHdntId] = useState(editData?.relatedContracts?.hdnt || '');
  const [ddhId, setDdhId] = useState(editData?.relatedContracts?.ddh || '');
  const [showPreview, setShowPreview] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  // null = số hợp đồng tự sinh theo thông tin bên dưới; nếu khác null là người dùng đã tự sửa
  const [idOverride, setIdOverride] = useState(editData?.contractId ?? null);
  const fileRef = useRef();
  const seller = sellers[sellerId] || {};
  const customer = customers[customerId] || {};
  const saleCode = customer.assignedSale?.code || '';

  const matchingHDNTs = Object.values(contracts).filter(c => c.type === 'HDNT' && c.customerId === customerId && c.sellerId === sellerId).sort((a, b) => b.contractId.localeCompare(a.contractId));
  const matchingDDHs = Object.values(contracts).filter(c => c.type === 'DDH' && c.customerId === customerId && c.sellerId === sellerId).sort((a, b) => b.contractId.localeCompare(a.contractId));

  useEffect(() => {
    setHdntId(matchingHDNTs[0]?.contractId || '');
    const d = matchingDDHs[0];
    setDdhId(d?.contractId || '');
    setGoods(d?.goods?.length ? d.goods : []);
  }, [customerId, sellerId]);

  const selectDDH = (id) => {
    setDdhId(id);
    const d = contracts[id];
    setGoods(d?.goods?.length ? d.goods : []);
  };

  // Xử lý chung cho 1 file ảnh/PDF (dùng cho cả Upload và Dán/Paste)
  const processFile = async (file) => {
    if (!file) return;
    setAiError(''); setAiLoading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const result = await api.readVAT(base64, file.type);
      setGoods(result.goods || []);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    await processFile(file);
    e.target.value = '';
  };

  // Cho phép dán ảnh hóa đơn từ clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { processFile(file); e.preventDefault(); break; }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const autoContractId = buildContractId({ type: 'BBBG', date, saleCode, stt, sellerName: seller.companyName, customerName: customer.companyName });
  const contractId = idOverride !== null ? idOverride : autoContractId;
  const getContract = () => (customerId && sellerId) ? {
    contractId, type: 'BBBG', customerId, sellerId, saleCode, stt,
    customerName: customer.companyName, date, status: editData?.status || 'Hoàn thành', goods,
    customerSnapshot: customer, sellerSnapshot: seller,
    relatedContracts: { hdnt: hdntId, ddh: ddhId }
  } : null;

  const save = async () => {
    if (!sellerId) return alert('Vui lòng chọn công ty bên bán');
    if (!customerId) return alert('Vui lòng chọn khách hàng');
    if (!stt.trim()) return alert('Vui lòng nhập STT (số thứ tự)');
    if (!contractId.trim()) return alert('Số hợp đồng không được để trống');
    if (!isEdit && contracts[contractId]) return alert('Số hợp đồng đã tồn tại:\n' + contractId);
    if (isEdit && contracts[contractId] && contractId !== editData.contractId) return alert('Số hợp đồng mới đã tồn tại:\n' + contractId);
    await onSave(getContract(), isEdit ? editData.contractId : null);
    setPage('bbbg');
  };

  const preview = getContract();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setPage('bbbg')} className="text-blue-600 hover:text-blue-800 text-sm">← Quay lại</button>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? '✏️ Sửa Biên Bản Bàn Giao' : 'Tạo Biên Bản Bàn Giao'}</h1>
        {isEdit && <span className="text-sm text-gray-500 font-mono">{editData.contractId}</span>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <SearchableSelect
            label="Khách hàng" required
            value={customerId} onChange={setCustomerId}
            placeholder="-- Chọn khách hàng --"
            options={Object.entries(customers).map(([id, c]) => ({ value: id, label: `${id} – ${c.companyName}` }))}
          />
          <SearchableSelect
            label="Công ty bên bán" required
            value={sellerId} onChange={setSellerId}
            placeholder="-- Chọn bên bán --"
            options={Object.entries(sellers).map(([id, s]) => ({ value: id, label: `${s.shortName ? `[${s.shortName}] ` : ''}${s.companyName}` }))}
          />
        </div>

        {(customerId || sellerId) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <PartyInfoCard title="Bên Mua (tự điền)" p={customer} extra={customer.assignedSale?.code ? <span className="text-gray-400 font-normal"> • Sale: {customer.assignedSale.code}</span> : null} />
            <PartyInfoCard title="Bên Bán (tự điền)" p={seller} extra={seller.shortName ? <span className="text-gray-400 font-normal"> • Viết tắt: {seller.shortName}</span> : null} />
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">STT (3 số) <span className="text-red-500">*</span></label>
            <input value={stt} onChange={e => setStt(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="VD: 001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ngày lập</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <Select label="Gắn HĐNT" value={hdntId} onChange={setHdntId}>
            <option value="">-- Không gắn --</option>
            {matchingHDNTs.map(h => <option key={h.contractId} value={h.contractId}>{h.contractId}</option>)}
          </Select>
          <Select label="Gắn ĐĐH" value={ddhId} onChange={selectDDH}>
            <option value="">-- Không gắn --</option>
            {matchingDDHs.map(d => <option key={d.contractId} value={d.contractId}>{d.contractId}</option>)}
          </Select>
        </div>

        {Object.keys(sellers).length === 0 && (
          <Alert type="warn">Chưa có công ty bên bán. <button onClick={() => setPage('settings')} className="underline font-medium">Thêm ngay →</button></Alert>
        )}
        {customerId && sellerId && ddhId && <Alert type="info">🔗 Đã gắn ĐĐH <strong>{ddhId}</strong> — hàng hóa tự động lấy từ ĐĐH này (có thể chỉnh sửa bên dưới).</Alert>}
        {customerId && sellerId && stt && (
          <ContractIdPreview
            id={contractId}
            onChange={setIdOverride}
            isAuto={idOverride === null}
            onReset={() => setIdOverride(null)}
          />
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">Bảng hàng hóa thực tế — tự lấy từ ĐĐH đã gắn, hoặc:</label>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
            <button onClick={() => fileRef.current.click()} disabled={aiLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60">
              {aiLoading ? '⏳ Đang đọc...' : '📷 Upload VAT thực tế (AI đọc)'}
            </button>
            <span className="text-xs text-gray-400">hoặc <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600">Ctrl/Cmd + V</kbd> dán ảnh hóa đơn</span>
            <span className="text-xs text-gray-400">hoặc bấm "+ Thêm dòng" để nhập tay bên dưới</span>
          </div>
          {aiError && <Alert type="error">{aiError}</Alert>}
          <GoodsTable goods={goods} onChange={setGoods} />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowPreview(p => !p)} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
          {showPreview ? '🙈 Ẩn xem trước' : '👁️ Xem trước biên bản'}
        </button>
        <button onClick={save} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm font-medium shadow">{isEdit ? '✓ Lưu thay đổi' : '✓ Lưu biên bản'}</button>
      </div>

      {showPreview && preview && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-8">
          <BBBGPreview c={preview} seller={seller} customer={customer} />
        </div>
      )}
    </div>
  );
};
