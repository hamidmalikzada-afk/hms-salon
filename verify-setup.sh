#!/bin/bash

set -e

echo "================================================"
echo "HMS Salon - TypeScript & Testing Setup Verification"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for checks
PASSED=0
FAILED=0

# Helper function to check command
check_command() {
    local cmd=$1
    local name=$2
    
    if command -v $cmd &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name is installed"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name is not installed"
        ((FAILED++))
    fi
}

# Helper function to check file existence
check_file() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $name exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name is missing"
        ((FAILED++))
    fi
}

# Helper function to check directory existence
check_dir() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $name directory exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name directory is missing"
        ((FAILED++))
    fi
}

echo -e "${YELLOW}1. Checking Prerequisites${NC}"
check_command "node" "Node.js"
check_command "npm" "npm"
echo ""

echo -e "${YELLOW}2. Checking Root Configuration Files${NC}"
check_file ".editorconfig" ".editorconfig"
check_file ".prettierrc" ".prettierrc"
check_file ".prettierignore" ".prettierignore"
check_file ".eslintignore" ".eslintignore"
check_file "CONTRIBUTING.md" "CONTRIBUTING.md"
check_file "CODEOWNERS" "CODEOWNERS"
check_file "IMPROVEMENTS.md" "IMPROVEMENTS.md"
echo ""

echo -e "${YELLOW}3. Checking Backend Configuration${NC}"
check_file "backend/package.json" "Backend package.json"
check_file "backend/tsconfig.json" "Backend tsconfig.json"
check_file "backend/.eslintrc.json" "Backend .eslintrc.json"
check_file "backend/jest.config.js" "Backend jest.config.js"
check_file "backend/server.ts" "Backend server.ts (TypeScript)"
echo ""

echo -e "${YELLOW}4. Checking Frontend Configuration${NC}"
check_file "frontend/package.json" "Frontend package.json"
check_file "frontend/tsconfig.json" "Frontend tsconfig.json"
check_file "frontend/tsconfig.node.json" "Frontend tsconfig.node.json"
check_file "frontend/.eslintrc.json" "Frontend .eslintrc.json"
check_file "frontend/vitest.config.ts" "Frontend vitest.config.ts"
check_file "frontend/src/App.tsx" "Frontend App.tsx (TypeScript)"
check_file "frontend/src/main.tsx" "Frontend main.tsx (TypeScript)"
echo ""

echo -e "${YELLOW}5. Checking Test Files${NC}"
check_file "backend/__tests__/user.test.ts" "Backend user tests"
check_file "frontend/src/App.test.tsx" "Frontend App tests"
check_file "frontend/src/example.test.ts" "Frontend example tests"
echo ""

echo -e "${YELLOW}6. Checking CI/CD${NC}"
check_file ".github/workflows/ci.yml" "GitHub Actions CI workflow"
echo ""

echo "================================================"
echo "Verification Summary"
echo "================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Run: npm install (in both backend and frontend)"
    echo "2. Run: npm run lint (to verify ESLint setup)"
    echo "3. Run: npm run test (to verify testing setup)"
    echo "4. Create a Pull Request to merge changes"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review above.${NC}"
    exit 1
fi
