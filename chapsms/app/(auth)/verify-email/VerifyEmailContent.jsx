"use client";

import { useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = String(
    searchParams.get("email") || ""
  )
    .trim()
    .toLowerCase();

  const {
    verifyEmail,
    resendVerification,
  } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [sending, setSending] =
    useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    const verificationCode =
      String(code || "").trim();

    if (!email) {
      toast.error(
        "Email address is missing. Please register again."
      );
      return;
    }

    if (!verificationCode) {
      toast.error(
        "Enter the verification code"
      );
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      toast.error(
        "Verification code must contain 6 digits"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await verifyEmail({
        email,
        code: verificationCode,
      });

      toast.success(
        response?.message ||
          "Email verified successfully"
      );

      router.replace("/login");
    } catch (error) {
      toast.error(
        error?.message ||
          "Email verification failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (sending) return;

    if (!email) {
      toast.error(
        "Email address is missing. Please register again."
      );
      return;
    }

    try {
      setSending(true);

      const response =
        await resendVerification(email);

      toast.success(
        response?.message ||
          "A new verification code has been sent"
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Unable to resend verification code"
      );
    } finally {
      setSending(false);
    }
  }

  function handleCodeChange(e) {
    const digitsOnly = e.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setCode(digitsOnly);
  }

  return (
    <Card className="rounded-3xl p-8 shadow-xl">
      <h1 className="text-3xl font-black text-[var(--foreground)]">
        Verify your email
      </h1>

      <p className="mt-3 text-[var(--muted-foreground)]">
        We sent a verification code to
      </p>

      <p className="mt-1 break-all font-semibold text-[var(--foreground)]">
        {email || "No email provided"}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5"
      >
        <Input
          label="Verification Code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={handleCodeChange}
          maxLength={6}
          required
        />

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !email}
        >
          {loading
            ? "Verifying..."
            : "Verify Email"}
        </Button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={sending || !email}
        className="mt-6 font-semibold text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending
          ? "Sending..."
          : "Resend Code"}
      </button>

      <p className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-bold text-blue-600"
        >
          Login
        </Link>
      </p>
    </Card>
  );
}