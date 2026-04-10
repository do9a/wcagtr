"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, Users, ChevronRight } from "lucide-react";
import { ADMIN_PANEL_URL, CUSTOMER_PANEL_URL } from "@/lib/platform-links";

const adminFeatures = [
  "Tüm müşterileri yönet, askıya al/aktifleştir",
  "Scan metrikleri ve sistem sağlığı izle",
  "Token denetimi ve revoke",
  "Plan fiyat ve özellik düzenleme",
  "Müşteri detay ve ödeme geçmişi",
];

const customerFeatures = [
  "Domain ve token yönetimi",
  "Scan detayları ve ihlal listesi",
  "AI fix önerilerini onayla/reddet",
  "Billing ve plan upgrade",
  "Webhook entegrasyonu",
];

export function WcagtrPanelCta() {
  return (
    <section
      id="platform"
      aria-labelledby="platform-title"
      className="relative py-24 px-6 border-t border-white/8"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-xs font-semibold text-[#FF6B35] tracking-widest uppercase mb-4"
          >
            Panel Girişleri
          </motion.p>
          <motion.h2
            id="platform-title"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-mono text-3xl md:text-4xl font-bold text-[#EFEFD0]"
          >
            İki Panel, Tek Platform
          </motion.h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Admin Panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring", stiffness: 80 }}
          >
            <article className="relative glass-panel p-8 h-full flex flex-col overflow-hidden">
              {/* Top shimmer */}
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF6B35]/40 to-transparent"
              />

              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center bg-[#FF6B35]">
                  <LayoutDashboard className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs text-[#FF6B35] uppercase tracking-wider">Admin</p>
                  <h3 className="font-mono text-lg font-bold text-[#EFEFD0]">Yönetim Paneli</h3>
                </div>
              </div>

              <p className="font-mono text-sm text-[#EFEFD0]/55 mb-6 leading-relaxed">
                Platform'un tüm müşteri ve işlem akışını yönetin. Sistem
                sağlığını izleyin, fiyatları güncelleyin.
              </p>

              <ul className="space-y-2.5 mb-8 flex-1" aria-label="Admin panel özellikleri">
                {adminFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <ChevronRight
                      className="h-3.5 w-3.5 mt-0.5 text-[#FF6B35] flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-sm text-[#EFEFD0]/65">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={ADMIN_PANEL_URL}
                className="group inline-flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e85a28] text-white font-mono font-semibold text-sm px-6 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
                aria-label="Admin paneline giriş yap"
              >
                Admin Girişi
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </article>
          </motion.div>

          {/* Customer Panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring", stiffness: 80, delay: 0.1 }}
          >
            <article className="relative glass-card p-8 h-full flex flex-col overflow-hidden border border-white/13">
              {/* Top shimmer */}
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />

              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center bg-[#1A659E]">
                  <Users className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-xs text-[#F7C59F] uppercase tracking-wider">Müşteri</p>
                  <h3 className="font-mono text-lg font-bold text-[#EFEFD0]">Müşteri Paneli</h3>
                </div>
              </div>

              <p className="font-mono text-sm text-[#EFEFD0]/55 mb-6 leading-relaxed">
                Domain'lerinizi yönetin, tarama sonuçlarını inceleyin ve
                AI fix önerilerini onaylayın.
              </p>

              <ul className="space-y-2.5 mb-8 flex-1" aria-label="Müşteri panel özellikleri">
                {customerFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <ChevronRight
                      className="h-3.5 w-3.5 mt-0.5 text-[#F7C59F] flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-sm text-[#EFEFD0]/65">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <a
                  href={CUSTOMER_PANEL_URL}
                  className="group flex-1 inline-flex items-center justify-center gap-2 border border-white/25 hover:border-[#F7C59F]/60 text-[#EFEFD0]/80 hover:text-[#EFEFD0] font-mono font-semibold text-sm px-6 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
                  aria-label="Müşteri paneline giriş yap"
                >
                  Giriş Yap
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </a>
                <a
                  href={CUSTOMER_PANEL_URL}
                  className="inline-flex items-center justify-center font-mono text-sm text-[#F7C59F] hover:text-[#FF6B35] transition-colors px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
                  aria-label="Yeni müşteri hesabı oluştur"
                >
                  Kayıt Ol
                </a>
              </div>
            </article>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
