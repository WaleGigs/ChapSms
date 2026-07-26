"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
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

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email
      .trim()
      .toLowerCase();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !form.password ||
      !form.confirmPassword
    ) {
      toast.error(
        "Please fill all required fields"
      );
      return;
    }

    if (form.password.length < 8) {
      toast.error(
        "Password must contain at least 8 characters"
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      toast.error("Passwords do not match");
      return;
    }

    if (!form.terms) {
      toast.error(
        "Please accept the terms and privacy policy"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await signup({
        firstName,
        lastName,
        email,
        password: form.password,
      });

      toast.success(
        response?.message ||
          "Account created. Check your email for the verification code."
      );

      router.push(
        `/verify-email?email=${encodeURIComponent(
          email
        )}`
      );
    } catch (error) {
      toast.error(
        error?.message || "Signup failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-3xl p-8 shadow-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--foreground)]">
          Create your account
        </h1>

        <p className="mt-2 text-[var(--muted-foreground)]">
          Start receiving OTP codes with
          ChapsSmS.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={updateField}
            required
          />

          <Input
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={updateField}
            required
          />
        </div>

        <Input
          label="Email Address"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={updateField}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={updateField}
          required
        />

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={updateField}
          required
        />

        <label className="flex items-start gap-3 text-sm text-[var(--muted-foreground)]">
          <input
            name="terms"
            type="checkbox"
            checked={form.terms}
            onChange={updateField}
            className="mt-1 h-4 w-4"
          />

          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              className="font-bold text-blue-600"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-bold text-blue-600"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
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