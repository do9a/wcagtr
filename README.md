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

## 📡 API Endpoints

### Health Check
```bash
GET /health
GET /ready
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

### Patch Agent (Server-Side)
```bash
cd patch-agent
cp .env.example .env
# PATCH_AGENT_WIDGET_TOKEN + PATCH_AGENT_SIGNING_KEY doldurun
npm start
```

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
