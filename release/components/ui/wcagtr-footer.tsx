import * as React from "react";
import { Shield } from "lucide-react";
import {
  ADMIN_PANEL_URL,
  BACKEND_BASE_URL,
  CUSTOMER_PANEL_URL,
} from "@/lib/platform-links";

const links = {
  Platform: [
    { label: "Özellikler", href: "/#features" },
    { label: "Nasıl Çalışır", href: "/#how-it-works" },
    { label: "Fiyatlandırma", href: "/giris/musteri?tab=register" },
  ],
  Paneller: [
    { label: "Admin Panel", href: ADMIN_PANEL_URL },
    { label: "Müşteri Panel", href: CUSTOMER_PANEL_URL },
    { label: "Panel Seçimi", href: "/giris" },
  ],
  Teknik: [
    { label: "API Health", href: `${BACKEND_BASE_URL}/health` },
    { label: "Widget CDN", href: `${BACKEND_BASE_URL}/cdn/widget.js` },
    { label: "Platform Özeti", href: "/platform" },
  ],
};

export function WcagtrFooter() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-white/10 mt-auto"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-16">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <a
              href="/"
              className="flex items-center gap-2 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm w-fit"
              aria-label="WCAGTR Ana Sayfa"
            >
              <div className="flex h-8 w-8 items-center justify-center bg-[#FF6B35]" aria-hidden="true">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-mono text-lg font-bold text-[#EFEFD0]">
                WCAG<span className="text-[#FF6B35]">TR</span>
              </span>
            </a>
            <p className="font-mono text-sm text-[#EFEFD0]/45 leading-relaxed max-w-xs">
              Türkiye kamu erişilebilirlik standardı ve WCAG 2.2 uyumu için
              AI destekli platform.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <nav key={category} aria-label={`${category} bağlantıları`}>
              <h2 className="font-mono text-xs font-semibold text-[#EFEFD0]/30 uppercase tracking-widest mb-4">
                {category}
              </h2>
              <ul className="space-y-2.5 list-none m-0 p-0" role="list">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="font-mono text-sm text-[#EFEFD0]/55 hover:text-[#FF6B35] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-[#EFEFD0]/30">
            © 2026 WCAGTR Platform. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs text-[#EFEFD0]/25">WCAG 2.2 AA</span>
            <span className="font-mono text-xs text-[#EFEFD0]/25">|</span>
            <span className="font-mono text-xs text-[#EFEFD0]/25">TR Standart v2.2.20.00</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
