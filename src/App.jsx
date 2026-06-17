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
import { CreateHDNTVC } from './pages/CreateHDNTVC';
import { CreateDDHVC } from './pages/CreateDDHVC';
import { CreateBBBGVC } from './pages/CreateBBBGVC';
import { CreateHDNTUT } from './pages/CreateHDNTUT';
import { CreateDDHUT } from './pages/CreateDDHUT';
import { CreateBBBGUT } from './pages/CreateBBBGUT';
import { LoginPage } from './pages/LoginPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ChooseDepartmentPage } from './pages/ChooseDepartmentPage';

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
    const { _dbId, _maSale, _createdBy, ...cleanData } = data;
    const row = await api.upsertCustomer({
      _dbId,
      customerId: id,
      data: cleanData,
      maSale: profile?.ma_sale,
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

  // --- Contracts ---
  const saveContract = async (contract, oldId = null) => {
    const { _dbId, _maSale, _createdBy, ...cleanContract } = contract;
    const row = await api.upsertContract({
      _dbId,
      category: CATEGORY_MAP[contract.type] || 'mua_ban',
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
  if (profile && profile.role !== 'admin' && !profile.department_id) {
    return <ChooseDepartmentPage profile={profile} departments={departments} onDone={(updated) => setProfile(updated)} />;
  }

  const counts = { HDNT: 0, DDH: 0, BBBG: 0, HDNT_VC: 0, DDH_VC: 0, BBBG_VC: 0, HDNT_UT: 0, DDH_UT: 0, BBBG_UT: 0 };
  Object.values(contracts).forEach(c => { if (counts[c.type] !== undefined) counts[c.type]++; });
  const noSellers = Object.keys(sellers).length === 0;
  const isAdmin = profile?.role === 'admin';

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
      case 'customers':    return <CustomersPage customers={customers} departments={departments} onSave={saveCustomer} onDelete={deleteCustomer} />;
      case 'hdnt':         return <ContractListPage type="HDNT" contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'ddh':          return <ContractListPage type="DDH"  contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'bbbg':         return <ContractListPage type="BBBG" contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'hdnt_vc':      return <ContractListPage type="HDNT_VC" contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'ddh_vc':       return <ContractListPage type="DDH_VC"  contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'bbbg_vc':      return <ContractListPage type="BBBG_VC" contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'hdnt_ut':      return <ContractListPage type="HDNT_UT" contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'ddh_ut':       return <ContractListPage type="DDH_UT"  contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'bbbg_ut':      return <ContractListPage type="BBBG_UT" contracts={contracts} customers={customers} sellers={sellers} setPage={setPage} setViewContract={setViewContract} onDelete={deleteContract} onDeleteMany={deleteContracts} onEdit={handleEditContract} />;
      case 'create-hdnt':  return <CreateHDNT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-ddh':   return <CreateDDH  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-bbbg':  return <CreateBBBG sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-hdnt_vc': return <CreateHDNTVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-ddh_vc':  return <CreateDDHVC  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-bbbg_vc': return <CreateBBBGVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-hdnt_ut': return <CreateHDNTUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-ddh_ut':  return <CreateDDHUT  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'create-bbbg_ut': return <CreateBBBGUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} />;
      case 'edit-hdnt':    return <CreateHDNT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-ddh':     return <CreateDDH  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-bbbg':    return <CreateBBBG sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-hdnt_vc': return <CreateHDNTVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-ddh_vc':  return <CreateDDHVC  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-bbbg_vc': return <CreateBBBGVC sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-hdnt_ut': return <CreateHDNTUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-ddh_ut':  return <CreateDDHUT  sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'edit-bbbg_ut': return <CreateBBBGUT sellers={sellers} customers={customers} contracts={contracts} onSave={saveContract} setPage={setPage} editData={editContractData} />;
      case 'admin-users':  return isAdmin ? <AdminUsersPage /> : <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
      default:             return <Dashboard customers={customers} contracts={contracts} setPage={setPage} />;
    }
  };

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <Sidebar page={page} setPage={setPage} counts={counts} onLogout={handleLogout} isAdmin={isAdmin} />
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
          onClose={() => setViewContract(null)}
          onDelete={deleteContract}
          onEdit={handleEditContract}
        />
      )}
    </div>
  );
}
