"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, AlertCircle, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BACKEND_BASE_URL, CUSTOMER_PANEL_URL } from "@/lib/platform-links";

const BACKEND_API_URL = `${BACKEND_BASE_URL.replace(/\/$/, "")}/api/v1`;

type Tab = "login" | "register";

export function CustomerLoginForm({ defaultTab = "login" }: { defaultTab?: Tab }) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  function resetForm() {
    setEmail("");
    setPassword("");
    setCompanyName("");
    setError(null);
    setSuccess(null);
  }

  function switchTab(t: Tab) {
    setTab(t);
    resetForm();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("E-posta adresi boş bırakılamaz."); return; }
    if (!password) { setError("Şifre boş bırakılamaz."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Giriş başarısız. Bilgilerinizi kontrol edin.");
        return;
      }
      if (data.token) {
        localStorage.setItem("wcagtr_customer_token", data.token);
        const targetUrl = new URL(CUSTOMER_PANEL_URL, window.location.origin);
        targetUrl.searchParams.set("token", data.token);
        window.location.href = targetUrl.toString();
      } else {
        window.location.href = CUSTOMER_PANEL_URL;
      }
    } catch {
      setError("Sunucuya bağlanılamıyor. Backend'in çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) { setError("Şirket adı boş bırakılamaz."); return; }
    if (!email.trim()) { setError("E-posta adresi boş bırakılamaz."); return; }
    if (password.length < 8) { setError("Şifre en az 8 karakter olmalıdır."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          companyName: companyName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Kayıt başarısız. Bilgilerinizi kontrol edin.");
        return;
      }
      setSuccess("Hesabınız oluşturuldu! Şimdi giriş yapabilirsiniz.");
      setTimeout(() => switchTab("login"), 2000);
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
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Giriş veya kayıt seçin"
          className="flex mb-8 border border-white/12"
        >
          <button
            role="tab"
            id="tab-login"
            aria-selected={tab === "login"}
            aria-controls="panel-login"
            onClick={() => switchTab("login")}
            className={`flex-1 py-3 font-mono text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#EFEFD0] ${
              tab === "login"
                ? "bg-[#FF6B35] text-white"
                : "text-[#EFEFD0]/50 hover:text-[#EFEFD0]/80 hover:bg-white/5"
            }`}
          >
            Giriş Yap
          </button>
          <button
            role="tab"
            id="tab-register"
            aria-selected={tab === "register"}
            aria-controls="panel-register"
            onClick={() => switchTab("register")}
            className={`flex-1 py-3 font-mono text-sm font-semibold transition-colors border-l border-white/12 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[#EFEFD0] ${
              tab === "register"
                ? "bg-[#FF6B35] text-white"
                : "text-[#EFEFD0]/50 hover:text-[#EFEFD0]/80 hover:bg-white/5"
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Alert states */}
        {error && (
          <div
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 p-4 mb-5"
          >
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-mono text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 p-4 mb-5"
          >
            <span className="text-green-400 text-sm" aria-hidden="true">✓</span>
            <p className="font-mono text-sm text-green-300">{success}</p>
          </div>
        )}

        {/* Login form */}
        <AnimatePresence mode="wait">
          {tab === "login" && (
            <motion.div
              key="login"
              id="panel-login"
              role="tabpanel"
              aria-labelledby="tab-login"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="font-mono text-xl font-bold text-[#EFEFD0] mb-1">
                Müşteri Girişi
              </h1>
              <p className="font-mono text-sm text-[#EFEFD0]/45 mb-6">
                Hesabınıza giriş yapın.
              </p>
              <form onSubmit={handleLogin} noValidate className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="cust-email" className="text-[#EFEFD0]/80">
                    E-posta Adresi
                  </Label>
                  <Input
                    id="cust-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="siz@sirket.com"
                    required
                    aria-required="true"
                    className="bg-white/5 border-white/15 text-[#EFEFD0] placeholder:text-[#EFEFD0]/25"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-password" className="text-[#EFEFD0]/80">
                    Şifre
                  </Label>
                  <div className="relative">
                    <Input
                      id="cust-password"
                      type={showPass ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      aria-required="true"
                      className="bg-white/5 border-white/15 text-[#EFEFD0] placeholder:text-[#EFEFD0]/25 pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#EFEFD0]/40 hover:text-[#EFEFD0]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm p-1"
                      aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                      aria-pressed={showPass}
                    >
                      {showPass
                        ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                        : <Eye className="h-4 w-4" aria-hidden="true" />
                      }
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e85a28] disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-semibold text-sm px-6 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Giriş yapılıyor...</span></>
                    : <><LogIn className="h-4 w-4" aria-hidden="true" /><span>Giriş Yap</span></>
                  }
                </button>
              </form>
            </motion.div>
          )}

          {tab === "register" && (
            <motion.div
              key="register"
              id="panel-register"
              role="tabpanel"
              aria-labelledby="tab-register"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="font-mono text-xl font-bold text-[#EFEFD0] mb-1">
                Hesap Oluştur
              </h1>
              <p className="font-mono text-sm text-[#EFEFD0]/45 mb-6">
                Trial plan ile ücretsiz başlayın.
              </p>
              <form onSubmit={handleRegister} noValidate className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reg-company" className="text-[#EFEFD0]/80">
                    Şirket / Kurum Adı
                  </Label>
                  <Input
                    id="reg-company"
                    type="text"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Şirket A.Ş."
                    required
                    aria-required="true"
                    className="bg-white/5 border-white/15 text-[#EFEFD0] placeholder:text-[#EFEFD0]/25"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-[#EFEFD0]/80">
                    E-posta Adresi
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="siz@sirket.com"
                    required
                    aria-required="true"
                    className="bg-white/5 border-white/15 text-[#EFEFD0] placeholder:text-[#EFEFD0]/25"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-[#EFEFD0]/80">
                    Şifre
                    <span className="text-[#EFEFD0]/35 font-normal ml-1">(en az 8 karakter)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPass ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      aria-required="true"
                      minLength={8}
                      aria-describedby="password-hint"
                      className="bg-white/5 border-white/15 text-[#EFEFD0] placeholder:text-[#EFEFD0]/25 pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#EFEFD0]/40 hover:text-[#EFEFD0]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm p-1"
                      aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                      aria-pressed={showPass}
                    >
                      {showPass
                        ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                        : <Eye className="h-4 w-4" aria-hidden="true" />
                      }
                    </button>
                  </div>
                  <p id="password-hint" className="font-mono text-xs text-[#EFEFD0]/30">
                    Güvenli bir şifre seçin, en az 8 karakter.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e85a28] disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-semibold text-sm px-6 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Kayıt yapılıyor...</span></>
                    : <><UserPlus className="h-4 w-4" aria-hidden="true" /><span>Hesap Oluştur</span></>
                  }
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 pt-6 border-t border-white/8 flex items-center justify-between">
          <Link
            href="/giris"
            className="font-mono text-xs text-[#EFEFD0]/40 hover:text-[#EFEFD0]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
          >
            ← Panel seçimine dön
          </Link>
          <Link
            href="/giris/admin"
            className="font-mono text-xs text-[#EFEFD0]/40 hover:text-[#FF6B35] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
          >
            Admin girişi →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
