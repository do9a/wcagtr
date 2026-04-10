"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_PANEL_URL, BACKEND_BASE_URL } from "@/lib/platform-links";

const BACKEND_API_URL = `${BACKEND_BASE_URL.replace(/\/$/, "")}/api/v1`;

export function AdminLoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("E-posta adresi boş bırakılamaz.");
      return;
    }
    if (!password) {
      setError("Şifre boş bırakılamaz.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_API_URL}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Giriş başarısız. Bilgilerinizi kontrol edin.");
        return;
      }

      // Store token and redirect to admin panel
      if (data.token) {
        localStorage.setItem("wcagtr_admin_token", data.token);
        const targetUrl = new URL(ADMIN_PANEL_URL, window.location.origin);
        targetUrl.searchParams.set("token", data.token);
        window.location.href = targetUrl.toString();
      } else {
        window.location.href = ADMIN_PANEL_URL;
      }
    } catch {
      setError("Sunucuya bağlanılamıyor. Backend'in çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 80 }}
      className="w-full max-w-md"
    >
      <div className="relative glass-panel p-8 overflow-hidden">
        {/* Top shimmer */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF6B35]/50 to-transparent"
        />

        <div className="mb-8">
          <h1
            id="login-title"
            className="font-mono text-2xl font-bold text-[#EFEFD0] mb-2"
          >
            Admin Girişi
          </h1>
          <p className="font-mono text-sm text-[#EFEFD0]/50">
            Yönetim paneline erişmek için kimlik bilgilerinizi girin.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 p-4 mb-6"
          >
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-mono text-sm text-red-300">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby="login-title"
          className="space-y-5"
        >
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-[#EFEFD0]/80">
              E-posta Adresi
            </Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wcagtr.com"
              required
              aria-required="true"
              aria-describedby={error ? "login-error" : undefined}
              className="bg-white/5 border-white/15 text-[#EFEFD0] placeholder:text-[#EFEFD0]/25 focus-visible:ring-[#FF6B35]"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-[#EFEFD0]/80">
              Şifre
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                aria-required="true"
                className="bg-white/5 border-white/15 text-[#EFEFD0] placeholder:text-[#EFEFD0]/25 focus-visible:ring-[#FF6B35] pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#EFEFD0]/40 hover:text-[#EFEFD0]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm p-1"
                aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                aria-pressed={showPass}
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e85a28] disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-semibold text-sm px-6 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
            aria-label="Admin paneline giriş yap"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Giriş yapılıyor...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>Giriş Yap</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/8 flex items-center justify-between">
          <Link
            href="/giris"
            className="font-mono text-xs text-[#EFEFD0]/40 hover:text-[#EFEFD0]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
          >
            ← Panel seçimine dön
          </Link>
          <Link
            href="/giris/musteri"
            className="font-mono text-xs text-[#EFEFD0]/40 hover:text-[#F7C59F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
          >
            Müşteri girişi →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
