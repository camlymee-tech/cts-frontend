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
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async upsertContract({ _dbId, category, docType, contract, maSale }) {
    const payload = {
      category, doc_type: docType,
      contract_id: contract.contractId,
      data: contract,
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
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async upsertCustomer({ _dbId, customerId, data, maSale }) {
    const payload = { customer_id: customerId, data, updated_at: new Date().toISOString() };
    if (_dbId) {
      const { data: row, error } = await supabase
        .from('customers').update(payload).eq('id', _dbId).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: s } = await supabase.auth.getSession();
    payload.created_by = s.session?.user?.id;
    payload.ma_sale = maSale;
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
};
