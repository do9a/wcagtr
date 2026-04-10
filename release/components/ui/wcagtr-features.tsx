"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import {
  ScanSearch,
  Wrench,
  Shield,
  LayoutDashboard,
  Webhook,
  CreditCard,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: ScanSearch,
    title: "AI Destekli WCAG Tarama",
    description:
      "Gemini 2.5 Flash API ile DOM snapshot analizi. 122 soruluk Türkiye kontrol listesini ve WCAG 2.2 AA kriterlerini otomatik denetler.",
    tag: "AI / Tarama",
    href: "/#features",
  },
  {
    icon: Wrench,
    title: "Otomatik Patch Delivery",
    description:
      "HMAC-SHA256 imzalı patch'ler pull-based agent ile güvenle uygulanır. Her dosya için 5 yedek tutulur, anlık rollback mümkün.",
    tag: "Güvenlik / Otomasyon",
    href: "/#features",
  },
  {
    icon: Shield,
    title: "RS256 Token Güvenliği",
    description:
      "Domain doğrulamalı widget token sistemi. Public key client-side gömülü, imza doğrulaması edge'de yapılır. SRI hash ile CDN güvenliği.",
    tag: "Token / CDN",
    href: "/#features",
  },
  {
    icon: LayoutDashboard,
    title: "Admin & Müşteri Panelleri",
    description:
      "Admin paneli: müşteri yönetimi, suspend/aktif, tarama metrikleri, fiyat düzenleme. Müşteri paneli: scan detay, fix approval, domain izleme.",
    tag: "Dashboard",
    href: "/giris",
  },
  {
    icon: Webhook,
    title: "Webhook Bildirimleri",
    description:
      "scan.completed, fix.approved, billing.plan_changed eventleri. HMAC imzalı teslimat, exponential backoff ile 3 yeniden deneme, teslimat logu.",
    tag: "Entegrasyon",
    href: "/#features",
  },
  {
    icon: CreditCard,
    title: "Esnek Billing Sistemi",
    description:
      "Trial → Starter (₺299) → Professional (₺799) → Enterprise (₺1999). Mock, Stripe ve iyzico ödeme sağlayıcı desteği. DB'den dinamik plan yönetimi.",
    tag: "Ödeme",
    href: "/#features",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.5, type: "spring", stiffness: 80 }}
      className="group relative flex flex-col glass-card hover:glass-card-active transition-all duration-300 p-6 overflow-hidden"
    >
      {/* Top shimmer */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex h-10 w-10 items-center justify-center bg-[#FF6B35]/10 border border-[#FF6B35]/20 group-hover:bg-[#FF6B35]/20 transition-colors">
          <feature.icon className="h-5 w-5 text-[#FF6B35]" aria-hidden="true" />
        </div>
        <span className="font-mono text-xs text-[#EFEFD0]/40 border border-white/10 px-2 py-0.5">
          {feature.tag}
        </span>
      </div>

      <h3 className="font-mono text-base font-bold text-[#EFEFD0] mb-3">
        {feature.title}
      </h3>
      <p className="font-mono text-sm text-[#EFEFD0]/55 leading-relaxed flex-1">
        {feature.description}
      </p>

      <a
        href={feature.href}
        className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs text-[#FF6B35] hover:text-[#F7C59F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
        aria-label={`${feature.title} hakkında daha fazla bilgi`}
      >
        Detaylar
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </a>
    </motion.article>
  );
}

export function WcagtrFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="relative py-24 px-6"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="font-mono text-xs font-semibold text-[#FF6B35] tracking-widest uppercase mb-4"
          >
            Platform Modülleri
          </motion.p>
          <motion.h2
            id="features-title"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-mono text-3xl md:text-4xl font-bold text-[#EFEFD0] mb-4"
          >
            Tüm Özellikler Tek Pakette
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="font-mono text-sm text-[#EFEFD0]/50 max-w-2xl mx-auto"
          >
            Widget entegrasyonundan AI taramaya, patch delivery'den billing'e kadar
            erişilebilirlik sürecinin tamamı tek platformda.
          </motion.p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
