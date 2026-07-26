import { api } from "@/lib/api";

export const walletService = {
  async getWallet() {
    const data = await api("/wallet");
    return data.wallet;
  },

  async getTransactions() {
    const data = await api("/wallet/transactions");
    return data.transactions;
  },

  async verifyFlutterwavePayment({
    transactionId,
    expectedAmount,
    reference,
  }) {
    const data = await api("/wallet/verify-payment", {
      method: "POST",
      body: JSON.stringify({
        transactionId,
        expectedAmount,
        reference,
      }),
    });

    return data;
  },
};