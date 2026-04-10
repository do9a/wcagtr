import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard, ScanSearch, Shield, Users, Wrench } from 'lucide-react';

export function Features() {
  return (
    <section id="features" className="relative z-10 bg-transparent py-8 md:py-14">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-border/80 bg-card/85 backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-full border border-border">
                <ScanSearch className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">AI Destekli WCAG Tarama</h2>
              <p className="text-sm text-muted-foreground">
                Gemini destekli analiz ile erişilebilirlik ihlallerini otomatik
                yakalar.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/85 backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-full border border-border">
                <Wrench className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">Otomatik Patch Delivery</h2>
              <p className="text-sm text-muted-foreground">
                Onaylanan düzeltmeler patch-agent ile güvenli biçimde canlı ortama
                taşınır.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/85 backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-full border border-border">
                <Shield className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">Token Tabanlı Güvenlik</h2>
              <p className="text-sm text-muted-foreground">
                Domain doğrulamalı token sistemi ile widget erişimi güvenli hale
                gelir.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/85 backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-full border border-border">
                <LayoutDashboard className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">Admin & Müşteri Panelleri</h2>
              <p className="text-sm text-muted-foreground">
                Tarama, fix ve rapor süreçlerini tek noktadan yönetin.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <div className="flex size-9 items-center justify-center rounded-full border border-border">
                  <Users className="size-4" aria-hidden="true" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ekip içi erişim ve rol bazlı görünüm desteği.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
