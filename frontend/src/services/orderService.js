// Backend-backed order service. Same signatures as before.
import api from './apiClient';

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const orderService = {
  async list() {
    const { data } = await api.get('/orders');
    return data;
  },

  async listByBuyer(userId) {
    const { data } = await api.get('/orders');
    return data.filter((o) => o.buyerId === userId);
  },

  async listBySeller(sellerName) {
    const { data } = await api.get('/orders');
    return data.filter((o) => o.sellerName === sellerName);
  },

  async getById(orderId) {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      return data;
    } catch {
      return null;
    }
  },

  async create(payload) {
    const { data } = await api.post('/orders', {
      productId: payload.productId,
      title: payload.title,
      sellerName: payload.sellerName,
      sellerAvatar: payload.sellerAvatar || '',
      price: Number(payload.price),
      priceLabel: payload.priceLabel || '',
      category: payload.category || '',
      deliveryDays: payload.deliveryDays || 3,
      note: payload.note || '',
    });
    return data;
  },

  async updateStatus(orderId, status) {
    const { data } = await api.patch(`/orders/${orderId}/status`, { status });
    return data;
  },

  async updatePayment(orderId, paymentStatus) {
    const { data } = await api.patch(`/orders/${orderId}/payment`, { paymentStatus });
    return data;
  },

  // Stripe checkout: returns { checkout_url, session_id }
  async startCheckout(orderId, originUrl) {
    const { data } = await api.post('/payments/checkout', { order_id: orderId, origin_url: originUrl });
    return data;
  },

  async paymentStatus(sessionId) {
    const { data } = await api.get(`/payments/status/${sessionId}`);
    return data;
  },
};

export function computeSellerAnalytics(orders) {
  const total = orders.length;
  const completed = orders.filter((o) => o.status === ORDER_STATUS.COMPLETED).length;
  const cancelled = orders.filter((o) => o.status === ORDER_STATUS.CANCELLED).length;
  const revenue = orders
    .filter((o) => o.status === ORDER_STATUS.COMPLETED)
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const pending = orders.filter(
    (o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.PROCESSING
  ).length;
  return { total, completed, cancelled, revenue, pending };
}
