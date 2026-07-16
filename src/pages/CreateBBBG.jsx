// File: src/pages/CreateBBBG.jsx
import { useState, useEffect, useRef } from 'react';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { SaleSearchDropdown } from '../components/SaleSearchDropdown';
import { Alert } from '../components/Alert';
import { PartyInfoCard } from '../components/PartyInfoCard';
import { ContractIdPreview } from '../components/ContractIdPreview';
import { GoodsTable } from '../components/GoodsTable';
import { InvoiceGoodsPicker } from '../components/InvoiceGoodsPicker';
import { normalizeText } from '../utils/customerExcel';
import { BBBGPreview } from '../previews/BBBGPreview';
import { buildContractId } from '../helpers';
import { api } from '../lib/api';
import { pdfFirstPageToImage } from '../lib/pdfToImage';

export const CreateBBBG = ({ sellers, customers, contracts, onSave, setPage, editData, isAdmin = false, saleProfiles = [], invoiceGoods = [] }) => {
  const isEdit = !!editData;
  const [assignedSaleUuid, setAssignedSaleUuid] = useState(editData?._assignedTo || '');
  const [sellerId, setSellerId] = useState(editData?.sellerId || '');
  const [customerId, setCustomerId] = useState(editData?.customerId || '');
  const [stt, setStt] = useState(editData?.stt || '');
  const [date, setDate] = useState(editData?.date || new Date().toISOString().slice(0, 10));
  const [goods, setGoods] = useState(editData?.goods || []);
  const [vatInvoiceImage, setVatInvoiceImage] = useState(editData?.vatInvoiceImage || null); // { data, mediaType } | null
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
    if (!isEdit) setVatInvoiceImage(d?.vatInvoiceImage || null);
  }, [customerId, sellerId]);

  const selectDDH = (id) => {
    setDdhId(id);
    const d = contracts[id];
    setGoods(d?.goods?.length ? d.goods : []);
    setVatInvoiceImage(d?.vatInvoiceImage || null);
  };

  const fileRef2 = useRef();
  // Đính kèm/đổi hóa đơn VAT riêng (không qua AI) — dùng khi không có ĐĐH gắn sẵn, hoặc muốn đổi ảnh khác
  const handleAttachOnly = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.type === 'application/pdf') {
        const img = await pdfFirstPageToImage(file);
        setVatInvoiceImage({ data: img.base64, mediaType: img.mediaType });
      } else {
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = ev => res(ev.target.result.split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        setVatInvoiceImage({ data: base64, mediaType: file.type });
      }
    } catch (err) {
      alert('Không đọc được file này để đính kèm: ' + err.message);
    }
    e.target.value = '';
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
      // Tự đính kèm hóa đơn VAT thực tế vừa upload (ưu tiên hơn hóa đơn lấy từ ĐĐH, vì là bản quyết toán cuối).
      try {
        if (file.type === 'application/pdf') {
          const img = await pdfFirstPageToImage(file);
          setVatInvoiceImage({ data: img.base64, mediaType: img.mediaType });
        } else {
          setVatInvoiceImage({ data: base64, mediaType: file.type });
        }
      } catch (attachErr) {
        console.error('Không đính kèm được hóa đơn:', attachErr);
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Chọn nhanh từ hóa đơn đã nhập Excel sẵn — tự điền hàng hóa + Khách hàng + Bên bán (không đổi ảnh đính kèm)
  const applyInvoiceGoods = (inv) => {
    setGoods(inv.goods || []);

    if (inv.customer_code && customers[inv.customer_code]) {
      setCustomerId(inv.customer_code);
    } else if (inv.customer_name) {
      const target = normalizeText(inv.customer_name);
      const found = Object.entries(customers).find(([, c]) => normalizeText(c.companyName) === target);
      if (found) setCustomerId(found[0]);
    }

    if (inv.seller_tax_code) {
      const targetTax = inv.seller_tax_code.replace(/\D/g, '');
      const found = Object.entries(sellers).find(([, s]) => (s.taxCode || '').replace(/\D/g, '') === targetTax && targetTax);
      if (found) { setSellerId(found[0]); return; }
    }
    if (inv.seller_name) {
      const target = normalizeText(inv.seller_name);
      const found = Object.entries(sellers).find(([, s]) => normalizeText(s.companyName) === target);
      if (found) setSellerId(found[0]);
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
    vatInvoiceImage,
    relatedContracts: { hdnt: hdntId, ddh: ddhId }
  } : null;

  const save = async () => {
    if (!sellerId) return alert('Vui lòng chọn công ty bên bán');
    if (!customerId) return alert('Vui lòng chọn khách hàng');
    if (!stt.trim()) return alert('Vui lòng nhập STT (số thứ tự)');
    if (!contractId.trim()) return alert('Số hợp đồng không được để trống');
    if (!isEdit && contracts[contractId]) return alert('Số hợp đồng đã tồn tại:\n' + contractId);
    if (isEdit && contracts[contractId] && contractId !== editData.contractId) return alert('Số hợp đồng mới đã tồn tại:\n' + contractId);
    await onSave(getContract(), isEdit ? editData.contractId : null, assignedSaleUuid || null);
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

        {isAdmin && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">👤 Sale phụ trách <span className="text-gray-400">(admin gán)</span></label>
            <SaleSearchDropdown saleProfiles={saleProfiles} value={assignedSaleUuid} onChange={setAssignedSaleUuid} placeholder="Giao cho sale..." />
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
          {invoiceGoods.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">hoặc chọn từ hóa đơn đã nhập Excel sẵn</div>
              <InvoiceGoodsPicker invoiceGoods={invoiceGoods} onApply={applyInvoiceGoods} />
            </div>
          )}
          <GoodsTable goods={goods} onChange={setGoods} />
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">🧾 Hóa đơn VAT đính kèm (in cùng biên bản này)</label>
          {vatInvoiceImage ? (
            <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
              <img src={`data:${vatInvoiceImage.mediaType};base64,${vatInvoiceImage.data}`} alt="Hóa đơn VAT" className="h-16 w-16 object-cover rounded border border-gray-300" />
              <div className="flex-1 text-sm text-gray-600">Đã có hóa đơn đính kèm (tự lấy từ ĐĐH đã gắn, hoặc đính kèm riêng) — sẽ in/xuất file kèm theo biên bản này.</div>
              <button onClick={() => fileRef2.current.click()} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Đổi ảnh khác</button>
              <button onClick={() => setVatInvoiceImage(null)} className="text-red-500 hover:text-red-700 text-sm font-medium">✕ Gỡ</button>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">
              Chưa có hóa đơn đính kèm (ĐĐH đã gắn chưa có hóa đơn, hoặc chưa gắn ĐĐH nào). Bạn có thể <button onClick={() => fileRef2.current.click()} className="text-blue-600 hover:underline font-medium">đính kèm ảnh hóa đơn</button> riêng để in cùng.
            </div>
          )}
          <input ref={fileRef2} type="file" accept="image/*,application/pdf" onChange={handleAttachOnly} className="hidden" />
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
