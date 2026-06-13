// src/lib/supabase.js — Supabase Auth client
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// =============================================
// src/lib/api.js — Gọi backend API
// =============================================
const API_URL = import.meta.env.VITE_API_URL;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
  return data;
}

export const api = {
  // Sellers
  getSellers: () => request('/api/sellers'),
  createSeller: (body) => request('/api/sellers', { method: 'POST', body: JSON.stringify(body) }),
  updateSeller: (id, body) => request(`/api/sellers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSeller: (id) => request(`/api/sellers/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (params = {}) => request('/api/customers?' + new URLSearchParams(params)),
  createCustomer: (body) => request('/api/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id, body) => request(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id) => request(`/api/customers/${id}`, { method: 'DELETE' }),

  // Contracts
  getContracts: (params = {}) => request('/api/contracts?' + new URLSearchParams(params)),
  createContract: (body) => request('/api/contracts', { method: 'POST', body: JSON.stringify(body) }),
  updateContract: (id, body) => request(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContract: (id) => request(`/api/contracts/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => request('/api/departments'),
  createDepartment: (body) => request('/api/departments', { method: 'POST', body: JSON.stringify(body) }),
  deleteDepartment: (id) => request(`/api/departments/${id}`, { method: 'DELETE' }),

  // VAT Reading
  readVAT: (imageBase64, mediaType) => request('/api/vat/read', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, mediaType })
  }),

  // Profile
  getProfile: () => request('/api/profile'),
  updateProfile: (body) => request('/api/profile', { method: 'PUT', body: JSON.stringify(body) }),
  getUsers: () => request('/api/users'),
};
