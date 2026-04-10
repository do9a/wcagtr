#!/bin/bash

# Admin Panel Test Script
# Tests admin panel functionality end-to-end

set -e

API_BASE="http://localhost:3000/api/v1"
ADMIN_PANEL="http://localhost:8081"

echo "========================================="
echo "Admin Panel Integration Test"
echo "========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Backend Health
echo -e "\n[1/6] Testing backend health..."
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -Eq "\"status\":\"(healthy|ok)\""; then
  echo -e "${GREEN}✓ Backend is healthy${NC}"
else
  echo -e "${RED}✗ Backend is not healthy${NC}"
  exit 1
fi

# Test 2: Admin Login
echo -e "\n[2/6] Testing admin login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wcagtr.com","password":"admin123"}')

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "${GREEN}✓ Admin login successful${NC}"
  echo "Token: ${ADMIN_TOKEN:0:50}..."
else
  echo -e "${RED}✗ Admin login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test 3: Dashboard Stats
echo -e "\n[3/6] Testing admin dashboard..."
DASHBOARD=$(curl -s "$API_BASE/admin/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$DASHBOARD" | grep -q "totalCustomers"; then
  echo -e "${GREEN}✓ Dashboard stats retrieved${NC}"
  echo "$DASHBOARD" | head -10
else
  echo -e "${RED}✗ Dashboard failed${NC}"
  echo "Response: $DASHBOARD"
fi

# Test 4: Get Customers
echo -e "\n[4/6] Testing get customers..."
CUSTOMERS=$(curl -s "$API_BASE/admin/customers" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$CUSTOMERS" | grep -q "customers"; then
  echo -e "${GREEN}✓ Customers list retrieved${NC}"
  CUSTOMER_COUNT=$(echo "$CUSTOMERS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "Total customers: $CUSTOMER_COUNT"
else
  echo -e "${RED}✗ Get customers failed${NC}"
fi

# Test 5: Get Scans
echo -e "\n[5/6] Testing get scans..."
SCANS=$(curl -s "$API_BASE/admin/scans" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$SCANS" | grep -q "scans"; then
  echo -e "${GREEN}✓ Scans list retrieved${NC}"
  SCAN_COUNT=$(echo "$SCANS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "Total scans: $SCAN_COUNT"
else
  echo -e "${RED}✗ Get scans failed${NC}"
fi

# Test 6: Get Tokens
echo -e "\n[6/6] Testing get tokens..."
TOKENS=$(curl -s "$API_BASE/admin/tokens" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$TOKENS" | grep -q "tokens"; then
  echo -e "${GREEN}✓ Tokens list retrieved${NC}"
  TOKEN_COUNT=$(echo "$TOKENS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "Total tokens: $TOKEN_COUNT"
else
  echo -e "${RED}✗ Get tokens failed${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Open admin panel: http://localhost:8081"
echo "2. Login with: admin@wcagtr.com / admin123"
echo "3. Explore dashboard, customers, scans, tokens"
echo ""
