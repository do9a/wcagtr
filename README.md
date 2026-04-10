# WCAGTR Platform

**Türkiye Cumhuriyeti Erişilebilirlik Standartları Otomasyonu**  
WCAG 2.2 + TR Kamu 122 Soru Listesi Uyumluluk Platformu

## 🎯 Platform Özellikleri

- ✅ **Otomatik WCAG Tarama** - Gemini AI ile akıllı analiz
- 🔧 **Otomatik Düzeltme** - CSS/JS patch delivery
- ♿ **Ziyaretçi Erişilebilirlik Butonu** - Metin/kontrast/link/hareket/font ayar paneli
- 📊 **Müşteri & Admin Panelleri** - Vanilla JS SPAs
- 🔒 **Token-Based Security** - JWT + domain validation
- 🇹🇷 **KVKK Uyumlu** - Türkiye veri merkezli
- 📦 **CDN Widget** - Embeddable accessibility fixer

## 🏗️ Proje Yapısı

```
wcagtr/
├── backend/           # Node.js Express API + PostgreSQL
├── widget/            # Embeddable widget (CDN'de yayınlanacak)
├── admin-panel/       # Admin SPA (vanilla JS)
├── customer-panel/    # Customer SPA (vanilla JS)
├── patch-agent/       # Server-side patch agent
├── docker/            # Docker Compose setup
└── shared/            # Shared types & utilities
```

## 🚀 Hızlı Başlangıç

### 1. Backend + Database

```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenle

# Migration (PostgreSQL gerekli)
npm run migrate

# Server başlat
npm run dev
```

**Backend:** http://localhost:3000

### 2. Widget Demo

```bash
cd widget/demo
python3 -m http.server 8080
```

**Demo:** http://localhost:8080

### 2.1 Widget Production Build

```bash
cd widget
npm install
WIDGET_JWT_PUBLIC_KEY_PEM="$(cat /path/to/public.pem)" npm run build
```

Build çıktısı: `widget/dist/widget.js` + `widget/dist/widget.sri.json`

### 3. Entegrasyon Testi

```bash
./test-widget-integration.sh
```

Tüm API endpoint'lerini test eder ve widget token oluşturur.

## 🐳 Fedora Production Dağıtımı (2 Ayrı Docker Stack)

Backend ve web katmanını birbirinden bağımsız çalıştırın:

1. **Backend stack (wcagtr.app / api.wcagtr.app, ayrı sunucu önerilir)**  
   PostgreSQL + Backend API
2. **Web stack (wcagtr.com + admin/customer subdomainleri, ayrı sunucu önerilir)**  
   Release (Next.js) + web gateway + admin/customer static paneller

### 1) Backend stack

```bash
cd docker
cp .env.backend.example .env.backend
# .env.backend dosyasını üretim değerleriyle doldurun
docker compose --env-file .env.backend -f docker-compose.backend.yml up -d --build
```

### 2) Web stack

```bash
cd docker
cp .env.web.example .env.web
docker compose --env-file .env.web -f docker-compose.web.yml up -d --build
```

### DNS Önerisi

- `wcagtr.com` + `www.wcagtr.com` → release
- `admin.wcagtr.com` → admin panel
- `customer.wcagtr.com` (veya `app.wcagtr.com`) → customer panel
- `api.wcagtr.app` (veya `wcagtr.app`) → backend API

## 📊 Hızlı Test

```bash
# Health check
curl http://localhost:3000/health

# Müşteri kaydı
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","companyName":"Test"}'

# Token oluştur (önce login yapın)
# Detaylı örnekler: WIDGET_INTEGRATION.md
```

## 🔐 İlk Admin Girişi

Migration'lar çalıştırıldığında otomatik admin kullanıcısı oluşturulur:

- **Email:** `admin@wcagtr.com`
- **Password:** `admin123`

⚠️ **ÖNEMLİ:** İlk giriş sonrası şifreyi mutlaka değiştirin!

## 📡 API Endpoints

### Health Check
```bash
GET /health
GET /ready
```

### Authentication
```bash
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/admin/login
```

