// src/lib/api.js
// Lớp lưu trữ key-value (get/set/del) trên Supabase + đọc hóa đơn VAT (qua Edge Function).
// Mỗi "key" (sellers, departments, seller_info)
// là 1 dòng trong bảng app_storage, cột value (jsonb) chứa nguyên object/map.
// Hợp đồng (contracts) và Khách hàng (customers) lưu riêng (1 dòng = 1 bản ghi, có RLS theo người tạo).
// API Key Anthropic KHÔNG lưu ở app_storage nữa (đã từng lộ cho mọi user) — nay là Secret
// của Edge Function "clever-handler" trên Supabase, chỉ admin project mới cấu hình được.
import { supabase } from './supabase';
const TABLE = 'app_storage';
export const api = {
  // ───────── Key-Value storage (Supabase) ─────────
  async get(key, _shared = false) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? data.value : null;
  },
  async set(key, value, _shared = false) {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (error) throw new Error(error.message);
    return value;
  },
  async del(key, _shared = false) {
    const { error } = await supabase.from(TABLE).delete().eq('key', key);
    if (error) throw new Error(error.message);
  },
  // ───────── AI đọc hóa đơn VAT (gọi qua Edge Function — API Key chỉ nằm ở server) ─────────
  async readVAT(imageBase64, mediaType) {
    return api._invokeReadInvoice(imageBase64, mediaType, 'vat');
  },

  // ───────── AI đọc danh sách hàng hóa định giá USD (gọi qua Edge Function) ─────────
  async readGoodsUSD(imageBase64, mediaType) {
    return api._invokeReadInvoice(imageBase64, mediaType, 'goods_usd');
  },

  async _invokeReadInvoice(imageBase64, mediaType, mode) {
    const { data, error } = await supabase.functions.invoke('clever-handler', {
      body: { imageBase64, mediaType, mode },
    });
    if (error) {
      // Thử đọc message lỗi cụ thể do Edge Function trả về (thay vì lỗi chung "non-2xx status code")
      let msg = error.message;
      try {
        const body = await error.context?.json();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      throw new Error(msg || 'Lỗi gọi AI đọc hóa đơn.');
    }
    if (data?.error) throw new Error(data.error);
    return data; // { goods: [...] }
  },

  // ───────── Hợp đồng (bảng contracts, RLS theo người tạo) ─────────
  async listContracts() {
    // Dùng RPC slim để bỏ vatInvoiceImage khỏi danh sách (ảnh base64 làm payload nặng → timeout).
    // Ảnh chỉ được load khi xem hợp đồng cụ thể (getContractFull).
    const { data, error } = await supabase.rpc('list_contracts_slim');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getContractFull(dbId) {
    // Load toàn bộ dữ liệu hợp đồng khi bấm Xem — ghép ngược vat_invoice_image (cột riêng) vào
    // data.vatInvoiceImage để phần hiển thị (ContractViewer, previews...) dùng y như cũ, không cần đổi.
    const { data: row, error } = await supabase.from('contracts').select('*').eq('id', dbId).single();
    if (error) throw new Error(error.message);
    if (row.vat_invoice_image) row.data = { ...row.data, vatInvoiceImage: row.vat_invoice_image };
    return row;
  },

  async upsertContract({ _dbId, category, docType, contract, maSale }) {
    // vatInvoiceImage (ảnh hóa đơn base64) tách ra cột riêng `vat_invoice_image`, KHÔNG nhúng trong jsonb `data` nữa —
    // vì cùng 1 cột jsonb nặng (do ảnh) khiến Postgres phải giải nén toàn bộ mỗi lần đọc dù chỉ cần vài field nhẹ,
    // làm list_contracts_slim chậm hẳn dù đã cố lọc bỏ field này khỏi kết quả trả về.
    const { vatInvoiceImage, ...restContract } = contract;
    const payload = {
      category, doc_type: docType,
      contract_id: contract.contractId,
      data: restContract,
      vat_invoice_image: vatInvoiceImage || null,
      updated_at: new Date().toISOString(),
    };
    if (_dbId) {
      const { data, error } = await supabase
        .from('contracts').update(payload).eq('id', _dbId).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    const { data: s } = await supabase.auth.getSession();
    payload.created_by = s.session?.user?.id;
    payload.ma_sale = maSale;
    const { data, error } = await supabase
      .from('contracts').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteContractRow(dbId) {
    const { error } = await supabase.from('contracts').delete().eq('id', dbId);
    if (error) throw new Error(error.message);
  },

  // Giao hợp đồng cho sale khác (chỉ admin) — chỉ cập nhật ma_sale, không đổi người tạo
  async assignContractSale(dbId, newMaSale) {
    const { data, error } = await supabase
      .from('contracts')
      .update({ ma_sale: newMaSale, updated_at: new Date().toISOString() })
      .eq('id', dbId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ───────── Khách hàng (bảng customers, RLS theo người tạo) ─────────
  async listCustomers() {
    // Supabase mặc định chỉ trả tối đa 1000 dòng/lần — phải tự phân trang để lấy đủ toàn bộ
    const PAGE = 1000;
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('customers').select('*').order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      all = all.concat(data || []);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  },

  async upsertCustomer({ _dbId, customerId, data, maSale }) {
    const payload = { customer_id: customerId, data, ma_sale: maSale, updated_at: new Date().toISOString() };
    if (_dbId) {
      const { data: row, error } = await supabase
        .from('customers').update(payload).eq('id', _dbId).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: s } = await supabase.auth.getSession();
    payload.created_by = s.session?.user?.id;
    const { data: row, error } = await supabase
      .from('customers').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  },

  async deleteCustomerRow(dbId) {
    const { error } = await supabase.from('customers').delete().eq('id', dbId);
    if (error) throw new Error(error.message);
  },

  // ───────── Hồ sơ người dùng ─────────
  async getMyProfile() {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateProfile(id, fields) {
    const { data, error } = await supabase
      .from('profiles').update(fields).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ───────── Quản lý tài khoản (chỉ admin) ─────────
  async adminListProfiles() {
    // Dùng direct query thay vì RPC để tự động lấy đủ các cột mới (approved, phone...)
    // kể cả khi cột được thêm sau khi RPC đã được tạo.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('approved', { ascending: true })
      .order('full_name', { ascending: true, nullsFirst: true });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async adminDeleteUser(userId) {
    // Xóa auth user (user record trong Supabase Auth) qua Edge Function hoặc trực tiếp profile
    // Vì client-side không thể xóa auth.users, ta xóa profile trước → user sẽ không đăng nhập được,
    // admin có thể vào Supabase dashboard để xóa auth user nếu cần hoàn toàn.
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw new Error(error.message);
  },

  // --- Invoice Goods: hàng hóa theo số hóa đơn (nhập từ Excel), dùng để tự điền khi tạo ĐĐH/BBBG ---
  async listInvoiceGoods() {
    // Supabase mặc định chỉ trả tối đa 1000 dòng/lần — phải tự phân trang để lấy đủ toàn bộ
    const PAGE = 1000;
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('invoice_goods').select('*').order('invoice_no')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      all = all.concat(data || []);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  },

  async upsertInvoiceGoodsBatch(rows) {
    const { data: s } = await supabase.auth.getSession();
    const payload = rows.map(r => ({ ...r, created_by: s.session?.user?.id, updated_at: new Date().toISOString() }));
    const { data, error } = await supabase
      .from('invoice_goods')
      .upsert(payload, { onConflict: 'group_key' })
      .select();
    if (error) throw new Error(error.message);
    return data || [];
  },

  async deleteInvoiceGoods(id) {
    const { error } = await supabase.from('invoice_goods').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteInvoiceGoodsMany(ids) {
    const { error } = await supabase.from('invoice_goods').delete().in('id', ids);
    if (error) throw new Error(error.message);
  },
};
