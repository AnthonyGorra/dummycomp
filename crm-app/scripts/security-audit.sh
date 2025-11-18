#!/bin/bash

# Security Audit Script
# This script runs various security checks on the project

set -e

echo "🔒 Running Security Audit..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. npm audit - Check for known vulnerabilities
echo "1. Checking for known vulnerabilities with npm audit..."
if npm audit --audit-level=moderate; then
    print_status 0 "No moderate or higher vulnerabilities found"
else
    print_status 1 "Vulnerabilities found - review npm audit output above"
    echo "   Run 'npm audit fix' to attempt automatic fixes"
    echo ""
fi

# 2. Check for outdated packages
echo ""
echo "2. Checking for outdated packages..."
npm outdated || true
echo ""

# 3. Check for packages with known security issues
echo "3. Checking for packages with security advisories..."
if npm audit --json > /tmp/npm-audit.json 2>/dev/null; then
    VULN_COUNT=$(node -e "const data = require('/tmp/npm-audit.json'); console.log(data.metadata?.vulnerabilities?.total || 0)")
    if [ "$VULN_COUNT" -eq 0 ]; then
        print_status 0 "No vulnerabilities found in dependencies"
    else
        print_status 1 "Found $VULN_COUNT vulnerabilities"
    fi
else
    print_warning "Could not run npm audit in JSON mode"
fi
echo ""

# 4. Check for missing security headers in next.config.js
echo "4. Checking Next.js security configuration..."
if [ -f "next.config.js" ]; then
    print_status 0 "next.config.js found"
else
    print_warning "next.config.js not found"
fi
echo ""

# 5. Check for .env files in git
echo "5. Checking for sensitive files in git..."
if git ls-files | grep -q "\.env$"; then
    print_status 1 ".env files found in git - these should be in .gitignore!"
else
    print_status 0 "No .env files in git"
fi
echo ""

# 6. Check for TODO/FIXME related to security
echo "6. Checking for security-related TODOs in code..."
SECURITY_TODOS=$(grep -r "TODO.*security\|FIXME.*security\|XXX.*security" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null || true)
if [ -z "$SECURITY_TODOS" ]; then
    print_status 0 "No security-related TODOs found"
else
    print_status 1 "Found security-related TODOs:"
    echo "$SECURITY_TODOS"
fi
echo ""

# 7. Check for hardcoded secrets (basic check)
echo "7. Checking for potential hardcoded secrets..."
POTENTIAL_SECRETS=$(grep -r "password\s*=\s*['\"].\+['\"]\\|api_key\s*=\s*['\"].\+['\"]\\|secret\s*=\s*['\"].\+['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | grep -v ".git" || true)
if [ -z "$POTENTIAL_SECRETS" ]; then
    print_status 0 "No obvious hardcoded secrets found"
else
    print_warning "Potential hardcoded secrets found (review manually):"
    echo "$POTENTIAL_SECRETS"
fi
echo ""

# 8. Check if security middleware exists
echo "8. Checking for security middleware..."
if [ -d "lib/security" ]; then
    print_status 0 "Security middleware directory found"
    echo "   Files:"
    ls -la lib/security/*.ts 2>/dev/null | awk '{print "   - " $9}' || true
else
    print_status 1 "Security middleware directory not found"
fi
echo ""

# 9. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Security Audit Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Recommendations:"
echo "  - Run 'npm audit fix' to fix auto-fixable vulnerabilities"
echo "  - Review and update outdated packages regularly"
echo "  - Keep security middleware up to date"
echo "  - Never commit .env files or secrets to git"
echo "  - Use environment variables for all sensitive data"
echo ""
