"use client";

import {
  Users,
  ShoppingCart,
  WalletCards,
  CreditCard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>

          <h2 className="mt-3 text-3xl font-black text-slate-950">
            {value}
          </h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const response = await api("/admin/dashboard");

      setStats(response.stats);
      setRecentUsers(response.recentUsers);
      setRecentOrders(response.recentOrders);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500 dark:text-slate-300">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-black">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-slate-500 dark:text-slate-300">
          Welcome to the ChapsSmS administration panel.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Users"
          value={stats.totalUsers || 0}
          icon={Users}
        />

        <StatCard
          title="Orders"
          value={stats.totalOrders || 0}
          icon={ShoppingCart}
        />

        <StatCard
          title="Payments"
          value={stats.totalPayments || 0}
          icon={CreditCard}
        />

        <StatCard
          title="Active Orders"
          value={stats.activeOrders || 0}
          icon={WalletCards}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        <div className="rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-black">
              Recent Users
            </h2>
          </div>

          <div className="divide-y">
            {recentUsers.length === 0 ? (
              <div className="p-6 text-slate-500 dark:text-slate-300">
                No users found.
              </div>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-bold">
                      {user.firstName} {user.lastName}
                    </p>

                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {user.email}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {user.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-black">
              Recent Orders
            </h2>
          </div>

          <div className="divide-y">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-slate-500 dark:text-slate-300">
                No orders found.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-bold">
                      {order.service}
                    </p>

                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {order.country}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    {order.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}