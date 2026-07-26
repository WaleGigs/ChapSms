import { api } from "@/lib/api";

export const catalogService = {
  async getCatalog({ refresh = false } = {}) {
    const query = refresh ? "?refresh=true" : "";

    return api(`/catalog${query}`);
  },
};