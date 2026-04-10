# 🎉 WCAGTR Widget - Backend Entegrasyonu Tamamlandı!

## ✅ Entegrasyon Durumu

### Backend API Endpoints (Aktif)

#### 🔐 Authentication
- `POST /api/v1/auth/register` - Müşteri kaydı
- `POST /api/v1/auth/login` - Müşteri girişi  
- `POST /api/v1/auth/admin/login` - Admin girişi

#### 🎫 Token Management
- `POST /api/v1/tokens` - Widget token oluştur
- `GET /api/v1/tokens` - Token listesi
- `DELETE /api/v1/tokens/:id` - Token iptal et
  - Not: Bu endpoint'ler yalnızca customer JWT ile çalışır; widget token ile erişim reddedilir.

#### 🔍 Scan & AI
- `POST /api/v1/scan/report` - Tarama sonuçlarını kaydet
- `POST /api/v1/scan/ai` - AI düzeltme önerileri al

#### 📦 Patch Delivery
- `POST /api/v1/patches/request` - İhlal listesine göre patch talep et
- `GET /api/v1/patches/pending` - Bekleyen patch'leri al
- `POST /api/v1/patches/applied` - Patch uygulandı bildirimi
  - Not: `applied` isteğinde `patchId` ile birlikte `patchSignature` gönderilmelidir.

#### 🔔 Webhook Notifications
- `GET /api/v1/webhooks` - Webhook listesi
- `POST /api/v1/webhooks` - Webhook oluştur
- `PATCH /api/v1/webhooks/:id` - Webhook güncelle
- `DELETE /api/v1/webhooks/:id` - Webhook sil
- `POST /api/v1/webhooks/:id/test` - Test bildirimi
- `GET /api/v1/webhooks/:id/deliveries` - Teslimat geçmişi

#### 💳 Payment (Başlangıç Entegrasyonu)
- `GET /api/v1/customer/billing/plans` - Dinamik plan/fiyat listesi
- `POST /api/v1/customer/billing/upgrade` - Ücretsiz plan geçişi / ücretli plan için checkout başlatma
- `GET /api/v1/customer/billing/payments` - Müşteri ödeme geçmişi
- `GET /api/v1/admin/billing/plans` - Admin fiyat yönetimi listesi
- `PATCH /api/v1/admin/billing/plans/:code` - Admin plan/fiyat güncelleme
- `GET /api/v1/payments/mock/checkout` - Mock checkout sayfası
- `POST /api/v1/payments/mock/confirm` - Mock ödeme onayı
- `POST /api/v1/payments/webhook/mock` - Mock ödeme webhook callback

#### 🌐 Widget CDN & Config
- `GET /cdn/widget.js` - Production widget build
- `GET /cdn/widget-dev.js` - Development widget
- `GET /cdn/widget.sri.json` - SRI hash bilgisi
- `GET /api/v1/widget/config` - Widget apiBase + public key metadata

### Widget Özellikleri

✅ **Tam İşlevsel:**
- Token validation (JWT)
- IndexedDB cache management
- DOM scanner (WCAG 2.2 + TR checklist)
- Client-side fix applier
- Floating erişilebilirlik butonu (♿) + ziyaretçi ayar paneli
- API integration (scan, AI, patches)
- Multi-language support (TR/EN)
- Configurable modes (auto/scan-only/manual)

### Test Sonuçları

```
✅ Health Check
✅ Authentication  
✅ Token Management
✅ Scan Report API
✅ AI Fixes Generation
✅ Patch Delivery
```

## 🚀 Kullanım

### 1. Backend Başlatma

```bash
cd backend
npm run dev          # Development mode
# veya
npm start            # Production mode
```

**API Base:** http://localhost:3000

### 2. Demo Sayfası

```bash
cd widget/demo
python3 -m http.server 8080
```

**Demo URL:** http://localhost:8080

### 3. Widget Entegrasyonu

HTML sayfanıza ekleyin:

```html
<script 
  src="https://cdn.wcagtr.app/widget.js"
  data-token="YOUR_TOKEN_HERE"
  data-mode="auto"
  data-lang="tr"
  data-fix-mode="client"
  data-api-base="https://api.wcagtr.app/api/v1"
  crossorigin="anonymous"
  integrity="sha384-HASH_BURAYA"
  async
></script>
```

