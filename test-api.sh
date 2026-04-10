#!/bin/bash

echo "======================================"
echo "WCAGTR Backend API Test"
echo "======================================"
echo ""

TS=$(date +%s)
TEST_EMAIL="test-${TS}@corp${TS}.io"

# 1. Health Check
echo "✓ Health Check:"
curl -s http://localhost:3000/health | jq -r '.status, .database' | head -2
echo ""

# 2. Admin Login
echo "✓ Admin Login Test:"
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wcagtr.com","password":"admin123"}' | jq -r '.token')

if [ "$ADMIN_TOKEN" != "null" ] && [ ! -z "$ADMIN_TOKEN" ]; then
  echo "  ✓ Admin login successful"
  echo "  Token: ${ADMIN_TOKEN:0:50}..."
else
  echo "  ✗ Admin login failed"
fi
echo ""

# 3. Customer Registration
echo "✓ Customer Registration Test:"
CUSTOMER_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$TEST_EMAIL\",
    \"password\":\"testpassword123\",
    \"companyName\":\"Test Company $TS\",
    \"contactName\":\"Test User\",
    \"phone\":\"+905551234567\"
  }" | jq -r '.token')

if [ "$CUSTOMER_TOKEN" != "null" ] && [ ! -z "$CUSTOMER_TOKEN" ]; then
  echo "  ✓ Registration successful"
  echo "  Token: ${CUSTOMER_TOKEN:0:50}..."
else
  echo "  ✗ Registration failed"
fi
echo ""

# 4. Customer Login
echo "✓ Customer Login Test:"
LOGIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"testpassword123\"}" | jq -r '.token')

if [ "$LOGIN_TOKEN" != "null" ] && [ ! -z "$LOGIN_TOKEN" ]; then
  echo "  ✓ Customer login successful"
  echo "  Token: ${LOGIN_TOKEN:0:50}..."
else
  echo "  ✗ Customer login failed"
fi
echo ""

echo "======================================"
echo "✅ Backend API Tests Complete!"
echo "======================================"
