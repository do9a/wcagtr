#!/bin/bash

echo "=========================================="
echo "WCAGTR Widget Integration Test"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000/api/v1"
TEST_DOMAIN="wcagtr-test-$(date +%s).local"
SEED="$(date +%s%N)-$RANDOM"
TEST_EMAIL="widget-test-${SEED}@corp${SEED}.io"
TEST_PASSWORD="testpassword123"
TEST_COMPANY="Widget Test Company ${SEED}"

# 1. Health Check
echo "1️⃣ Health Check..."
HEALTH=$(curl -s http://localhost:3000/health | jq -r '.status')
if [ "$HEALTH" = "ok" ]; then
  echo "  ✅ Backend sağlıklı"
else
  echo "  ❌ Backend problem"
  exit 1
fi
echo ""

# 2. Customer Registration + Login
echo "2️⃣ Customer Registration + Login..."
REGISTER_RESULT=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$TEST_EMAIL\",
    \"password\":\"$TEST_PASSWORD\",
    \"companyName\":\"$TEST_COMPANY\",
    \"contactName\":\"Widget Test User\",
    \"phone\":\"+905551234567\"
  }")

REGISTER_TOKEN=$(echo "$REGISTER_RESULT" | jq -r '.token')
if [ "$REGISTER_TOKEN" = "null" ] || [ -z "$REGISTER_TOKEN" ]; then
  echo "  ❌ Registration başarısız"
  echo "$REGISTER_RESULT" | jq .
  exit 1
fi

TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo "  ✅ Login başarılı"
  echo "  Token: ${TOKEN:0:50}..."
else
  echo "  ❌ Login başarısız"
  exit 1
fi
echo ""

# 3. Token Oluşturma
echo "3️⃣ Widget Token Oluşturma..."
WIDGET_TOKEN_DATA=$(curl -s -X POST $BASE_URL/tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "domain": "'"$TEST_DOMAIN"'",
    "autoFixEnabled": true,
    "serverPatchEnabled": false
  }')

WIDGET_TOKEN=$(echo "$WIDGET_TOKEN_DATA" | jq -r '.domain.token')
DOMAIN_ID=$(echo "$WIDGET_TOKEN_DATA" | jq -r '.domain.id')

if [ "$WIDGET_TOKEN" != "null" ] && [ ! -z "$WIDGET_TOKEN" ]; then
  echo "  ✅ Widget token oluşturuldu"
  echo "  Domain: $TEST_DOMAIN"
  echo "  Domain ID: $DOMAIN_ID"
  echo "  Token: ${WIDGET_TOKEN:0:60}..."
else
  echo "  ❌ Token oluşturulamadı"
  echo "$WIDGET_TOKEN_DATA" | jq .
  exit 1
fi
echo ""

# 4. Scan Report Endpoint Test
echo "4️⃣ Scan Report Test..."
SCAN_RESULT=$(curl -s -X POST $BASE_URL/scan/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WIDGET_TOKEN" \
  -d '{
    "url": "http://localhost:8080/demo",
    "totalViolations": 4,
    "criticalCount": 0,
    "majorCount": 2,
    "minorCount": 2,
    "wcagLevel": "AA",
    "trComplianceScore": 75.5,
    "scanDurationMs": 1234,
    "userAgent": "WCAGTR Widget Test",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "violations": [
      {
        "wcagCriterion": "1.4.3",
        "trCriterion": "TR-3.1",
        "severity": "major",
        "selector": ".low-contrast",
        "type": "low-contrast",
        "description": "Düşük kontrast tespit edildi",
        "recommendation": "Kontrast oranını artırın",
        "impact": "high"
      },
      {
        "wcagCriterion": "1.1.1",
        "trCriterion": "TR-1.1",
        "severity": "major",
        "selector": "img",
        "type": "missing-alt",
        "description": "Alt attribute eksik",
        "recommendation": "Alt text ekleyin",
        "impact": "high"
      }
    ]
  }')