> Not: `widget.js` ve `widget.sri.json` dosyaları için önce `npm run build` çalıştırılmalıdır.
> 
> Script yüklendiğinde sayfanın sol alt köşesinde bir **erişilebilirlik butonu** görünür. Panel içinde:
> - Metni büyütme
> - Kontrast artırma
> - Linkleri altı çizili yapma
> - Hareketleri azaltma
> - Okunabilir font
> ayarları sunulur ve tercihleri `localStorage` ile kalıcı tutulur.

Geliştirme için:

```html
<script
  src="http://localhost:3000/cdn/widget-dev.js"
  data-token="YOUR_TOKEN_HERE"
  data-api-base="http://localhost:3000/api/v1"
  data-allow-insecure-token-validation="true"
  async
></script>
```

İhtiyaç halinde launcher özelliği token claim'i ile kapatılabilir:

```json
{
  "features": {
    "accessibilityWidget": false
  }
}
```

### 3.1 Production Build + SRI

```bash
cd widget
npm install

# WIDGET_JWT_PUBLIC_KEY_PEM env'i zorunlu
WIDGET_JWT_PUBLIC_KEY_PEM="$(cat /path/to/public.pem)" npm run build

# Sonuç:
# - widget/dist/widget.js
# - widget/dist/widget.sri.json
# - widget/dist/widget.integrity.txt
```

### 4. Token Oluşturma

```bash
# 1. Müşteri kaydı / girişi
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'

# Cevap: { "token": "CUSTOMER_TOKEN" }

# 2. Widget token oluştur
curl -X POST http://localhost:3000/api/v1/tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "domain": "localhost",
    "autoFixEnabled": true,
    "serverPatchEnabled": false
  }'

# Cevap: { "domain": { "token": "WIDGET_TOKEN" } }
```

## 📊 Veritabanı Şeması

### Scan Data Flow

```
Widget (Client)
    ↓ POST /scan/report
Scans Table
    ├── scan_id, url, violations_count
    ├── wcag_level, tr_compliance_score
    └── scan_data (JSONB)
        ↓
Violations Table
    ├── violation_id, scan_id
    ├── wcag_criterion, tr_criterion
    ├── severity, selector, type
    └── description, recommendation
```

### Token → Domain Mapping

```
Customers (müşteri hesabı)
    ↓
Domains (müşteri domainleri)
    ├── domain, token, expires_at
    ├── auto_fix_enabled
    └── server_patch_enabled
```

## 🧪 Test Script

Tam entegrasyon testi:

```bash
./test-widget-integration.sh
```

Output:
```
✅ Backend sağlıklı
✅ Login başarılı
✅ Widget token oluşturuldu
✅ Scan kaydedildi (Scan ID: 1)
✅ AI fixes oluşturuldu (2 düzeltme)
✅ Patch endpoint çalışıyor
```

## 🎯 Widget Modes

### Auto Mode (Varsayılan)
```html
<script src="widget.js" data-mode="auto"></script>
```
- Sayfa yüklendiğinde otomatik tarar
- İhlalleri tespit eder
- Düzeltmeleri otomatik uygular
- Sonuçları backend'e gönderir

### Scan-Only Mode
```html
<script src="widget.js" data-mode="scan-only"></script>
```
- Sadece tarama yapar
- Düzeltme uygulamaz
- Raporlama yapar

### Manual Mode
```html
<script src="widget.js" data-mode="manual"></script>
```
- Programatik kontrol için
- JavaScript API ile tetiklenir
```js
window.WCAGTR.scan();
window.WCAGTR.applyFixes();
```

## 🔒 Güvenlik

### JWT Token Validation

**İstemci tarafı (widget):**
- Token parsing
- Expiry check
- Domain validation
- (Optional) Crypto signature verify

**Sunucu tarafı (backend):**
- Full JWT verification
- HMAC signature check
- Domain binding enforcement
- Rate limiting

### Data Privacy (KVKK)

- DOM snapshot'larında PII temizlenir
- Form değerleri gönderilmez
- Input içerikleri filtrelenir
- Sadece element selectors + ARIA attributes

