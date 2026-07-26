import { api } from "@/lib/api";

export const orderService = {
  async createOrder(orderData) {
    return api("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  },

  async getOrders() {
    const response = await api("/orders");

    return response.orders || [];
  },

  async getOrder(orderId) {
    const response = await api(
      `/orders/${encodeURIComponent(orderId)}`
    );

    return response.order;
  },
  
  async checkOrder(orderId) {
    const response = await api(
      `/orders/${encodeURIComponent(orderId)}/check`
    );

    return response.order;
  },

  async cancelOrder(orderId) {
    return api(
      `/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: "POST",
      }
    );
  },
};