"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Pencil,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  const [editingProfile, setEditingProfile] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fullName = useMemo(() => {
    const name = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ");

    return name || "ChapsSmS User";
  }, [user]);

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] || "";
    const last = user?.lastName?.[0] || "";

    return `${first}${last}`.toUpperCase() || "CU";
  }, [user]);

  const email = user?.email || "No email available";

  const apiKey = user?.apiKey || "";

  const displayedApiKey = useMemo(() => {
    if (!apiKey) {
      return "No API key generated";
    }

    if (showApiKey) {
      return apiKey;
    }

    if (apiKey.length <= 10) {
      return "••••••••••••••••";
    }

    return `${apiKey.slice(0, 4)}${"•".repeat(20)}${apiKey.slice(-4)}`;
  }, [apiKey, showApiKey]);

  async function copyText(value, message) {
    if (!value) {
      toast.error("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Could not copy");
    }
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswords((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleProfileSave(event) {
    event.preventDefault();

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error("Enter your first and last name");
      return;
    }

    toast.success("Profile changes prepared");
    setEditingProfile(false);
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();

    if (
      !passwords.currentPassword ||
      !passwords.newPassword ||
      !passwords.confirmPassword
    ) {
      toast.error("Complete all password fields");
      return;
    }

    if (passwords.newPassword.length < 8) {
      toast.error("New password must contain at least 8 characters");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setUpdatingPassword(true);

      // Connect your password update API here.
      toast.success("Password update request prepared");

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } finally {
      setUpdatingPassword(false);
    }
  }

  function handleEnableTwoFactor() {
    toast("Two-factor authentication is not connected yet");
  }

  function handleRotateApiKey() {
    toast("API key rotation is not connected yet");
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-7">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          <span className="text-blue-600">Settings</span>
        </h1>

        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Manage your profile, security, and integration key.
        </p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <User size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Profile
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Control how your name appears across the dashboard.
              </p>
            </div>
          </div>

          {!editingProfile ? (
            <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-950">
                    {fullName}
                  </p>

                  <p className="truncate text-sm text-slate-500">
                    {email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={16} />
                Edit
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleProfileSave}
              className="mt-6 grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  First name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Last name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit">Save changes</Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingProfile(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>

        {/* Email */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Mail size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Email address
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Used for sign-in and account notifications.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Mail
                  className="shrink-0 text-slate-400"
                  size={17}
                />

                <span className="truncate text-sm font-semibold text-slate-700">
                  {email}
                </span>
              </div>

              {user?.isVerified && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                  <Check size={13} />
                  Verified
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => copyText(user?.email, "Email copied")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy size={16} />
              Copy
            </button>
          </div>
        </section>

        {/* Password */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <LockKeyhole size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Password
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose a strong password to protect your account.
              </p>
            </div>
          </div>

          <form
            onSubmit={handlePasswordUpdate}
            className="mt-6 space-y-4"
          >
            {[
              {
                name: "currentPassword",
                label: "Current password",
              },
              {
                name: "newPassword",
                label: "New password",
              },
              {
                name: "confirmPassword",
                label: "Confirm new password",
              },
            ].map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  {field.label}
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id={field.name}
                    name={field.name}
                    type={showPasswords ? "text" : "password"}
                    value={passwords[field.name]}
                    onChange={handlePasswordChange}
                    className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-12 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPasswords((current) => !current)}
                    aria-label={
                      showPasswords
                        ? "Hide passwords"
                        : "Show passwords"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPasswords ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updatingPassword}
              >
                <LockKeyhole size={17} />
                {updatingPassword
                  ? "Updating..."
                  : "Update password"}
              </Button>
            </div>
          </form>
        </section>

        {/* 2FA */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Two-factor authentication
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Add a second step when signing in to your account.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
              Disabled
            </span>
          </div>

          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-slate-700">
              Your account is currently using password-only sign-in.
            </p>

            <Button
              type="button"
              onClick={handleEnableTwoFactor}
            >
              <ShieldCheck size={17} />
              Enable 2FA
            </Button>
          </div>
        </section>

        {/* API key */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <KeyRound size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                API key
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep this key private. Anyone with access may use your
                account.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="break-all font-mono text-sm font-semibold text-slate-700">
              {displayedApiKey}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!apiKey}
              onClick={() => setShowApiKey((current) => !current)}
            >
              {showApiKey ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}

              {showApiKey ? "Hide" : "Reveal"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={!apiKey}
              onClick={() => copyText(apiKey, "API key copied")}
            >
              <Copy size={17} />
              Copy
            </Button>

            <Button
              type="button"
              onClick={handleRotateApiKey}
            >
              <RefreshCw size={17} />
              Rotate
            </Button>
          </div>

          <Link
            href="/api-keys"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700"
          >
            View API documentation
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </div>
  );
}