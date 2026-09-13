// Backend-backed wishlist service. Now async (returns promises).
import api from './apiClient';

export const savedService = {
  async list() {
    try {
      const { data } = await api.get('/saved');
      return data;
    } catch {
      return [];
    }
  },
  async isSaved(_userId, productId) {
    const items = await this.list();
    return items.includes(productId);
  },
  async toggle(_userId, productId) {
    const { data } = await api.post('/saved/toggle', { productId });
    return data;
  },
  async remove(_userId, productId) {
    const { data } = await api.delete(`/saved/${productId}`);
    return data;
  },
};
