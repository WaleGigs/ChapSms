"use client";

import { useCallback, useEffect, useState } from "react";
import { orderService } from "@/services/orderService";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const orderList = await orderService.getOrders();

      setOrders(Array.isArray(orderList) ? orderList : []);

      return orderList;
    } catch (error) {
      console.error("Orders loading failed:", error);

      setError(error.message || "Unable to load orders");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  async function createOrder(orderData) {
    const response = await orderService.createOrder(orderData);

    if (!response?.order) {
      throw new Error("The server did not return the new order");
    }

    setOrders((currentOrders) => [
      response.order,
      ...currentOrders.filter(
        (order) => order._id !== response.order._id
      ),
    ]);

    return response;
  }

  function updateOrder(updatedOrder) {
    if (!updatedOrder?._id) return;

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order._id === updatedOrder._id
          ? updatedOrder
          : order
      )
    );
  }

  function removeOrder(orderId) {
    setOrders((currentOrders) =>
      currentOrders.filter(
        (order) => order._id !== orderId
      )
    );
  }

  useEffect(() => {
    loadOrders().catch(() => {});
  }, [loadOrders]);

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrder,
    removeOrder,
    refreshOrders: loadOrders,
  };
}