"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });

  const [loading, setLoading] = useState(false);

  function updateField(e) {
    const { name, value, type, checked } = e.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) {
      return;
    }

    const email = form.email
      .trim()
      .toLowerCase();

    if (!email || !form.password) {
      toast.error(
        "Email and password are required"
      );
      return;
    }

    try {
      setLoading(true);

     const response = await login({
  email,
  password: form.password,
  rememberMe: form.rememberMe,
});

toast.success(
  response?.message ||
    "Login successful"
);

router.replace("/dashboard");
    } catch (error) {
      const errorCode =
        error?.data?.code;

      if (
        errorCode ===
        "EMAIL_NOT_VERIFIED"
      ) {
        toast.error(
          error?.message ||
            "Please verify your email before logging in."
        );

        router.push(
          `/verify-email?email=${encodeURIComponent(
            email
          )}`
        );

        return;
      }

      toast.error(
        error?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-3xl p-8 shadow-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--foreground)]">
          Welcome back
        </h1>

        <p className="mt-2 text-[var(--muted-foreground)]">
          Login to manage your wallet,
          orders, and API keys.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <Input
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={updateField}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter password"
          autoComplete="current-password"
          value={form.password}
          onChange={updateField}
          required
        />

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <input
              name="rememberMe"
              type="checkbox"
              checked={form.rememberMe}
              onChange={updateField}
              className="h-4 w-4"
            />

            Remember me
          </label>

          <Link
            href="/forgot-password"
            className="font-bold text-blue-600"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-bold text-blue-600"
        >
          Create account
        </Link>
      </p>
    </Card>
  );
}