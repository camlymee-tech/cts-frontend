// File: src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { SellersPage } from './pages/SellersPage';
import { CustomersPage } from './pages/CustomersPage';
import { InvoiceGoodsPage } from './pages/InvoiceGoodsPage';
import { CashFlowSummary } from './pages/CashFlowSummary';
import { PaymentRequestPrint } from './pages/PaymentRequestPrint';
import { ApiKeyManager } from './pages/ApiKeyManager';
import { DepartmentsManager } from './pages/DepartmentsManager';
import { ContractListPage } from './pages/ContractListPage';
import { ContractViewer } from './pages/ContractViewer';
import { CreateHDNT } from './pages/CreateHDNT';
import { CreateDDH } from './pages/CreateDDH';
import { CreateBBBG } from './pages/CreateBBBG';
import { CreateHDNTVC } from './pages/CreateHDNTVC';
import { CreateDDHVC } from './pages/CreateDDHVC';
import { CreateBBBGVC } from './pages/CreateBBBGVC';
import { CreateHDNTUT } from './pages/CreateHDNTUT';
import { CreateDDHUT } from './pages/CreateDDHUT';
import { CreateBBBGUT } from './pages/CreateBBBGUT';
import { LoginPage } from './pages/LoginPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ChooseDepartmentPage } from './pages/ChooseDepartmentPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';

