import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-ui-sans",
  subsets: ["latin", "latin-ext"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-ui-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "WCAGTR — Erişilebilirlik Platformu",
  description:
    "WCAG 2.2 ve Türkiye kamu erişilebilirlik standardına uyum için AI destekli tarama, otomatik düzeltme ve izleme platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main-content" className="skip-link">
          Ana içeriğe geç
        </a>
        {children}
      </body>
    </html>
  );
}
