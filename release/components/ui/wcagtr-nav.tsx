"use client";

import * as React from "react";
import { Menu, Shield, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ADMIN_PANEL_URL, CUSTOMER_PANEL_URL } from "@/lib/platform-links";

const navItems = [
  { label: "Özellikler", href: "/#features" },
  { label: "Platform", href: "/#platform" },
  { label: "Nasıl Çalışır", href: "/#how-it-works" },
];

export function WcagtrNav({ className }: { className?: string }) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      role="banner"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 backdrop-blur-xl bg-[#00111f]/80"
          : "bg-transparent",
        className,
      )}
    >
      <nav
        role="navigation"
        aria-label="Ana navigasyon"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
          aria-label="WCAGTR Ana Sayfaya Git"
        >
          <div className="flex h-8 w-8 items-center justify-center bg-[#FF6B35]" aria-hidden="true">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-mono text-lg font-bold tracking-tight text-[#EFEFD0]">
            WCAG<span className="text-[#FF6B35]">TR</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0" role="list">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="font-mono text-sm text-[#EFEFD0]/70 hover:text-[#FF6B35] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm px-1"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/giris"
            className="font-mono text-sm text-[#EFEFD0]/70 hover:text-[#EFEFD0] transition-colors px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
          >
            Giriş Yap
          </Link>
          <a
            href={CUSTOMER_PANEL_URL}
            className="font-mono text-sm font-semibold bg-[#FF6B35] hover:bg-[#e85a28] text-white px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00111f]"
            aria-label="Ücretsiz başla - müşteri paneline git"
          >
            Ücretsiz Başla
          </a>
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="md:hidden flex h-10 w-10 items-center justify-center text-[#EFEFD0]/80 hover:text-[#EFEFD0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFEFD0] rounded-sm"
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-[#001830] border-l border-white/10 p-0"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex items-center gap-2 mb-8">
                <div className="flex h-8 w-8 items-center justify-center bg-[#FF6B35]" aria-hidden="true">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-mono text-lg font-bold text-[#EFEFD0]">
                  WCAG<span className="text-[#FF6B35]">TR</span>
                </span>
              </div>
              <nav aria-label="Mobil navigasyon">
                <ul className="flex flex-col gap-2 list-none m-0 p-0" role="list">
                  {navItems.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="block font-mono text-base text-[#EFEFD0]/80 hover:text-[#FF6B35] transition-colors py-3 border-b border-white/5"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="flex flex-col gap-3 mt-auto">
                <a
                  href={CUSTOMER_PANEL_URL}
                  className="font-mono text-sm text-center text-[#EFEFD0]/70 border border-white/20 px-4 py-3 hover:border-white/40 transition-colors"
                >
                  Giriş Yap
                </a>
                <a
                  href={CUSTOMER_PANEL_URL}
                  className="font-mono text-sm text-center font-semibold bg-[#FF6B35] hover:bg-[#e85a28] text-white px-4 py-3 transition-colors"
                >
                  Ücretsiz Başla
                </a>
                <a
                  href={ADMIN_PANEL_URL}
                  className="font-mono text-xs text-center text-[#EFEFD0]/40 hover:text-[#EFEFD0]/60 transition-colors py-2"
                >
                  Admin Girişi
                </a>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