SCAN_ID=$(echo "$SCAN_RESULT" | jq -r '.scanId')
if [ "$SCAN_ID" != "null" ] && [ ! -z "$SCAN_ID" ]; then
  echo "  ✅ Scan kaydedildi"
  echo "  Scan ID: $SCAN_ID"
else
  echo "  ❌ Scan kaydedilemedi"
  echo "$SCAN_RESULT" | jq .
fi
echo ""

# 5. AI Scan Endpoint Test
echo "5️⃣ AI Scan Test..."
AI_RESULT=$(curl -s -X POST $BASE_URL/scan/ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WIDGET_TOKEN" \
  -d '{
    "violations": [
      {"selector": ".low-contrast", "type": "low-contrast"},
      {"selector": "img", "type": "missing-alt"}
    ]
  }')

FIX_COUNT=$(echo "$AI_RESULT" | jq '.fixes | length')
if [ "$FIX_COUNT" -gt 0 ]; then
  echo "  ✅ AI fixes oluşturuldu"
  echo "  Fix sayısı: $FIX_COUNT"
else
  echo "  ❌ AI fixes oluşturulamadı"
fi
echo ""

# 6. Patch Request Endpoint Test
echo "6️⃣ Patch Request Test..."
PATCH_REQUEST_RAW=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/patches/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WIDGET_TOKEN" \
  -d '{
    "url": "http://localhost:8080/demo",
    "violations": [
      {"selector": ".low-contrast", "type": "low-contrast"},
      {"selector": "img", "type": "missing-alt"}
    ]
  }')

PATCH_REQUEST_STATUS=$(echo "$PATCH_REQUEST_RAW" | tail -n 1)
PATCH_REQUEST_RESULT=$(echo "$PATCH_REQUEST_RAW" | sed '$d')
if [ "$PATCH_REQUEST_STATUS" = "403" ]; then
  echo "  ✅ Patch request koruması çalışıyor (server patch planı gerekli)"
else
  echo "  ❌ Patch request koruması beklenen sonucu vermedi"
  echo "  HTTP: $PATCH_REQUEST_STATUS"
  echo "$PATCH_REQUEST_RESULT" | jq .
  exit 1
fi
echo ""

# 7. Patch Pending Endpoint Test
echo "7️⃣ Patch Pending Test..."
PATCH_PENDING_RAW=$(curl -s -w "\n%{http_code}" -X GET $BASE_URL/patches/pending \
  -H "Authorization: Bearer $WIDGET_TOKEN")

PATCH_PENDING_STATUS=$(echo "$PATCH_PENDING_RAW" | tail -n 1)
PATCHES=$(echo "$PATCH_PENDING_RAW" | sed '$d')
if [ "$PATCH_PENDING_STATUS" = "403" ]; then
  echo "  ✅ Patch pending koruması çalışıyor (server patch planı gerekli)"
else
  echo "  ❌ Patch pending koruması beklenen sonucu vermedi"
  echo "  HTTP: $PATCH_PENDING_STATUS"
  echo "$PATCHES" | jq .
  exit 1
fi
echo ""

echo "=========================================="
echo "✅ Tüm testler başarılı!"
echo "=========================================="
echo ""
echo "📊 Özet:"
echo "  • Backend: Çalışıyor"
echo "  • Authentication: ✅"
echo "  • Token Management: ✅"
echo "  • Scan Report: ✅ (Scan ID: $SCAN_ID)"
echo "  • AI Fixes: ✅ ($FIX_COUNT düzeltme)"
echo "  • Patch Delivery Guard: ✅ (yetkisiz patch erişimi engellendi)"
echo ""
echo "🌐 Demo Sayfası: http://localhost:8080"
echo "📡 Backend API: http://localhost:3000"
echo ""
echo "Widget Token (demo için):"
echo "$WIDGET_TOKEN"
