"use client";

import { useCallback, useEffect, useState } from "react";
import { catalogService } from "@/services/catalogService";

export function useCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [countries, setCountries] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCatalog = useCallback(async ({ refresh = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      const response = await catalogService.getCatalog({
        refresh,
      });

      setCatalog(response);
      setCountries(response.countries || []);
      setServices(response.services || []);

      return response;
    } catch (error) {
      console.error("Catalog loading failed:", error);
      setError(error.message || "Unable to load catalog");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog().catch(() => {});
  }, [loadCatalog]);

  return {
    catalog,
    countries,
    services,
    loading,
    error,
    reload: () => loadCatalog({ refresh: true }),
  };
}