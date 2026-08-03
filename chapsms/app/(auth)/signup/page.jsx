"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, UserRound } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PasswordField from "@/components/auth/PasswordField";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import {
  normalizeEmail,
  validateSignupField,
  validateSignupForm,
} from "@/lib/formValidation";

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
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentErrors = useMemo(() => validateSignupForm(form), [form]);
  const canSubmit = Object.keys(currentErrors).length === 0 && !loading;

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    const nextForm = {
      ...form,
      [name]: nextValue,
    };

    setForm(nextForm);
    setSubmitError("");

    if (touched[name]) {
      setErrors((current) => ({
        ...current,
        [name]: validateSignupField(name, nextValue, nextForm),
      }));
    }

    if (name === "password" && touched.confirmPassword) {
      setErrors((current) => ({
        ...current,
        confirmPassword: validateSignupField(
          "confirmPassword",
          nextForm.confirmPassword,
          nextForm
        ),
      }));
    }
  }

  function handleBlur(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setTouched((current) => ({
      ...current,
      [name]: true,
    }));

    setErrors((current) => ({
      ...current,
      [name]: validateSignupField(name, nextValue, form),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    const validationErrors = validateSignupForm(form);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
      terms: true,
    });
    setErrors(validationErrors);
    setSubmitError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const email = normalizeEmail(form.email);

    try {
      setLoading(true);

      const response = await signup({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        password: form.password,
      });

      toast.success(
        response?.message ||
          "Account created. Check your email for the verification code."
      );

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      const message = error?.message || "Signup failed. Please try again.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-[26px] p-5 shadow-xl sm:p-8">
      <div className="mb-7 sm:mb-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
          New account
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">
          Create your ChapsSmS account
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
          Use accurate details and create a strong password to protect your wallet and orders.
        </p>
      </div>

      {submitError ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            placeholder="Michael"
            autoComplete="given-name"
            maxLength={50}
            value={form.firstName}
            onChange={updateField}
            onBlur={handleBlur}
            error={touched.firstName ? errors.firstName : ""}
            leftIcon={UserRound}
            required
          />

          <Input
            label="Last name"
            name="lastName"
            placeholder="Jordan"
            autoComplete="family-name"
            maxLength={50}
            value={form.lastName}
            onChange={updateField}
            onBlur={handleBlur}
            error={touched.lastName ? errors.lastName : ""}
            leftIcon={UserRound}
            required
          />
        </div>

        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={form.email}
          onChange={updateField}
          onBlur={handleBlur}
          error={touched.email ? errors.email : ""}
          leftIcon={Mail}
          required
        />

        <PasswordField
          label="Password"
          name="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          maxLength={64}
          value={form.password}
          onChange={updateField}
          onBlur={handleBlur}
          error={touched.password ? errors.password : ""}
          required
        />

        <PasswordChecklist password={form.password} />

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          placeholder="Enter the password again"
          autoComplete="new-password"
          maxLength={64}
          value={form.confirmPassword}
          onChange={updateField}
          onBlur={handleBlur}
          error={touched.confirmPassword ? errors.confirmPassword : ""}
          required
        />

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/35 p-4 text-sm text-[var(--muted-foreground)]">
            <input
              name="terms"
              type="checkbox"
              checked={form.terms}
              onChange={updateField}
              onBlur={handleBlur}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--input)] accent-blue-600"
            />

            <span className="leading-6">
              I agree to the{" "}
              <Link href="/terms" className="font-bold text-blue-600">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-bold text-blue-600">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {touched.terms && errors.terms ? (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
              {errors.terms}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={!canSubmit}
          aria-busy={loading}
        >
          {loading ? "Creating account..." : "Create secure account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="focus-ring rounded-md font-bold text-blue-600 hover:text-blue-700"
        >
          Login
        </Link>
      </p>
    </Card>
  );
}