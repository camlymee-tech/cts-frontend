// src/lib/api.js
// Lớp lưu trữ key-value (get/set/del) trên Supabase + đọc hóa đơn VAT.
// Mỗi "key" (sellers, departments, api_key, seller_info)
// là 1 dòng trong bảng app_storage, cột value (jsonb) chứa nguyên object/map.
// Hợp đồng (contracts) và Khách hàng (customers) lưu riêng (1 dòng = 1 bản ghi, có RLS theo người tạo).
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
  // ───────── AI đọc hóa đơn VAT ─────────
  async readVAT(imageBase64, mediaType) {
    const apiKey = await api.get('api_key', true);
    if (!apiKey) throw new Error('Chưa cài đặt API Key. Vào Cài đặt → API Key để nhập.');

    const isPdf = mediaType === 'application/pdf';
    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text:
              'Đây là hóa đơn VAT. Trích xuất danh sách hàng hóa và trả về JSON đúng định dạng:\n' +
              '{"goods":[{"stt":1,"tenHang":"...","dvt":"...","soLuong":0,"donGia":0,"thanhTien":0,"vatRate":8}]}\n' +
              'Chỉ trả JSON, không thêm chữ nào khác.' },
          ],
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error('Lỗi gọi AI (' + res.status + '): ' + err.slice(0, 200));
    }
    const data = await res.json();
    const txt = data.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Không đọc được phản hồi AI.');
    return JSON.parse(m[0]); // { goods: [...] }
  },

  // ───────── AI đọc danh sách hàng hóa định giá USD (đơn hàng/invoice ủy thác nhập khẩu) ─────────
  async readGoodsUSD(imageBase64, mediaType) {
    const apiKey = await api.get('api_key', true);
    if (!apiKey) throw new Error('Chưa cài đặt API Key. Vào Cài đặt → API Key để nhập.');

    const isPdf = mediaType === 'application/pdf';
    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text:
              'Đây là đơn hàng / invoice từ nhà cung cấp nước ngoài, đơn giá tính bằng USD. Trích xuất danh sách hàng hóa và trả về JSON đúng định dạng:\n' +
              '{"goods":[{"stt":1,"tenHang":"...","dvt":"...","soLuong":0,"donGia":0,"thanhTien":0}]}\n' +
              'donGia và thanhTien là số USD (có thể có phần thập phân). Chỉ trả JSON, không thêm chữ nào khác.' },
          ],
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error('Lỗi gọi AI (' + res.status + '): ' + err.slice(0, 200));
    }
    const data = await res.json();
    const txt = data.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Không đọc được phản hồi AI.');
    return JSON.parse(m[0]); // { goods: [...] }
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
    const { data, error } = await supabase.rpc('admin_list_profiles');
    if (error) throw new Error(error.message);
    return data || [];
  },
};