### Scanner
```bash
POST /api/v1/scan/report         # Tarama sonuçlarını kaydet
POST /api/v1/scan/ai             # AI düzeltme önerileri üret
GET /api/v1/scans                # Müşteri tarama listesi
GET /api/v1/scans/:id            # Müşteri tarama detay + ihlal breakdown
GET /api/v1/scans/:id/fixes      # Taramaya ait fix önerileri
PATCH /api/v1/fixes/:id/approval # Fix onay/red
```

### Tokens
```bash
POST /api/v1/tokens        # Widget token oluştur
GET /api/v1/tokens         # Token listesi
DELETE /api/v1/tokens/:id  # Token iptal et
```
Notlar:
- Token CRUD yalnızca `role=customer` JWT ile erişilebilir.
- Domain oluşturma plan domain limiti ile sınırlandırılır.
- `serverPatchEnabled=true` sadece patch yetkisi olan planlarda kabul edilir.

### Webhooks
```bash
GET /api/v1/webhooks                   # Müşteri webhook listesi
POST /api/v1/webhooks                  # Yeni webhook oluştur
PATCH /api/v1/webhooks/:id             # Webhook güncelle (aktif/pasif, olaylar)
DELETE /api/v1/webhooks/:id            # Webhook sil
POST /api/v1/webhooks/:id/test         # Test webhook gönder
GET /api/v1/webhooks/:id/deliveries    # Son teslimat kayıtları
```

### Payments
```bash
POST /api/v1/payments/webhook/mock     # Mock ödeme webhook callback
POST /api/v1/payments/webhook/stripe   # Stripe webhook callback (imza doğrulamalı)
POST /api/v1/payments/webhook/iyzico   # iyzico callback (token doğrulama + detail sorgu)
POST /api/v1/payments/mock/confirm     # Mock checkout ödeme onayı
GET  /api/v1/payments/mock/checkout    # Mock checkout sayfası
```

Stripe kullanımı için:
- `PAYMENT_PROVIDER=stripe`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` zorunlu
- `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` dönüş URL'leri

iyzico kullanımı için:
- `PAYMENT_PROVIDER=iyzico`
- `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` zorunlu
- `IYZICO_CALLBACK_URL` ödeme dönüş/callback adresi

### Admin Billing
```bash
GET   /api/v1/admin/billing/plans      # Plan + fiyat listesi
PATCH /api/v1/admin/billing/plans/:code # Plan fiyatı/özellik güncelle
GET   /api/v1/admin/customers/:id/detail # Müşteri detay görünümü
```

### Widget CDN & Config
```bash
GET /cdn/widget.js         # Production widget (build varsa), yoksa source fallback
GET /cdn/widget-dev.js     # Development widget
GET /cdn/widget.sri.json   # SRI hash metadata (build sonrası)
GET /api/v1/widget/config  # Widget apiBase/publicKey yapılandırması
```

### Patch Agent (Server-Side)
```bash
cd patch-agent
cp .env.example .env
# PATCH_AGENT_WIDGET_TOKEN + PATCH_AGENT_SIGNING_KEY doldurun
npm start
```

Agent akışı:
- `GET /api/v1/patches/pending` ile patch çeker
- HMAC-SHA256 imza doğrular (`TOKEN_SIGNING_KEY`)
- Hedef dosyaya uygular, yedek alır (son 5 versiyon)
- `POST /api/v1/patches/applied` çağrısında `patchId` + `patchSignature` gönderir

## 🗄️ Veritabanı Şeması

### Temel Tablolar
- `customers` - Platform müşterileri
- `domains` - Müşteri domainleri ve tokenlar
- `scans` - WCAG tarama sonuçları
- `violations` - Tespit edilen ihlaller
- `fixes` - AI önerilen düzeltmeler
- `patches` - Server-side patch delivery
- `webhooks` - Müşteri webhook abonelikleri
- `webhook_deliveries` - Webhook teslimat logları
- `billing_plans` - Dinamik plan/fiyat tanımları
- `payment_transactions` - Ödeme ve checkout kayıtları
- `api_logs` - API kullanım logları
- `admin_users` - Admin kullanıcılar

## 📊 Teknoloji Stack

**Backend:**
- Node.js 20 + Express
- PostgreSQL 16
- JWT Authentication
- Bcrypt password hashing
- Helmet + CORS security

**Frontend:**
- Vanilla JavaScript (no frameworks)
- WCAG 2.2 compliant
- Hash-based SPA routing
- IndexedDB for caching

**Infrastructure:**
- Docker + Docker Compose
- Nginx (SSL termination, CDN)
- Fedora Linux host

**AI:**
- Google Gemini 1.5 Flash (API key varsa gerçek model, yoksa fallback)
- Local model migration planned

## 🛠️ Development

### Backend Server
```bash
cd backend
npm run dev          # Watch mode
npm start            # Production mode
npm run migrate      # Database migrations
```

### Logs
```bash
# Docker logs
docker compose logs -f backend
docker compose logs -f postgres

