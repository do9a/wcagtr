import { WcagtrNav } from "@/components/ui/wcagtr-nav";
import { WcagtrFooter } from "@/components/ui/wcagtr-footer";
import {
  Shield,
  ScanSearch,
  Wrench,
  LayoutDashboard,
  Webhook,
  CreditCard,
  CheckCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import {
  ADMIN_PANEL_URL,
  BACKEND_BASE_URL,
  CUSTOMER_PANEL_URL,
} from "@/lib/platform-links";

const featureGroups = [
  {
    icon: ScanSearch,
    title: "Widget + AI Tarama",
    color: "text-[#FF6B35]",
    bg: "bg-[#FF6B35]/10",
    border: "border-[#FF6B35]/20",
    items: [
      "Token doğrulamalı widget entegrasyonu (RS256)",
      "WCAG ihlali tespiti ve DOM snapshot analizi",
      "Gemini 2.5 Flash destekli fix önerileri + fallback",
    ],
  },
  {
    icon: Wrench,
    title: "Patch Delivery",
    color: "text-[#F7C59F]",
    bg: "bg-[#F7C59F]/10",
    border: "border-[#F7C59F]/20",
    items: [
      "Patch request / pending / applied yaşam döngüsü",
      "HMAC-SHA256 imzalı patch doğrulama",
      "Patch-agent rollback ve 5'li yedekleme",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Monitoring Panelleri",
    color: "text-[#1A659E]",
    bg: "bg-[#1A659E]/10",
    border: "border-[#1A659E]/30",
    items: [
      "Admin panel: müşteri, token, scan ve fiyat yönetimi",
      "Customer panel: scan detay, fix approval, domains",
      "Webhook teslimat geçmişi ve test gönderimi",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing + Ödeme",
    color: "text-[#FF6B35]",
    bg: "bg-[#FF6B35]/10",
    border: "border-[#FF6B35]/20",
    items: [
      "Plan yönetimi ve upgrade akışı",
      "Mock / Stripe / iyzico checkout ve callback",
      "Ödeme transaction, expiry ve refund işleme",
    ],
  },
  {
    icon: Shield,
    title: "Güvenlik Katmanı",
    color: "text-[#F7C59F]",
    bg: "bg-[#F7C59F]/10",
    border: "border-[#F7C59F]/20",
    items: [
      "Yetki kontrolü ve plan limit enforcement",
      "Widget token revocation/expiry doğrulaması",
      "Webhook URL güvenliği ve SSRF koruması",
    ],
  },
  {
    icon: Webhook,
    title: "Webhook & Entegrasyon",
    color: "text-[#1A659E]",
    bg: "bg-[#1A659E]/10",
    border: "border-[#1A659E]/30",
    items: [
      "scan.completed / fix.approved / billing.plan_changed",
      "HMAC imzalı teslimat, exponential backoff retry",
      "CDN widget build + SRI artefaktları",
    ],
  },
];

const quickLinks = [
  { label: "Admin Panel", href: ADMIN_PANEL_URL, primary: true, external: true },
  { label: "Müşteri Panel", href: CUSTOMER_PANEL_URL, primary: false, external: true },
  { label: "API Health", href: `${BACKEND_BASE_URL}/health`, external: true },
  { label: "Widget CDN", href: `${BACKEND_BASE_URL}/cdn/widget.js`, external: true },
];

export const metadata = {
  title: "Platform Özeti — WCAGTR",
  description: "WCAGTR platform modüllerinin tam özeti.",
};

export default function PlatformPage() {
  return (
    <>
      <WcagtrNav />
      <main id="main-content" tabIndex={-1} className="min-h-screen pt-24 pb-16 px-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <header className="mb-16">
            <div className="inline-flex items-center gap-2 border border-[#FF6B35]/40 bg-[#FF6B35]/10 px-4 py-1.5 mb-6">
              <Shield className="h-3 w-3 text-[#FF6B35]" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold text-[#FF6B35] tracking-widest uppercase">
                WCAGTR Platform
              </span>
            </div>
            <h1 className="font-mono text-3xl md:text-5xl font-bold text-[#EFEFD0] mb-4 max-w-3xl">
              Canlı Ortam İçin Tüm Modüller Tek Yerde
            </h1>
            <p className="font-mono text-sm text-[#EFEFD0]/50 max-w-2xl leading-relaxed">
              Bu sayfa, platformda bulunan tüm çekirdek yetenekleri özetler:
              widget, AI scan, patch delivery, webhook, billing ve panel yönetimi.
            </p>
          </header>

          {/* Feature grid */}
          <section aria-labelledby="features-heading">
            <h2 id="features-heading" className="sr-only">Platform Özellikleri</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-12">
              {featureGroups.map((group) => (
                <article
                  key={group.title}
                  className="glass-card border border-white/13 p-6 overflow-hidden relative"
                >
                  <div
                    aria-hidden="true"
                    className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  />
                  <div className={`flex h-9 w-9 items-center justify-center ${group.bg} border ${group.border} mb-4`}>
                    <group.icon className={`h-4.5 w-4.5 ${group.color}`} aria-hidden="true" />
                  </div>
                  <h3 className="font-mono text-sm font-bold text-[#EFEFD0] mb-3">
                    {group.title}
                  </h3>
                  <ul className="space-y-2" aria-label={`${group.title} özellikleri`}>
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle
                          className={`h-3.5 w-3.5 mt-0.5 ${group.color} flex-shrink-0`}
                          aria-hidden="true"
                        />
                        <span className="font-mono text-xs text-[#EFEFD0]/55 leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Quick access */}
          <section aria-labelledby="quick-access-heading" className="glass-panel p-8">
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF6B35]/30 to-transparent"
            />
            <h2 id="quick-access-heading" className="font-mono text-lg font-bold text-[#EFEFD0] mb-6">
              Hızlı Erişim
            </h2>
            <div className="flex flex-wrap gap-3">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  aria-label={link.external ? `${link.label} (yeni sekmede açılır)` : link.label}
                  className={`inline-flex items-center gap-2 font-mono text-sm font-semibold px-5 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f] ${
                    link.primary
                      ? "bg-[#FF6B35] hover:bg-[#e85a28] text-white"
                      : "border border-white/20 hover:border-white/40 text-[#EFEFD0]/70 hover:text-[#EFEFD0]"
                  }`}
                >
                  {link.label}
                  {link.external ? (
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
      <WcagtrFooter />
    </>
  );
}
