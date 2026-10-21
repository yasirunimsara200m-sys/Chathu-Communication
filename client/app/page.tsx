"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Radio,
  Zap,
  Smartphone,
  Printer,
  ShieldCheck,
  BarChart3,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(user.role === "OWNER" ? "/owner" : "/pos");
    }
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      router.replace(u.role === "OWNER" ? "/owner" : "/pos");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("Cannot connect to server. Please check your network connection or backend service.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleQuickFill(role: "owner" | "cashier") {
    if (role === "owner") {
      setEmail("owner@chathu.lk");
      setPassword("Chathu@2026");
    } else {
      setEmail("cashier@chathu.lk");
      setPassword("Cashier@2026");
    }
    setError("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-paper-50 flex items-center justify-center p-4 sm:p-6 lg:p-12">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brass-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 h-64 w-64 rounded-full bg-teal-500/10 blur-[100px]" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12">
        {/* Left column: Brand & services showcase */}
        <section className="lg:col-span-7 flex flex-col justify-center space-y-8 py-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brass-400/30 bg-brass-400/10 px-3.5 py-1.5 text-xs font-medium text-brass-400 backdrop-blur-md">
              <Radio className="h-3.5 w-3.5 animate-pulse text-brass-400" />
              <span>Sri Lanka · Communication & Retail Hub</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
                Chathu <span className="text-transparent bg-clip-text bg-gradient-to-r from-brass-400 to-sky-300">Communication</span>
              </h1>
              <p className="max-w-xl text-base sm:text-lg text-paper-200">
                Modern Point of Sale & Terminal System. Effortless counter billing, instant mobile reloads, photocopy, print management, and real-time live business analytics.
              </p>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="rounded-xl border border-white/5 bg-ink-900/60 p-4 backdrop-blur-md transition hover:border-brass-400/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass-500/15 text-brass-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Fast Counter POS</h3>
                  <p className="text-xs text-paper-200">Barcode stock & thermal receipts</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-ink-900/60 p-4 backdrop-blur-md transition hover:border-brass-400/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Reloads & Bills</h3>
                  <p className="text-xs text-paper-200">Dialog, Mobitel, Airtel, Hutch</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-ink-900/60 p-4 backdrop-blur-md transition hover:border-brass-400/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Photocopy & Print</h3>
                  <p className="text-xs text-paper-200">Document services & stationery</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-ink-900/60 p-4 backdrop-blur-md transition hover:border-brass-400/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Live Drawer & Reports</h3>
                  <p className="text-xs text-paper-200">Cash tracking & phone dashboard</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs text-paper-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brass-400" />
              <span>Offline-ready Drawer</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brass-400" />
              <span>Role-based Security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brass-400" />
              <span>Instant Reports</span>
            </div>
          </div>
        </section>

        {/* Right column: Login Form Card */}
        <section className="lg:col-span-5">
          <div className="relative rounded-3xl border border-white/10 bg-ink-900/80 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
            {/* Subtle glow border line on top */}
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brass-400/40 to-transparent" />

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Sign In</h2>
                  <p className="mt-1 text-xs sm:text-sm text-paper-200">
                    Access your terminal or management account
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass-500/10 text-brass-400 border border-brass-400/20 shadow-inner">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              {/* Quick Fill Demo Helper */}
              <div className="mt-4 rounded-xl border border-white/5 bg-ink-950/60 p-2.5">
                <p className="text-[11px] font-medium text-paper-200 mb-1.5 flex items-center justify-between">
                  <span>Quick demo login:</span>
                  <span className="text-[10px] text-brass-400 font-semibold">1-Click autofill</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill("owner")}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-ink-800/80 py-1.5 px-2 text-xs font-medium text-paper-100 hover:border-brass-400/50 hover:bg-ink-800 transition"
                  >
                    👑 Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("cashier")}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-ink-800/80 py-1.5 px-2 text-xs font-medium text-paper-100 hover:border-brass-400/50 hover:bg-ink-800 transition"
                  >
                    💳 Cashier
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-ink-950/90 py-3 pl-11 pr-4 text-sm text-white placeholder:text-paper-200/40 focus:border-brass-400 focus:ring-2 focus:ring-brass-400/20 transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="username"
                    placeholder="e.g. owner@chathu.lk or cashier@chathu.lk"
                    required
                  />
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-200/50" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                    Password
                  </label>
                </div>
                <div className="relative mt-1.5">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-ink-950/90 py-3 pl-11 pr-11 text-sm text-white placeholder:text-paper-200/40 focus:border-brass-400 focus:ring-2 focus:ring-brass-400/20 transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    required
                  />
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-200/50" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-paper-200/50 hover:text-white transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                  <span className="font-semibold">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="group relative mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brass-500 to-sky-400 py-3.5 text-sm font-bold text-ink-950 shadow-lg shadow-brass-500/20 transition hover:from-brass-400 hover:to-sky-300 hover:shadow-brass-500/30 disabled:opacity-60 active:scale-[0.99]"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in to terminal…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-white/5 pt-4 text-center">
              <p className="text-[11px] text-paper-200/60">
                Chathu Communication POS · Secure Terminal Session
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
