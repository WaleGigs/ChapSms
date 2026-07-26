"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({
  children,
}) {
  const router = useRouter();

  const {
    user,
    authLoading,
  } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            {authLoading
              ? "Loading your account..."
              : "Redirecting to login..."}
          </p>
        </div>
      </div>
    );
  }

  return children;
}