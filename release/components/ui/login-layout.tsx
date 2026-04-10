import * as React from "react";
import { Shield, ScanSearch, Zap, CheckCircle } from "lucide-react";
import Link from "next/link";

const featurePills = [
  { icon: ScanSearch, label: "AI Destekli WCAG 2.2 Tarama" },
  { icon: Zap, label: "Otomatik Patch Delivery" },
  { icon: CheckCircle, label: "122 Kriter TR Standardı" },
];

interface LoginLayoutProps {
  panelType: "admin" | "customer";
  children: React.ReactNode;
}

export function LoginLayout({ panelType, children }: LoginLayoutProps) {
  const isAdmin = panelType === "admin";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div
        className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden"
        style={{
          background: isAdmin
            ? "linear-gradient(150deg, rgba(0,18,48,0.98), rgba(60,20,0,0.90))"
            : "linear-gradient(150deg, rgba(0,18,48,0.98), rgba(0,55,105,0.92))",
        }}
        aria-hidden="true"
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: isAdmin
              ? "radial-gradient(ellipse, rgba(255,107,53,0.18) 0%, transparent 70%)"
              : "radial-gradient(ellipse, rgba(26,101,158,0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <div className="flex h-9 w-9 items-center justify-center bg-[#FF6B35]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-mono text-xl font-bold text-[#EFEFD0]">
              WCAG<span className="text-[#FF6B35]">TR</span>
            </span>
          </Link>

          <div className="max-w-xs">
            <p className="font-mono text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-4">
              {isAdmin ? "Yönetim Paneli" : "Müşteri Paneli"}
            </p>
            <h2 className="font-mono text-2xl md:text-3xl font-bold text-[#EFEFD0] leading-tight mb-6">
              {isAdmin
                ? "Platformun Tamamını Yönetin"
                : "Erişilebilirlik Sürecinizi Yönetin"}
            </h2>
            <p className="font-mono text-sm text-[#EFEFD0]/50 leading-relaxed">
              {isAdmin
                ? "Müşteri yönetimi, scan metrikleri, token denetimi ve fiyatlandırma."
                : "Domain tarama, AI fix onaylama, billing ve webhook izleme."}
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <ul className="space-y-3" role="list">
            {featurePills.map((f) => (
              <li key={f.label} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center bg-[#FF6B35]/15 border border-[#FF6B35]/25 flex-shrink-0">
                  <f.icon className="h-3.5 w-3.5 text-[#FF6B35]" />
                </div>
                <span className="font-mono text-xs text-[#EFEFD0]/55">{f.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-6 border-t border-white/8">
            <p className="font-mono text-xs text-[#EFEFD0]/25">
              © 2026 WCAGTR Platform. WCAG 2.2 AA Uyumlu.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:py-0 min-h-screen lg:min-h-0">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center bg-[#FF6B35]">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-mono text-lg font-bold text-[#EFEFD0]">
            WCAG<span className="text-[#FF6B35]">TR</span>
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
