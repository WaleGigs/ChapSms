import { api } from "@/lib/api";

export const paymentService = {
  async initializePayment({
    amount,
    paymentMethod = "bank",
  }) {
    return api("/payment/initialize", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(amount),
        paymentMethod,
      }),
    });
  },

  async verifyPayment({
    transactionId,
    txRef,
  }) {
    return api("/payment/verify", {
      method: "POST",
      body: JSON.stringify({
        transactionId,
        txRef,
      }),
    });
  },
};

export default paymentService;
