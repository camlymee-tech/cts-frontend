// File: src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { SellersPage } from './pages/SellersPage';
import { CustomersPage } from './pages/CustomersPage';
import { ApiKeyManager } from './pages/ApiKeyManager';
import { DepartmentsManager } from './pages/DepartmentsManager';
import { ContractListPage } from './pages/ContractListPage';
import { ContractViewer } from './pages/ContractViewer';
import { CreateHDNT } from './pages/CreateHDNT';
import { CreateDDH } from './pages/CreateDDH';
import { CreateBBBG } from './pages/CreateBBBG';
import { LoginPage } from './pages/LoginPage';

const DOC_TYPE_MAP = { HDNT: 'hd_nguyen_tac', DDH: 'don_dat_hang', BBBG: 'bbbg' };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [page, setPage] = useState('dashboard');
  const [sellers, setSellers] = useState({});
  const [departments, setDepartments] = useState({});
  const [customers, setCustomers] = useState({});
  const [contracts, setContracts] = useState({});
  const [viewContract, setViewContract] = useState(null);
  const [editContractData, setEditContractData] = useState(null);
  const [dataReady, setDataReady] = useState(false);
  const [profile, setProfile] = useState(null);

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
      const [sl, dp, c, rows, prof] = await Promise.all([
        api.get('sellers'),
        api.get('departments'),
        api.get('customers'),
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
      if (c) setCustomers(c);
      setProfile(prof);

      const contractsMap = {};
      rows.forEach(r => {
        contractsMap[r.contract_id] = { ...r.data, _dbId: r.id, _maSale: r.ma_sale, _createdBy: r.created_by };
      });
      setContracts(contractsMap);

      setDataReady(true);
    })();
  }, [session]);

  const handleLogout = () => supabase.auth.signOut();

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
    const updated = { ...customers, [id]: data };
    setCustomers(updated); await api.set('customers', updated);
  };
  const deleteCustomer = async (id) => {
    if (!confirm(`Xóa khách hàng ${id}? Thao tác không thể hoàn tác.`)) return;
    const updated = { ...customers }; delete updated[id];
    setCustomers(updated); await api.set('customers', updated);
  };

  // --- Contracts ---
  const saveContract = async (contract, oldId = null) => {
    const { _dbId, _maSale, _createdBy, ...cleanContract } = contract;
    const row = await api.upsertContract({
      _dbId,
      category: 'mua_ban',
      docType: DOC_TYPE_MAP[contract.type],
      contract: cleanContract,
      maSale: profile?.ma_sale,
    });
    const updated = { ...contracts };
    if (oldId && oldId !== contract.contractId) delete updated[oldId];
    updated[contract.contractId] = { ...cleanContract, _dbId: row.id, _maSale: row.ma_sale, _createdBy: row.created_by };
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
  const handleEditContract = (contract) => {
    setEditContractData(contract);
    setViewContract(null);
    setPage('edit-' + contract.type.toLowerCase());
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

  const counts = { HDNT: 0, DDH: 0, BBBG: 0 };
  Object.values(contracts).forEach(c => counts[c.type]++);
  const noSellers = Object.keys(sellers).length === 0;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
      case 'settings':  return (
        <div className="space-y-6">
          <SellersPage sellers={sellers} onSave={saveSeller} onDelete={deleteSeller} />
          <ApiKeyManager />
          <DepartmentsManager departments={departments} onSave={saveDepartment} onDelete={deleteDepartment} />
        </div>
      );
      case 'customers':    return <CustomersPage customers={customers} departments={departments} onSave={saveCustomer} onDelete={deleteCustomer} />;
      case 'hdnt':         return <ContractListPage type="HDNT" contracts={contracts} customers={customers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onEdit={handleEditContract} />;
      case 'ddh':          return <ContractListPage type="DDH"  contracts={contracts} customers={customers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onEdit={handleEditContract} />;
      case 'bbbg':         return <ContractListPage type="BBBG" contracts={contracts} customers={customers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onEdit={handleEditContract} />;
      case 'create-hdnt':  return <CreateHDNT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-ddh':   return <CreateDDH  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-bbbg':  return <CreateBBBG sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'edit-hdnt':    return <CreateHDNT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-ddh':     return <CreateDDH  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-bbbg':    return <CreateBBBG sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      default:             return <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
    }
  };

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <Sidebar page={page} setPage={setPage} counts={counts} onLogout={handleLogout} />
      <main className="flex-1 p-6 overflow-auto bg-gray-50" style={{ minHeight: '100vh' }}>
        {noSellers && page !== 'settings' && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
            <span>⚠️ Chưa có công ty bên bán nào. Vui lòng thêm ít nhất 1 công ty trước khi tạo hợp đồng.</span>
            <button onClick={() => setPage('settings')} className="ml-4 underline font-medium hover:text-amber-900">Thêm ngay →</button>
          </div>
        )}
        {renderPage()}
      </main>
      {viewContract && (
        <ContractViewer
          contract={viewContract}
          seller={sellers[viewContract.sellerId] || {}}
          customers={customers}
          onClose={() => setViewContract(null)}
          onDelete={deleteContract}
          onEdit={handleEditContract}
        />
      )}
    </div>
  );
}
