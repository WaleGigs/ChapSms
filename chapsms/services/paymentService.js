import { api } from "@/lib/api";

export const paymentService = {
  async initializePayment({ amount, paymentMethod }) {
    return api("/payment/initialize", {
      method: "POST",
      body: JSON.stringify({
        amount,
        paymentMethod,
      }),
    });
  },

  async createBankTransfer({ amount }) {
    return api("/payment/bank-transfer", {
      method: "POST",
      body: JSON.stringify({
        amount,
      }),
    });
  },

  async getBankTransferStatus({ txRef }) {
    return api(
      `/payment/bank-transfer/${encodeURIComponent(txRef)}/status`,
      {
        method: "GET",
      },
    );
  },

  async verifyPayment({ transactionId, txRef }) {
    return api("/payment/verify", {
      method: "POST",
      body: JSON.stringify({
        transactionId,
        txRef,
      }),
    });
  },
};