"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Code2, Sparkles, CheckCircle } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Code2,
    title: "Widget'ı Sitenize Ekleyin",
    description:
      "Tek satır script ile widget'ı sitenize entegre edin. Token üretip domain'inize bağlayın. CDN'den servis edilir, SRI hash ile güvenli.",
    code: `<script src="https://cdn.wcagtr.app/widget.js"\n  data-token="eyJ..." async></script>`,
  },
  {
    step: "02",
    icon: Sparkles,
    title: "AI Tarama Başlar",
    description:
      "Widget DOM'u analiz eder, ihlalleri tespit eder ve Gemini 2.5 Flash ile fix önerileri üretir. Sonuçlar panele iletilir.",
    code: `// Otomatik tespit:\n// • Kontrast hataları\n// • Eksik alt metinler\n// • Form etiket sorunları\n// • 119+ TR kriter`,
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Onaylayin & Uygulayın",
    description:
      "Müşteri panelinden fix'leri inceleyin ve onaylayın. Patch agent HMAC imzalı düzeltmeleri güvenle uygular, rollback her zaman hazır.",
    code: `// Patch yaşam döngüsü:\n// pending → approved\n// → patch-agent apply\n// → applied (rollback ✓)`,
  },
];

export function WcagtrHow() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
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
            Nasıl Çalışır
          </motion.p>
          <motion.h2
            id="how-title"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-mono text-3xl md:text-4xl font-bold text-[#EFEFD0]"
          >
            3 Adımda Erişilebilir Web
          </motion.h2>
        </div>

        {/* Steps */}
        <div className="grid gap-6 md:grid-cols-3" role="list" aria-label="Kullanım adımları">
          {steps.map((step, i) => {
            const ref = React.useRef(null);
            const isInView = useInView(ref, { once: true, margin: "-60px" });
            return (
              <motion.div
                key={step.step}
                ref={ref}
                role="listitem"
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.5, type: "spring", stiffness: 80 }}
                className="relative glass-card p-6 overflow-hidden"
              >
                {/* Step number background */}
                <span
                  aria-hidden="true"
                  className="absolute top-4 right-4 font-mono text-6xl font-bold text-white/5 select-none leading-none"
                >
                  {step.step}
                </span>

                <div className="flex h-10 w-10 items-center justify-center bg-[#FF6B35]/10 border border-[#FF6B35]/20 mb-4">
                  <step.icon className="h-5 w-5 text-[#FF6B35]" aria-hidden="true" />
                </div>

                <p className="font-mono text-xs text-[#FF6B35] mb-2">Adım {step.step}</p>
                <h3 className="font-mono text-base font-bold text-[#EFEFD0] mb-3">
                  {step.title}
                </h3>
                <p className="font-mono text-sm text-[#EFEFD0]/55 leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Code snippet */}
                <pre
                  aria-label={`${step.title} kod örneği`}
                  className="text-xs font-mono bg-black/30 border border-white/8 p-3 text-[#F7C59F]/70 overflow-x-auto rounded-sm whitespace-pre-wrap"
                >
                  {step.code}
                </pre>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
