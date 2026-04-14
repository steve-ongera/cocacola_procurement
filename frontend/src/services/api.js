const BASE = 'http://localhost:8000/api'

// ─── Auth helpers ──────────────────────────────────────────────────────────
export const getToken   = () => localStorage.getItem('access_token')
export const getRefresh = () => localStorage.getItem('refresh_token')

export const setTokens = (access, refresh) => {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

// ─── Core fetch ────────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Try refresh
    const refreshRes = await fetch(`${BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: getRefresh() }),
    })
    if (refreshRes.ok) {
      const data = await refreshRes.json()
      setTokens(data.access, getRefresh())
      const retry = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${data.access}` },
      })
      if (!retry.ok) throw new Error(await retry.text())
      return retry.json()
    } else {
      clearTokens()
      window.location.href = '/login'
      return
    }
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err)
  }

  if (res.status === 204) return null
  return res.json()
}

const get    = (path)         => request(path)
const post   = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) })
const put    = (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) })
const patch  = (path, body)   => request(path, { method: 'PATCH',  body: JSON.stringify(body) })
const del    = (path)         => request(path, { method: 'DELETE' })

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (username, password) =>
    post('/auth/token/', { username, password }),
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => get('/dashboard/'),
}

// ─── Suppliers ─────────────────────────────────────────────────────────────
export const suppliersAPI = {
  list:         (params = '') => get(`/suppliers/${params}`),
  get:          (id)          => get(`/suppliers/${id}/`),
  create:       (data)        => post('/suppliers/', data),
  update:       (id, data)    => put(`/suppliers/${id}/`, data),
  delete:       (id)          => del(`/suppliers/${id}/`),
  changeStatus: (id, status)  => post(`/suppliers/${id}/change_status/`, { status }),
}

// ─── Categories ────────────────────────────────────────────────────────────
export const categoriesAPI = {
  list:   (params = '') => get(`/categories/${params}`),
  create: (data)        => post('/categories/', data),
  update: (id, data)    => put(`/categories/${id}/`, data),
  delete: (id)          => del(`/categories/${id}/`),
}

// ─── Items ─────────────────────────────────────────────────────────────────
export const itemsAPI = {
  list:     (params = '') => get(`/items/${params}`),
  get:      (id)          => get(`/items/${id}/`),
  create:   (data)        => post('/items/', data),
  update:   (id, data)    => put(`/items/${id}/`, data),
  delete:   (id)          => del(`/items/${id}/`),
  lowStock: ()            => get('/items/low_stock/'),
}

// ─── Purchase Requisitions ─────────────────────────────────────────────────
export const requisitionsAPI = {
  list:    (params = '') => get(`/requisitions/${params}`),
  get:     (id)          => get(`/requisitions/${id}/`),
  create:  (data)        => post('/requisitions/', data),
  update:  (id, data)    => put(`/requisitions/${id}/`, data),
  delete:  (id)          => del(`/requisitions/${id}/`),
  submit:  (id)          => post(`/requisitions/${id}/submit/`, {}),
  approve: (id)          => post(`/requisitions/${id}/approve/`, {}),
  reject:  (id)          => post(`/requisitions/${id}/reject/`, {}),
}

// ─── Purchase Orders ───────────────────────────────────────────────────────
export const purchaseOrdersAPI = {
  list:           (params = '') => get(`/purchase-orders/${params}`),
  get:            (id)          => get(`/purchase-orders/${id}/`),
  create:         (data)        => post('/purchase-orders/', data),
  update:         (id, data)    => put(`/purchase-orders/${id}/`, data),
  delete:         (id)          => del(`/purchase-orders/${id}/`),
  sendToSupplier: (id)          => post(`/purchase-orders/${id}/send_to_supplier/`, {}),
  acknowledge:    (id)          => post(`/purchase-orders/${id}/acknowledge/`, {}),
  cancel:         (id)          => post(`/purchase-orders/${id}/cancel/`, {}),
}

// ─── GRNs ──────────────────────────────────────────────────────────────────
export const grnsAPI = {
  list:    (params = '') => get(`/grns/${params}`),
  get:     (id)          => get(`/grns/${id}/`),
  create:  (data)        => post('/grns/', data),
  update:  (id, data)    => put(`/grns/${id}/`, data),
  approve: (id)          => post(`/grns/${id}/approve/`, {}),
  reject:  (id)          => post(`/grns/${id}/reject/`, {}),
}

// ─── Invoices ──────────────────────────────────────────────────────────────
export const invoicesAPI = {
  list:     (params = '') => get(`/invoices/${params}`),
  get:      (id)          => get(`/invoices/${id}/`),
  create:   (data)        => post('/invoices/', data),
  update:   (id, data)    => put(`/invoices/${id}/`, data),
  approve:  (id)          => post(`/invoices/${id}/approve/`, {}),
  markPaid: (id)          => post(`/invoices/${id}/mark_paid/`, {}),
  dispute:  (id)          => post(`/invoices/${id}/dispute/`, {}),
}

// ─── Users ─────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: () => get('/users/'),
}