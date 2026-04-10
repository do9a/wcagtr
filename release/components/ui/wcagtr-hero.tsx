"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, ScanSearch, Zap, Shield, Globe } from "lucide-react";
import { CUSTOMER_PANEL_URL } from "@/lib/platform-links";

const titleWords = ["WCAG", "UYUMLULUK", "İÇİN", "YAPAY ZEKA", "DESTEKLİ", "PLATFORM"];

const labels = [
  { icon: ScanSearch, label: "AI Destekli WCAG 2.2 Tarama" },
  { icon: Zap, label: "Otomatik Patch Delivery" },
  { icon: Shield, label: "Türkiye Kamu Standardı" },
];

const stats = [
  { value: "122", label: "TR Kontrol Kriteri" },
  { value: "2.2", label: "WCAG Sürümü" },
  { value: "6", label: "Platform Modülü" },
  { value: "7/24", label: "Sürekli İzleme" },
];

export function WcagtrHero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden"
    >
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Orange glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(255,107,53,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center gap-2 border border-[#FF6B35]/40 bg-[#FF6B35]/10 px-4 py-1.5"
        >
          <Globe className="h-3 w-3 text-[#FF6B35]" aria-hidden="true" />
          <span className="font-mono text-xs font-semibold text-[#FF6B35] tracking-widest uppercase">
            Türkiye Kamu Erişilebilirlik Platformu
          </span>
        </motion.div>

        {/* Animated title */}
        <h1
          id="hero-title"
          className="font-mono text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8"
        >
          {titleWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, filter: "blur(8px)", y: 24 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className={`inline-block mx-2 md:mx-3 ${
                word === "YAPAY ZEKA" ? "text-[#FF6B35]" : "text-[#EFEFD0]"
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="font-mono text-base md:text-lg text-[#EFEFD0]/60 max-w-2xl mb-10"
        >
          Web sitenizi WCAG 2.2 ve 122 soruluk Türkiye kamu erişilebilirlik
          kontrol listesine göre otomatik tarayın, AI ile düzeltin ve
          izleyin.
        </motion.p>

        {/* Feature labels */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-6 mb-12"
          role="list"
          aria-label="Platform özellikleri"
        >
          {labels.map((item, i) => (
            <motion.div
              key={item.label}
              role="listitem"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.1, duration: 0.4 }}
              className="flex items-center gap-2"
            >
              <item.icon className="h-4 w-4 text-[#FF6B35]" aria-hidden="true" />
              <span className="font-mono text-sm text-[#EFEFD0]/70">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5, type: "spring", stiffness: 100 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a
            href={CUSTOMER_PANEL_URL}
            className="group inline-flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e85a28] text-white font-mono font-semibold text-sm px-8 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
            aria-label="Ücretsiz başla, müşteri paneline git"
          >
            Ücretsiz Başla
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </a>
          <a
            href="/#features"
            className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-[#FF6B35]/60 text-[#EFEFD0]/80 hover:text-[#EFEFD0] font-mono font-semibold text-sm px-8 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
          >
            Özellikleri Gör
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.5 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10"
          role="list"
          aria-label="Platform istatistikleri"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              role="listitem"
              className="flex flex-col items-center justify-center bg-[#00111f] px-8 py-6"
            >
              <span className="font-mono text-3xl font-bold text-[#FF6B35]">{stat.value}</span>
              <span className="font-mono text-xs text-[#EFEFD0]/50 mt-1 text-center">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
