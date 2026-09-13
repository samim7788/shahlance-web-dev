// Backend-backed seller service (applications, products, withdrawals).
// Keeps the same call signatures and static exports the UI relies on.
import api from './apiClient';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export const SELLER_TYPES = [
  { id: 'digital-marketplace', title: 'Digital Marketplace Seller', desc: 'Sell digital products — accounts, gift cards, subscriptions.', icon: 'Store', color: 'from-emerald-500 to-teal-500' },
  { id: 'freelancer', title: 'Hire A Freelancer Seller', desc: 'Offer 1:1 professional services with client communication.', icon: 'Users', color: 'from-blue-500 to-indigo-500' },
  { id: 'work-earn', title: 'Work & Earn Provider', desc: 'Launch micro-task campaigns for workers.', icon: 'Briefcase', color: 'from-violet-500 to-fuchsia-500' },
  { id: 'all-services', title: 'All Services Provider', desc: 'Deliver end-to-end packaged services across categories.', icon: 'Sparkles', color: 'from-orange-500 to-amber-500' },
  { id: 'custom', title: 'Custom Service Provider', desc: 'Offer a service that doesn’t fit existing categories.', icon: 'Settings', color: 'from-pink-500 to-rose-500' },
];

export const sellerService = {
  // ---------- Applications ----------
  async submitApplication(_userId, data) {
    const { sellerType, ...rest } = data;
    const { data: res } = await api.post('/seller/applications', { sellerType, data: rest });
    return res;
  },
  async listApplications({ status } = {}) {
    const { data } = await api.get('/seller/applications', { params: status ? { status } : {} });
    return data;
  },
  async listUserApplications(_userId) {
    const { data } = await api.get('/seller/applications/mine');
    return data;
  },
  async decideApplication(appId, action, reason) {
    const { data } = await api.post(`/seller/applications/${appId}/decide`, { action, reason: reason || '' });
    return data;
  },
  async isApprovedSeller(_userId) {
    const { data } = await api.get('/seller/applications/mine');
    return data.some((a) => a.status === 'approved');
  },

  // ---------- Products ----------
  async submitProduct(_userId, data) {
    const { data: res } = await api.post('/seller/products', {
      title: data.title,
      category: data.category,
      isCustomCategory: !!data.isCustomCategory,
      price: Number(data.price),
      description: data.description,
      image: data.image || '',
      fileId: data.fileId || '',
      fileName: data.fileName || '',
    });
    return res;
  },
  async listProducts({ status, userId } = {}) {
    const params = {};
    if (status) params.status = status;
    if (userId) params.userId = userId;
    const { data } = await api.get('/seller/products', { params });
    return data;
  },
  async decideProduct(productId, action, reason) {
    const { data } = await api.post(`/seller/products/${productId}/decide`, { action, reason: reason || '' });
    return data;
  },
  async updateProduct(productId, patch) {
    const { data } = await api.patch(`/seller/products/${productId}`, patch);
    return data;
  },

  // ---------- Withdrawals ----------
  async requestWithdrawal(_userId, amount, method) {
    const { data } = await api.post('/seller/withdrawals', { amount: Number(amount), method: method || 'Bank transfer' });
    return data;
  },
  async listWithdrawals({ status, userId } = {}) {
    const params = {};
    if (status) params.status = status;
    if (userId) params.userId = userId;
    const { data } = await api.get('/seller/withdrawals', { params });
    return data;
  },
  async decideWithdrawal(id, action) {
    const { data } = await api.post(`/seller/withdrawals/${id}/decide`, { action });
    return data;
  },

  // ---------- File upload (deliverable / assets) ----------
  async uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data; // { id, filename, size }
  },
};

export const SELLER_CATEGORIES = [
  'Accounts', 'Crypto', 'Gift Cards', 'Digital Marketing', 'Premium Subscriptions',
  'SMS Verification', 'Virtual SIM', 'eSIM', 'Hosting', 'VPS & Dedicated',
  'Payment Gateway', 'KYC Verification', 'Proxy & VPN', 'Software', 'Custom Category',
];

export { sleep };
