#!/bin/bash
# Production Endpoint Tester
# Tests all production endpoints to verify they're working

BASE_URL="${1:-http://localhost:5000}"
echo "Testing production endpoints at: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Health Check
echo "1. Testing Health Check (/health)..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test Metrics Endpoint
echo "2. Testing Metrics Endpoint (/metrics)..."
METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/metrics")
METRICS_HTTP_CODE=$(echo "$METRICS_RESPONSE" | tail -n1)
METRICS_BODY=$(echo "$METRICS_RESPONSE" | sed '$d')

if [ "$METRICS_HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Metrics endpoint accessible (HTTP $METRICS_HTTP_CODE)${NC}"
    echo "Response preview: $(echo $METRICS_BODY | head -c 200)..."
elif [ "$METRICS_HTTP_CODE" -eq 401 ]; then
    echo -e "${YELLOW}⚠️  Metrics endpoint requires authentication (HTTP $METRICS_HTTP_CODE)${NC}"
    echo "This is expected in production. Add Authorization header to access."
else
    echo -e "${RED}❌ Metrics endpoint failed (HTTP $METRICS_HTTP_CODE)${NC}"
    echo "Response: $METRICS_BODY"
fi
echo ""

# Test Security Headers
echo "3. Testing Security Headers..."
HEADERS=$(curl -s -I "$BASE_URL")
HAS_FRAME_OPTIONS=$(echo "$HEADERS" | grep -i "X-Frame-Options" || echo "")
HAS_CONTENT_TYPE=$(echo "$HEADERS" | grep -i "X-Content-Type-Options" || echo "")
HAS_XSS=$(echo "$HEADERS" | grep -i "X-XSS-Protection" || echo "")
HAS_REQUEST_ID=$(echo "$HEADERS" | grep -i "X-Request-ID" || echo "")

if [ -n "$HAS_FRAME_OPTIONS" ]; then
    echo -e "${GREEN}✅ X-Frame-Options header present${NC}"
else
    echo -e "${RED}❌ X-Frame-Options header missing${NC}"
fi

if [ -n "$HAS_CONTENT_TYPE" ]; then
    echo -e "${GREEN}✅ X-Content-Type-Options header present${NC}"
else
    echo -e "${RED}❌ X-Content-Type-Options header missing${NC}"
fi

if [ -n "$HAS_XSS" ]; then
    echo -e "${GREEN}✅ X-XSS-Protection header present${NC}"
else
    echo -e "${RED}❌ X-XSS-Protection header missing${NC}"
fi

if [ -n "$HAS_REQUEST_ID" ]; then
    echo -e "${GREEN}✅ X-Request-ID header present${NC}"
else
    echo -e "${RED}❌ X-Request-ID header missing${NC}"
fi
echo ""

# Test Error Handling
echo "4. Testing Error Handling (404)..."
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/nonexistent")
ERROR_HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)
ERROR_BODY=$(echo "$ERROR_RESPONSE" | sed '$d')

if [ "$ERROR_HTTP_CODE" -eq 404 ]; then
    echo -e "${GREEN}✅ Error handling works (HTTP $ERROR_HTTP_CODE)${NC}"
    if echo "$ERROR_BODY" | grep -q "requestId"; then
        echo -e "${GREEN}✅ Error response includes requestId${NC}"
    else
        echo -e "${YELLOW}⚠️  Error response missing requestId${NC}"
    fi
    echo "Response: $ERROR_BODY"
else
    echo -e "${RED}❌ Error handling test failed (HTTP $ERROR_HTTP_CODE)${NC}"
fi
echo ""

# Test Rate Limiting (if auth endpoint exists)
echo "5. Testing Rate Limiting..."
RATE_LIMIT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>/dev/null)
RATE_LIMIT_HTTP_CODE=$(echo "$RATE_LIMIT_RESPONSE" | tail -n1)

if [ "$RATE_LIMIT_HTTP_CODE" -eq 429 ]; then
    echo -e "${GREEN}✅ Rate limiting is working (HTTP 429)${NC}"
elif [ "$RATE_LIMIT_HTTP_CODE" -eq 401 ] || [ "$RATE_LIMIT_HTTP_CODE" -eq 400 ]; then
    echo -e "${YELLOW}⚠️  Rate limiting may be working (got $RATE_LIMIT_HTTP_CODE, not 429)${NC}"
    echo "Note: This might be an auth error, not rate limiting. Try multiple requests."
else
    echo -e "${YELLOW}⚠️  Could not verify rate limiting (HTTP $RATE_LIMIT_HTTP_CODE)${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Health Check: $([ "$HTTP_CODE" -eq 200 ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo "Metrics: $([ "$METRICS_HTTP_CODE" -eq 200 ] || [ "$METRICS_HTTP_CODE" -eq 401 ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo "Security Headers: $([ -n "$HAS_FRAME_OPTIONS" ] && [ -n "$HAS_CONTENT_TYPE" ] && echo -e "${GREEN}✅${NC}" || echo -e "${YELLOW}⚠️${NC}")"
echo "Error Handling: $([ "$ERROR_HTTP_CODE" -eq 404 ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo ""
echo "Run with custom URL: ./scripts/test-production-endpoints.sh https://yourdomain.com"