const DOC_TYPE_MAP = {
  HDNT: 'hd_nguyen_tac', DDH: 'don_dat_hang', BBBG: 'bbbg',
  HDNT_VC: 'hd_nguyen_tac_vc', DDH_VC: 'don_dat_dich_vu', BBBG_VC: 'bbbg_vc',
  HDNT_UT: 'hd_nguyen_tac_ut', DDH_UT: 'don_dat_dich_vu_ut', BBBG_UT: 'bbbg_ut',
};
const CATEGORY_MAP = {
  HDNT: 'mua_ban', DDH: 'mua_ban', BBBG: 'mua_ban',
  HDNT_VC: 'van_chuyen', DDH_VC: 'van_chuyen', BBBG_VC: 'van_chuyen',
  HDNT_UT: 'uy_thac', DDH_UT: 'uy_thac', BBBG_UT: 'uy_thac',
};
// Khi sửa mã hợp đồng (contractId) của HDNT/DDH (và các biến thể VC/UT), cần dò các hợp đồng
// con đang tham chiếu tới mã CŨ trong relatedContracts để cập nhật theo mã MỚI luôn.
// Key bên phải là tên field trong relatedContracts mà hợp đồng con dùng để trỏ tới loại này.
const REFERENCED_AS = {
  HDNT: 'hdnt', HDNT_VC: 'hdnt_vc', HDNT_UT: 'hdnt_ut',
  DDH: 'ddh', DDH_VC: 'ddh_vc', DDH_UT: 'ddh_ut',
};

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [page, setPage] = useState('dashboard');
  const [sellers, setSellers] = useState({});
  const [departments, setDepartments] = useState({});
  const [customers, setCustomers] = useState({});
  const [contracts, setContracts] = useState({});
  const [viewContract, setViewContract] = useState(null);
  const [editContractData, setEditContractData] = useState(null);
  const [paymentRequestCustomerId, setPaymentRequestCustomerId] = useState('');
  const [paymentRequestReqNo, setPaymentRequestReqNo] = useState(null);
  const [dataReady, setDataReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [saleMap, setSaleMap] = useState({}); // { [uuid|ma_sale]: { name, deptName } } — dùng để hiện tên sale + phòng ban ở danh sách HĐ
  const [saleProfiles, setSaleProfiles] = useState([]); // [{ uuid, name, ma_sale, deptName }] — dùng cho dropdown giao sale
  const [cashFlowBatches, setCashFlowBatches] = useState([]);
  const [cashFlowLoaded, setCashFlowLoaded] = useState(false);

  // Supabase auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Load data once logged in
  useEffect(() => {
    if (!session) return;
    (async () => {
      const [sl, dp, custRows, contractRows, prof] = await Promise.all([
        api.get('sellers'),
        api.get('departments'),
        api.listCustomers(),
        api.listContracts(),
        api.getMyProfile(),
      ]);
      if (dp) setDepartments(dp);
      let sellersData = sl || {};
      // Migrate old single-seller format
      if (!sl) {
        const legacy = await api.get('seller_info');
        if (legacy?.companyName) {
          sellersData = { SELLER001: { sellerId: 'SELLER001', ...legacy } };
          await api.set('sellers', sellersData);
        }
      }
      setSellers(sellersData);
      setProfile(prof);

      const customersMap = {};
      custRows.forEach(r => {
        customersMap[r.customer_id] = { ...r.data, _dbId: r.id, _maSale: r.ma_sale, _createdBy: r.created_by };
      });
      setCustomers(customersMap);

      const contractsMap = {};
      contractRows.forEach(r => {
        contractsMap[r.contract_id] = { ...r.data, _dbId: r.id, _maSale: r.ma_sale, _createdBy: r.created_by };
      });
      setContracts(contractsMap);

      // Build saleMap + saleProfiles để hiện tên + phòng ban và dropdown giao sale (admin dùng)
      if (prof?.role === 'admin') {
        try {
          const allProfiles = await api.adminListProfiles();
          const map = {};
          const list = [];
          allProfiles.forEach(p => {
            const info = {
              name: p.full_name || p.email || p.ma_sale || p.id,
              deptName: dp?.[p.department_id]?.name || '',
            };
            map[p.id] = info;           // tra theo uuid (luôn có)
            if (p.ma_sale) map[p.ma_sale] = info; // tra theo mã sale (nếu có)
            list.push({ uuid: p.id, name: info.name, ma_sale: p.ma_sale || '', deptName: info.deptName });
          });
          setSaleMap(map);
          setSaleProfiles(list);
        } catch { /* bỏ qua nếu lỗi */ }
      }

      setDataReady(true);
    })();
  }, [session]);

  const handleLogout = () => supabase.auth.signOut();

  // Chỉ tải "Theo dõi dòng tiền" khi thực sự cần (vào trang đó) — dữ liệu này riêng biệt,
  // không cần tải ngay lúc mở app.
  const CASH_FLOW_PAGES = ['cash_flow', 'payment_request'];
  useEffect(() => {
    if (!session || cashFlowLoaded || !CASH_FLOW_PAGES.includes(page)) return;
    (async () => {
      try {
        const rows = await api.listCashFlowBatches();
        setCashFlowBatches(rows || []);
        setCashFlowLoaded(true);
      } catch (e) {
        console.error('Không tải được dữ liệu dòng tiền:', e.message);
      }
    })();
  }, [session, page, cashFlowLoaded]);

  const saveCashFlowBatch = async (id, fields) => {
    const row = await api.upsertCashFlowBatch(id, fields);
    setCashFlowBatches(prev => {
      const exists = prev.some(r => r.id === row.id);
      return exists ? prev.map(r => (r.id === row.id ? row : r)) : [row, ...prev];
    });
    return row;
  };

  const deleteCashFlowBatchRow = async (id) => {
    if (!confirm('Xóa lô hàng này khỏi bảng theo dõi dòng tiền? Thao tác không thể hoàn tác.')) return;
    await api.deleteCashFlowBatch(id);
    setCashFlowBatches(prev => prev.filter(r => r.id !== id));
  };

  // --- Invoice Goods (hàng hóa theo số hóa đơn, nhập từ Excel để chọn nhanh khi tạo ĐĐH/BBBG) ---
  // Không còn giữ mảng đầy đủ trong state App nữa (đã lên hàng chục nghìn dòng) — InvoiceGoodsPage
  // tự quản lý dữ liệu của nó qua RPC phân trang, InvoiceGoodsPicker tự tìm kiếm qua RPC riêng.
  const bulkImportInvoiceGoods = async (invoices, onProgress) => {
    let success = 0, failed = 0;
    const errors = [];
    const BATCH_SIZE = 300; // chia nhỏ để tránh timeout/quá tải khi file lớn (hàng nghìn hóa đơn)

    for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
      const chunk = invoices.slice(i, i + BATCH_SIZE);
      const rows = chunk.map(inv => ({
        invoice_no: inv.invoiceNo,
        group_key: inv.groupKey,
        invoice_date: inv.invoiceDate || null,
        customer_code: inv.customerCode || null,
        customer_name: inv.customerName || null,
        seller_name: inv.sellerName || null,
        seller_tax_code: inv.sellerTaxCode || null,
        ...(inv.note ? { note: inv.note } : {}),
        goods: inv.goods,
        total: inv.total || 0,
      }));
      try {
        const saved = await api.upsertInvoiceGoodsBatch(rows);
        success += saved.length;
      } catch (e) {
        failed += chunk.length;
        errors.push(`Đợt ${Math.floor(i / BATCH_SIZE) + 1}: ${e.message}`);
      }
      onProgress?.(Math.min(i + BATCH_SIZE, invoices.length), invoices.length);
    }

    return { success, failed, errors };
  };

  const deleteInvoiceGoodsRow = async (id) => {
    if (!confirm('Xóa hóa đơn này khỏi danh sách hàng hóa?')) return false;
    await api.deleteInvoiceGoods(id);
    return true;
  };

  const bulkDeleteInvoiceGoods = async (ids) => {
    if (!confirm(`Xóa ${ids.length} hóa đơn đã chọn khỏi danh sách hàng hóa? Thao tác không thể hoàn tác.`)) return false;
    await api.deleteInvoiceGoodsMany(ids);
    return true;
  };

  // --- Sellers ---
  const saveSeller = async (id, data) => {
    const updated = { ...sellers, [id]: data };
    setSellers(updated); await api.set('sellers', updated);
  };
  const deleteSeller = async (id) => {
    if (!confirm(`Xóa công ty bên bán ${id}? Thao tác không thể hoàn tác.`)) return;
    const updated = { ...sellers }; delete updated[id];
    setSellers(updated); await api.set('sellers', updated);
  };

  // --- Departments ---
  const saveDepartment = async (id, data) => {
    const updated = { ...departments, [id]: data };
    setDepartments(updated); await api.set('departments', updated);
  };
  const deleteDepartment = async (id) => {
    if (!confirm(`Xóa phòng ban ${departments[id]?.name || id}?`)) return;
    const updated = { ...departments }; delete updated[id];
    setDepartments(updated); await api.set('departments', updated);
  };

  // --- Customers ---
  const saveCustomer = async (id, data) => {
    const { _dbId, _maSale, _createdBy, ...cleanData } = data;
    // Ưu tiên mã Sale được gán trong form (ô "Mã Sale"); nếu để trống thì mặc định là người đang thao tác
    const maSale = cleanData.assignedSale?.code?.trim() || profile?.ma_sale;
    const row = await api.upsertCustomer({
      _dbId,
      customerId: id,
      data: cleanData,
      maSale,
    });
    const updated = { ...customers, [id]: { ...cleanData, _dbId: row.id, _maSale: row.ma_sale, _createdBy: row.created_by } };
    setCustomers(updated);
  };
  const deleteCustomer = async (id) => {
    if (!confirm(`Xóa khách hàng ${id}? Thao tác không thể hoàn tác.`)) return;
    const target = customers[id];
    if (target?._dbId) await api.deleteCustomerRow(target._dbId);
    const updated = { ...customers }; delete updated[id];
    setCustomers(updated);
  };

  // Nhập hàng loạt khách hàng từ file Excel
  const bulkImportCustomers = async (rows) => {
    let success = 0, failed = 0;
    const errors = [];
    const updated = { ...customers };
    for (const { customerId, data } of rows) {
      try {
        const existing = updated[customerId];
        const maSale = data.assignedSale?.code?.trim() || profile?.ma_sale;
        const row = await api.upsertCustomer({
          _dbId: existing?._dbId,
          customerId,
          data,
          maSale,
        });
        updated[customerId] = { ...data, _dbId: row.id, _maSale: row.ma_sale, _createdBy: row.created_by };
        success++;
      } catch (e) {
        failed++;
        errors.push(`${customerId}: ${e.message}`);
      }
    }
    setCustomers(updated);
    return { success, failed, errors };
  };

  // --- Contracts ---
  const saveContract = async (contract, oldId = null, assignedSaleUuid = null) => {
    const { _dbId, _maSale, _createdBy, ...cleanContract } = contract;
    // Admin gán cho sale cụ thể → dùng UUID đó; không thì dùng mã sale của người đang đăng nhập
    const maSale = assignedSaleUuid || profile?.ma_sale;
    const row = await api.upsertContract({
      _dbId,
      category: CATEGORY_MAP[contract.type] || 'mua_ban',
      docType: DOC_TYPE_MAP[contract.type],
      contract: cleanContract,
      maSale,
    });
    const updated = { ...contracts };
    if (oldId && oldId !== contract.contractId) delete updated[oldId];
    updated[contract.contractId] = { ...cleanContract, _dbId: row.id, _maSale: row.ma_sale, _createdBy: row.created_by };

    // Mã hợp đồng bị đổi (VD: sửa lại số HĐNT) → tự cập nhật các hợp đồng con đang tham chiếu
    // tới mã CŨ (ĐĐH/BBBG có relatedContracts.hdnt/ddh/...) sang mã MỚI, tránh lệch thông tin.
    const refKey = REFERENCED_AS[contract.type];
    if (oldId && oldId !== contract.contractId && refKey) {
      for (const childId of Object.keys(updated)) {
        const child = updated[childId];
        if (child.relatedContracts?.[refKey] === oldId) {
          const newChild = { ...child, relatedContracts: { ...child.relatedContracts, [refKey]: contract.contractId } };
          updated[childId] = newChild;
          const { _dbId: cDbId, _maSale: cMaSale, _createdBy: cCreatedBy, ...cleanChild } = newChild;
          await api.upsertContract({
            _dbId: cDbId,
            category: CATEGORY_MAP[newChild.type] || 'mua_ban',
            docType: DOC_TYPE_MAP[newChild.type],
            contract: cleanChild,
            maSale: profile?.ma_sale,
          });
        }
      }
    }

    setContracts(updated);
  };
  const deleteContract = async (id) => {
    if (!confirm(`Bạn có chắc muốn xóa hợp đồng ${id}? Hành động này không thể hoàn tác.`)) return;
    const target = contracts[id];
    if (target?._dbId) await api.deleteContractRow(target._dbId);
    const updated = { ...contracts }; delete updated[id];
    setContracts(updated);
    setViewContract(null);
  };
  const deleteContracts = async (ids) => {
    if (!ids || ids.length === 0) return false;
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} hợp đồng đã chọn? Hành động này không thể hoàn tác.`)) return false;
    const updated = { ...contracts };
    let successCount = 0;
    try {
      for (const id of ids) {
        const target = contracts[id];
        if (target?._dbId) await api.deleteContractRow(target._dbId);
        delete updated[id];
        successCount++;
      }
    } catch (err) {
      alert(`Đã xóa được ${successCount}/${ids.length} hợp đồng, sau đó gặp lỗi: ${err.message}`);
    } finally {
      setContracts(updated);
      setViewContract(null);
    }
    return true;
  };
  const handleEditContract = (contract) => {
    setEditContractData(contract);
    setViewContract(null);
    setPage('edit-' + contract.type.toLowerCase());
  };

  // Load full contract (kể cả vatInvoiceImage) khi bấm Xem — danh sách chỉ load bản nhẹ
  const handleViewContract = async (contract) => {
    if (contract._dbId) {
      try {
        const full = await api.getContractFull(contract._dbId);
        setViewContract({ ...full.data, _dbId: full.id, _maSale: full.ma_sale, _createdBy: full.created_by });
      } catch {
        setViewContract(contract); // fallback nếu lỗi
      }
    } else {
      setViewContract(contract);
    }
  };

  // Admin giao hợp đồng cho sale khác — chỉ cập nhật ma_sale, giữ nguyên người tạo
  const assignContract = async (contractId, newMaSale) => {
    const target = contracts[contractId];
    if (!target?._dbId) return;
    await api.assignContractSale(target._dbId, newMaSale);
    const updated = {
      ...contracts,
      [contractId]: { ...target, _maSale: newMaSale },
    };
    setContracts(updated);
    // Cập nhật viewContract nếu đang xem hợp đồng này
    if (viewContract?.contractId === contractId) {
      setViewContract({ ...viewContract, _maSale: newMaSale });
    }
  };

  // --- Loading / Auth states ---
  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <div className="text-center"><div className="text-4xl mb-3">📋</div><div>Đang tải...</div></div>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  if (!dataReady) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <div className="text-center"><div className="text-4xl mb-3">📋</div><div>Đang tải dữ liệu...</div></div>
      </div>
    );
  }

  // Sale chưa chọn phòng ban → yêu cầu chọn trước khi vào app
  // Chưa điền đủ thông tin (tên + phòng ban + mã sale) → yêu cầu tự điền trước khi vào app
  const isAdmin = profile?.role === 'admin';
  if (profile && profile.role !== 'admin' && (!profile.full_name || !profile.department_id || !profile.ma_sale)) {
    return <CompleteProfilePage profile={profile} departments={departments} isAdmin={isAdmin}
      onDone={(updated) => setProfile(updated)} />;
  }

  const counts = { HDNT: 0, DDH: 0, BBBG: 0, HDNT_VC: 0, DDH_VC: 0, BBBG_VC: 0, HDNT_UT: 0, DDH_UT: 0, BBBG_UT: 0 };
  Object.values(contracts).forEach(c => { if (counts[c.type] !== undefined) counts[c.type]++; });
  const noSellers = Object.keys(sellers).length === 0;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
      case 'settings':  return isAdmin ? (
        <div className="space-y-6">
          <SellersPage sellers={sellers} onSave={saveSeller} onDelete={deleteSeller} />
          <ApiKeyManager />
          <DepartmentsManager departments={departments} onSave={saveDepartment} onDelete={deleteDepartment} />
        </div>
      ) : <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
      case 'customers':    return <CustomersPage customers={customers} departments={departments} onSave={saveCustomer} onDelete={deleteCustomer} onBulkImport={bulkImportCustomers} saleProfiles={saleProfiles} isAdmin={isAdmin} profile={profile} />;
      case 'invoice_goods': return <InvoiceGoodsPage onBulkImport={bulkImportInvoiceGoods} onDelete={deleteInvoiceGoodsRow} onDeleteMany={bulkDeleteInvoiceGoods} isAdmin={isAdmin} />;
      case 'cash_flow': return <CashFlowSummary batches={cashFlowBatches} customers={customers} sellers={sellers} isAdmin={isAdmin} onSave={saveCashFlowBatch} onDelete={deleteCashFlowBatchRow}
          onOpenPaymentRequest={(customerId, reqNo) => { setPaymentRequestCustomerId(customerId); setPaymentRequestReqNo(reqNo ?? null); setPage('payment_request'); }} />;
      case 'payment_request': return <PaymentRequestPrint
          customerId={paymentRequestCustomerId} customer={customers[paymentRequestCustomerId]}
          requestNo={paymentRequestReqNo}
          batches={cashFlowBatches} customers={customers} sellers={sellers}
          onSave={saveCashFlowBatch} onDelete={deleteCashFlowBatchRow} onSelectCustomer={setPaymentRequestCustomerId}
          onClose={() => setPage('cash_flow')} />;
      case 'hdnt':         return <ContractListPage type="HDNT" contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'ddh':          return <ContractListPage type="DDH"  contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'bbbg':         return <ContractListPage type="BBBG" contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'hdnt_vc':      return <ContractListPage type="HDNT_VC" contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'ddh_vc':       return <ContractListPage type="DDH_VC"  contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'bbbg_vc':      return <ContractListPage type="BBBG_VC" contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'hdnt_ut':      return <ContractListPage type="HDNT_UT" contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'ddh_ut':       return <ContractListPage type="DDH_UT"  contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'bbbg_ut':      return <ContractListPage type="BBBG_UT" contracts={contracts} customers={customers} sellers={sellers} saleMap={saleMap} saleProfiles={saleProfiles} onAssign={assignContract} setPage={setPage} setViewContract={handleViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'create-hdnt':  return <CreateHDNT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} profile={profile} saleProfiles={saleProfiles} />;
      case 'create-ddh':   return <CreateDDH  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} profile={profile} saleProfiles={saleProfiles} onCreateCustomer={saveCustomer} onUpdateSeller={saveSeller} />;
      case 'create-bbbg':  return <CreateBBBG sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} profile={profile} saleProfiles={saleProfiles} onCreateCustomer={saveCustomer} onUpdateSeller={saveSeller} />;
      case 'create-hdnt_vc': return <CreateHDNTVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} />;
      case 'create-ddh_vc':  return <CreateDDHVC  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} />;
      case 'create-bbbg_vc': return <CreateBBBGVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} />;
      case 'create-hdnt_ut': return <CreateHDNTUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} />;
      case 'create-ddh_ut':  return <CreateDDHUT  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} />;
      case 'create-bbbg_ut': return <CreateBBBGUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} />;
      case 'edit-hdnt':    return <CreateHDNT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} profile={profile} saleProfiles={saleProfiles} editData={editContractData} />;
      case 'edit-ddh':     return <CreateDDH  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} profile={profile} saleProfiles={saleProfiles} onCreateCustomer={saveCustomer} onUpdateSeller={saveSeller} editData={editContractData} />;
      case 'edit-bbbg':    return <CreateBBBG sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} profile={profile} saleProfiles={saleProfiles} onCreateCustomer={saveCustomer} onUpdateSeller={saveSeller} editData={editContractData} />;
      case 'edit-hdnt_vc': return <CreateHDNTVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} editData={editContractData} />;
      case 'edit-ddh_vc':  return <CreateDDHVC  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} editData={editContractData} />;
      case 'edit-bbbg_vc': return <CreateBBBGVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} editData={editContractData} />;
      case 'edit-hdnt_ut': return <CreateHDNTUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} editData={editContractData} />;
      case 'edit-ddh_ut':  return <CreateDDHUT  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} editData={editContractData} />;
      case 'edit-bbbg_ut': return <CreateBBBGUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} isAdmin={isAdmin} saleProfiles={saleProfiles} editData={editContractData} />;
      case 'my-profile': return <CompleteProfilePage profile={profile} departments={departments} isAdmin={isAdmin}
          onDone={(updated) => setProfile(updated)} isEdit={true} />;
      case 'admin-users':  return isAdmin ? <AdminUsersPage departments={departments} /> : <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
      default:             return <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
    }
  };

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <Sidebar page={page} setPage={(p) => { if (p === 'payment_request') { setPaymentRequestCustomerId(''); setPaymentRequestReqNo(null); } setPage(p); }} counts={counts} onLogout={handleLogout} isAdmin={isAdmin} />
      <main className="flex-1 p-6 overflow-auto bg-gray-50" style={{ minHeight: '100vh' }}>
        {noSellers && page !== 'settings' && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
            <span>⚠️ Chưa có công ty bên bán nào. Vui lòng thêm ít nhất 1 công ty trước khi tạo hợp đồng.</span>
            {isAdmin && <button onClick={() => setPage('settings')} className="ml-4 underline font-medium hover:text-amber-900">Thêm ngay →</button>}
          </div>
        )}
        {renderPage()}
      </main>
      {viewContract && (
        <ContractViewer
          contract={viewContract}
          sellers={sellers}
          customers={customers}
          saleMap={saleMap}
          saleProfiles={saleProfiles}
          isAdmin={isAdmin}
          onAssign={assignContract}
          onClose={() => setViewContract(null)}
          onDelete={deleteContract}
          onEdit={handleEditContract}
        />
      )}
    </div>
  );
}
