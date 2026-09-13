// Backend-backed review service. Same signatures as before.
import api from './apiClient';

export const reviewService = {
  async list() {
    const { data } = await api.get('/reviews');
    return data.filter((r) => !r.hidden);
  },

  async listAll() {
    const { data } = await api.get('/reviews');
    return data;
  },

  async listByProduct(productId) {
    const { data } = await api.get('/reviews');
    return data.filter((r) => r.productId === productId && !r.hidden);
  },

  async listBySeller(sellerName) {
    const { data } = await api.get('/reviews');
    return data.filter((r) => r.sellerName === sellerName && !r.hidden);
  },

  async create(payload) {
    const { data } = await api.post('/reviews', {
      productId: payload.productId,
      productTitle: payload.productTitle || '',
      sellerName: payload.sellerName || '',
      orderId: payload.orderId || '',
      rating: Number(payload.rating) || 5,
      comment: payload.comment || '',
    });
    return data;
  },

  async setHidden(reviewId, hidden) {
    const { data } = await api.patch(`/reviews/${reviewId}/hidden`, { hidden });
    return data;
  },

  async remove(reviewId) {
    await api.delete(`/reviews/${reviewId}`);
    return true;
  },
};

export function summarize(reviews) {
  if (!reviews || reviews.length === 0) return { avg: 0, count: 0 };
  const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
  return {
    avg: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}
