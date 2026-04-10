"use client";

import { DropdownNavigation } from "@/components/ui/dorpdown-navigation";
import {
  BookOpen,
  Box,
  Cpu,
  Eye,
  FileText,
  Globe,
  Newspaper,
  Palette,
  Rocket,
  Search,
  Shield,
} from "lucide-react";

const NAV_ITEMS = [
  {
    id: 1,
    label: "Ürünler",
    subMenus: [
      {
        title: "Platform",
        items: [
          {
            label: "WCAG Tarama",
            description: "İhlalleri otomatik tespit edin",
            icon: Search,
            href: "#features",
          },
          {
            label: "AI Öneriler",
            description: "Akıllı düzeltme önerileri üretin",
            icon: Cpu,
            href: "#features",
          },
        ],
      },
      {
        title: "Altyapı",
        items: [
          {
            label: "Token Güvenliği",
            description: "Domain bazlı güvenli erişim",
            icon: Shield,
            href: "#features",
          },
          {
            label: "İzlenebilirlik",
            description: "Detaylı panel ve metrik takibi",
            icon: Eye,
            href: "#features",
          },
          {
            label: "Patch Delivery",
            description: "Onaylı düzeltmeleri canlıya taşıyın",
            icon: Rocket,
            href: "#features",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Çözümler",
    subMenus: [
      {
        title: "Kullanım Alanları",
        items: [
          {
            label: "Kurumsal Siteler",
            description: "WCAG uyumunu sürdürülebilir hale getirin",
            icon: Globe,
            href: "#features",
          },
          {
            label: "Web Uygulamaları",
            description: "Ürün ekipleri için hızlı entegrasyon",
            icon: Box,
            href: "#features",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Kaynaklar",
    subMenus: [
      {
        title: "Doküman",
        items: [
          {
            label: "Rehberler",
            description: "Adım adım entegrasyon dökümanları",
            icon: BookOpen,
            href: "#contact",
          },
          {
            label: "Blog",
            description: "Güncellemeler ve yeni özellikler",
            icon: Newspaper,
            href: "#contact",
          },
          {
            label: "Şablonlar",
            description: "Hazır uygulama başlangıç yapıları",
            icon: FileText,
            href: "#contact",
          },
        ],
      },
    ],
  },
  { id: 4, label: "Platform", link: "/platform" },
  { id: 5, label: "Fiyatlandırma", link: "#features" },
  { id: 6, label: "İletişim", link: "#contact" },
  { id: 7, label: "Tema", link: "#", subMenus: [{ title: "Görünüm", items: [{ label: "Modern UI", description: "Güncel tasarım dili", icon: Palette, href: "#" }] }] },
];

export function DropdownNavigationDemo() {
  return <DropdownNavigation navItems={NAV_ITEMS} />;
}
