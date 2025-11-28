#!/bin/bash

# Test Script for Proxy Implementation
# This script runs comprehensive tests to verify the proxy implementation

set -e

echo "=========================================="
echo "HD Homey Proxy Implementation Tests"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $2${NC}"
        ((TESTS_FAILED++))
    fi
}

# 1. Check if old middleware files exist (should not)
echo "1. Checking for old middleware files..."
if [ -f "src/middleware.ts" ]; then
    echo -e "${YELLOW}⚠ Warning: src/middleware.ts exists (should be deleted)${NC}"
fi
if [ -f "src/middleware.test.ts" ]; then
    echo -e "${YELLOW}⚠ Warning: src/middleware.test.ts exists (should be deleted)${NC}"
fi
echo ""

# 2. Verify proxy.ts exists
echo "2. Verifying proxy.ts exists..."
if [ -f "src/proxy.ts" ]; then
    print_result 0 "src/proxy.ts exists"
else
    print_result 1 "src/proxy.ts missing"
    exit 1
fi
echo ""

# 3. Verify proxy.test.ts exists
echo "3. Verifying proxy.test.ts exists..."
if [ -f "src/proxy.test.ts" ]; then
    print_result 0 "src/proxy.test.ts exists"
else
    print_result 1 "src/proxy.test.ts missing"
    exit 1
fi
echo ""

# 4. Run TypeScript type checking
echo "4. Running TypeScript type check..."
if npm run typecheck > /dev/null 2>&1; then
    print_result 0 "TypeScript type check passed"
else
    print_result 1 "TypeScript type check failed"
    npm run typecheck
fi
echo ""

# 5. Run linting
echo "5. Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    print_result 0 "ESLint passed"
else
    print_result 1 "ESLint failed"
    npm run lint
fi
echo ""

# 6. Run proxy tests specifically
echo "6. Running proxy.test.ts..."
if npm run test:unit -- src/proxy.test.ts 2>&1 | tee /tmp/proxy-test.log; then
    TEST_COUNT=$(grep -c "✓" /tmp/proxy-test.log || echo "0")
    print_result 0 "Proxy tests passed ($TEST_COUNT tests)"
else
    print_result 1 "Proxy tests failed"
    cat /tmp/proxy-test.log
fi
echo ""

# 7. Run full test suite
echo "7. Running full test suite..."
if npm run test:unit > /dev/null 2>&1; then
    print_result 0 "Full test suite passed"
else
    print_result 1 "Full test suite failed"
    npm run test:unit
fi
echo ""

# 8. Check for auth() usage in proxy.ts
echo "8. Verifying auth() is imported and used in proxy.ts..."
if grep -q "import.*auth.*from.*@/auth" src/proxy.ts && grep -q "await auth()" src/proxy.ts; then
    print_result 0 "auth() correctly imported and used"
else
    print_result 1 "auth() not properly imported/used"
fi
echo ""

# 9. Check for proper route protection patterns
echo "9. Checking route protection patterns..."
PATTERNS_OK=true

if ! grep -q "publicRoutes" src/proxy.ts; then
    echo -e "${RED}  Missing publicRoutes definition${NC}"
    PATTERNS_OK=false
fi

if ! grep -q "tokenAuthenticatedRoutes" src/proxy.ts; then
    echo -e "${RED}  Missing tokenAuthenticatedRoutes definition${NC}"
    PATTERNS_OK=false
fi

if ! grep -q "session?.user" src/proxy.ts; then
    echo -e "${RED}  Missing session.user check${NC}"
    PATTERNS_OK=false
fi

if [ "$PATTERNS_OK" = true ]; then
    print_result 0 "All route protection patterns found"
else
    print_result 1 "Missing route protection patterns"
fi
echo ""

# 10. Verify API route auth checks
echo "10. Verifying API route auth checks..."
API_CHECKS_OK=true

if ! grep -q "session?.user?.isAdmin" src/app/api/tuners/\[id\]/route.ts; then
    echo -e "${RED}  Missing admin check in tuners/[id]/route.ts${NC}"
    API_CHECKS_OK=false
fi

if ! grep -q "await auth()" src/app/api/tuners/\[id\]/poll/route.ts; then
    echo -e "${RED}  Missing auth check in tuners/[id]/poll/route.ts${NC}"
    API_CHECKS_OK=false
fi

if [ "$API_CHECKS_OK" = true ]; then
    print_result 0 "All API route auth checks found"
else
    print_result 1 "Missing API route auth checks"
fi
echo ""

# Final summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Proxy implementation is ready.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