## 📁 Proje Yapısı

```
Wcagtr/
├── backend/                 ✅ Tamamlandı
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js     ✅ Auth endpoints
│   │   │   ├── scan.js     ✅ Scan & AI
│   │   │   ├── tokens.js   ✅ Token management
│   │   │   ├── patches.js  ✅ Patch delivery
│   │   │   ├── webhooks.js ✅ Webhook management
│   │   │   └── payments.js ✅ Payment webhook + mock checkout
│   │   ├── middleware/
│   │   ├── config/
│   │   ├── services/
│   │   │   ├── webhooks.js ✅ Webhook delivery service
│   │   │   └── billing.js  ✅ Billing plans + payment flow
│   │   └── index.js
│   └── migrations/          ✅ DB schema
│
├── widget.js                ✅ Mevcut (1269 satır)
├── widget/
│   ├── widget-dev.js        ✅ Local test version
│   └── demo/
│       └── index.html       ✅ Test sayfası
│
├── patch-agent/
│   ├── agent.js             ✅ Polling + HMAC verify + rollback
│   └── .env.example         ✅ Agent config template
│
├── test-api.sh              ✅ API test script
├── test-widget-integration.sh ✅ Integration test
└── WIDGET_INTEGRATION.md    📄 Bu dosya
```

## 🔄 Sonraki Adımlar

### Kısa Vadeli (Widget İyileştirme)
- [x] Gemini AI gerçek entegrasyonu (API key + fallback)
- [ ] Advanced fix algorithms
- [ ] TR checklist 122 soru tam kapsam
- [ ] Performance optimization
- [x] Widget build & minification
- [x] SRI hash üretimi
- [ ] CDN deployment hazırlığı

### Orta Vadeli (Panels)
- [x] Admin panel SPA
- [x] Customer dashboard SPA
- [ ] Real-time scan monitoring
- [x] Fix approval workflow UI
- [x] Billing integration
- [x] Admin pricing management module
- [x] Admin customer detail page
- [x] Customer scan detail page

### Uzun Vadeli (Scale)
- [ ] Local AI model migration
- [ ] Multi-tenant isolation
- [ ] Advanced analytics
- [x] Webhook notifications (core)
- [x] Webhook retry/backoff (max 3 deneme)
- [x] Payment integration (mock foundation)
- [x] Real provider integration (Stripe + iyzico backend akışı)
- [ ] Stripe/iyzico production credential + canlı uçtan uca doğrulama
- [ ] API rate limiting per customer

## 🐛 Debug & Troubleshooting

### Backend Logları
```bash
tail -f /tmp/wcagtr-backend.log
```

### Widget Console
Tarayıcı konsolunda (F12):
```js
// Widget durumu
console.log(window.WCAGTR);

// Cache durumu
indexedDB.databases();

// Manuel tarama
window.WCAGTR?.scan();
```

### Database Query
```bash
psql -U wcagtr_user -d wcagtr -c "SELECT * FROM scans ORDER BY created_at DESC LIMIT 5;"
```

## 📞 API Örnekleri

### Scan Report
```bash
curl -X POST http://localhost:3000/api/v1/scan/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WIDGET_TOKEN" \
  -d '{
    "url": "https://example.com",
    "totalViolations": 5,
    "wcagLevel": "AA",
    "trComplianceScore": 82.5,
    "violations": [...]
  }'
```

### AI Fixes
```bash
curl -X POST http://localhost:3000/api/v1/scan/ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WIDGET_TOKEN" \
  -d '{
    "violations": [
      {"selector": ".low-contrast", "type": "low-contrast"}
    ]
  }'
```

---

**🎉 Widget + Backend çekirdek entegrasyonu tamamlandı.**

**Test Edilenler:**
- ✅ Token oluşturma ve doğrulama
- ✅ Scan report kaydetme
- ✅ AI fix generation
- ✅ Patch delivery sistemi
- ✅ Database persistence
- ✅ Rate limiting
- ✅ Error handling

**Çalışan Sistemler:**
- 🟢 Backend API (http://localhost:3000)
- 🟢 PostgreSQL Database
- 🟢 Widget (widget-dev.js)
- 🟢 Demo Page (http://localhost:8080)
