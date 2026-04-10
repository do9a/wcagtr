import { WcagtrNav } from "@/components/ui/wcagtr-nav";
import { WcagtrFooter } from "@/components/ui/wcagtr-footer";
import { ArrowRight, LayoutDashboard, Users, ChevronRight, Shield } from "lucide-react";
import { ADMIN_PANEL_URL, CUSTOMER_PANEL_URL } from "@/lib/platform-links";

const adminFeatures = [
  "Tüm müşterileri yönet ve izle",
  "Scan metrikleri ve sistem sağlığı",
  "Token denetimi ve revoke",
  "Plan / fiyat düzenleme",
  "Ödeme ve ihlal raporları",
];

const customerFeatures = [
  "Domain ve token yönetimi",
  "Scan detayları ve ihlal listesi",
  "AI fix onaylama akışı",
  "Billing ve plan upgrade",
  "Webhook yönetimi",
];

export default function GirisPage() {
  return (
    <>
      <WcagtrNav />
      <main id="main-content" tabIndex={-1} className="min-h-screen pt-24 pb-16 px-6">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 border border-[#FF6B35]/40 bg-[#FF6B35]/10 px-4 py-1.5 mb-6">
              <Shield className="h-3 w-3 text-[#FF6B35]" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold text-[#FF6B35] tracking-widest uppercase">
                Panel Girişleri
              </span>
            </div>
            <h1 className="font-mono text-3xl md:text-5xl font-bold text-[#EFEFD0] mb-4">
              Hangi Panele Giriş Yapacaksınız?
            </h1>
            <p className="font-mono text-sm text-[#EFEFD0]/50 max-w-xl mx-auto">
              Rolünüze göre uygun paneli seçin. Her iki panel de aynı backend
              API'ye bağlı çalışır.
            </p>
          </header>

          {/* Panel cards */}
          <div className="grid gap-6 md:grid-cols-2" role="list" aria-label="Panel seçenekleri">
            {/* Admin */}
            <article
              role="listitem"
              className="relative glass-panel p-8 flex flex-col overflow-hidden group hover:border-[rgba(255,107,53,0.4)] transition-colors"
            >
              <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF6B35]/50 to-transparent" />

              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center bg-[#FF6B35]">
                  <LayoutDashboard className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs text-[#FF6B35] uppercase tracking-wider">Yönetici</p>
                  <h2 className="font-mono text-xl font-bold text-[#EFEFD0]">Admin Paneli</h2>
                </div>
              </div>

              <p className="font-mono text-sm text-[#EFEFD0]/55 leading-relaxed mb-6">
                Platform yöneticileri için. Müşteri yönetimi, metrik izleme,
                fiyatlandırma ve sistem sağlığı.
              </p>

              <ul className="space-y-2.5 mb-8 flex-1" aria-label="Admin panel özellikleri">
                {adminFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-[#FF6B35] flex-shrink-0" aria-hidden="true" />
                    <span className="font-mono text-sm text-[#EFEFD0]/65">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={ADMIN_PANEL_URL}
                className="group/btn inline-flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e85a28] text-white font-mono font-semibold text-sm px-6 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
                aria-label="Admin paneline giriş yap"
              >
                Admin Girişi
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
              </a>
            </article>

            {/* Customer */}
            <article
              role="listitem"
              className="relative glass-card p-8 flex flex-col overflow-hidden border border-white/13 group hover:border-white/25 transition-colors"
            >
              <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center bg-[#1A659E]">
                  <Users className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs text-[#F7C59F] uppercase tracking-wider">Müşteri</p>
                  <h2 className="font-mono text-xl font-bold text-[#EFEFD0]">Müşteri Paneli</h2>
                </div>
              </div>

              <p className="font-mono text-sm text-[#EFEFD0]/55 leading-relaxed mb-6">
                Platform müşterileri için. Domain ve scan yönetimi, fix
                onaylama, billing ve webhook izleme.
              </p>

              <ul className="space-y-2.5 mb-8 flex-1" aria-label="Müşteri panel özellikleri">
                {customerFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-[#F7C59F] flex-shrink-0" aria-hidden="true" />
                    <span className="font-mono text-sm text-[#EFEFD0]/65">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={CUSTOMER_PANEL_URL}
                  className="group/btn flex-1 inline-flex items-center justify-center gap-2 border border-white/25 hover:border-[#F7C59F]/60 text-[#EFEFD0]/80 hover:text-[#EFEFD0] font-mono font-semibold text-sm px-6 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
                  aria-label="Müşteri paneline giriş yap"
                >
                  Giriş Yap
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
                </a>
                <a
                  href={CUSTOMER_PANEL_URL}
                  className="inline-flex items-center justify-center font-mono text-sm text-[#F7C59F] hover:text-[#FF6B35] transition-colors px-4 py-3.5 border border-[#F7C59F]/20 hover:border-[#FF6B35]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
                  aria-label="Ücretsiz müşteri hesabı oluştur"
                >
                  Kayıt Ol
                </a>
              </div>
            </article>
          </div>
        </div>
      </main>
      <WcagtrFooter />
    </>
  );
}