# Health check
curl http://localhost:3000/health
```

## 🔒 Güvenlik

- JWT token validation (client + server)
- Domain binding enforcement
- Rate limiting (per endpoint)
- Helmet security headers
- Content-Security-Policy (CSP) headers
- CORS configuration
- SQL injection protection (parameterized queries)
- Password hashing (bcrypt, rounds=10)
- KVKK compliant data handling

## 📝 TODO

**Tamamlanan:**
- [x] Database schema (15 tablo)
- [x] Authentication system (JWT, bcrypt)
- [x] Health check endpoints
- [x] Rate limiting
- [x] Request logging
- [x] Scanner API (`/scan/report`)
- [x] Token management (`/tokens` CRUD)
- [x] Widget (dev versiyonu — DOM scanner, IndexedDB, client-fix)
- [x] Admin panel SPA (dashboard, customers, scans, tokens, health, pricing)
- [x] Customer panel SPA (dashboard, scans, tokens, domains, billing, webhooks)

**Eksik / Devam Eden:**
- [x] **Gemini AI entegrasyonu** — `/scan/ai` gerçek model + fallback akışıyla aktif
- [x] **`/patches/request` endpoint** — widget çağrısı backend route'una bağlandı
- [x] **Widget production build** — CDN minification + SRI build pipeline + apiBase normalization
- [x] **Widget public key** — build-time PEM embedding + client-side RS256 verify (dev override opsiyonlu)
- [x] **Fix approval workflow** — customer panel'de AI fix onaylama/reddetme
- [x] **Billing & subscription** — dinamik planlar (`billing_plans`) + `/api/v1/customer/billing*` + customer panel `#/billing`
- [x] **Admin fiyat düzenleme modülü** — admin panel `#/pricing` ile plan/fiyat/özellik güncelleme
- [x] **Ödeme entegrasyonu** — `payment_transactions` + mock checkout + Stripe + iyzico checkout/webhook akışı
- [ ] **Canlı ödeme doğrulaması** — Stripe/iyzico production credential + canlı callback doğrulama eksik
- [x] **Admin customer suspend** — `is_suspended` alanı + backend ve admin panel akışı aktif
- [x] **Admin customer detail** — `#/customer-detail?id=:id` ile müşteri özet + domain + scan + ödeme görünümü
- [x] **Customer scan detail** — `#/scans/:id` ile ihlal breakdown + fix durumları
- [x] **Patch agent (core)** — `patch-agent/agent.js` ile polling + HMAC verify + rollback (5 backup) aktif
- [ ] **Patch agent enterprise modu** — Nginx/Apache reverse-proxy rule apply akışı eksik
- [x] **Webhook notifications (core)** — webhook CRUD + test + delivery log + scan/fix/billing event tetikleme aktif
- [x] **Webhook retry/backoff** — başarısız teslimatlarda exponential backoff (max 3 deneme)
- [x] **DB migration** — `004_billing_payment.sql` dahil migration'lar çalıştırıldı
- [ ] Production deployment (Nginx SSL, CDN)

## 📄 Lisans

Özel - WCAGTR Platform

## 👥 Geliştirici

Bu proje GitHub Copilot + wcag-tr-vanillajs skill ile geliştirilmiştir.
