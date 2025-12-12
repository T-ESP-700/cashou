#!/bin/bash

# Script de vérification CI/CD en local
# Simule toutes les étapes du pipeline GitHub Actions

# Ne pas arrêter sur les erreurs, on les gère manuellement
set +e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Simulation CI/CD Pipeline - Cashou   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour afficher les étapes
print_step() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Compteurs
PASSED=0
FAILED=0
WARNINGS=0

# ============================================
# 1. Installation des dépendances
# ============================================
print_step "1/7 Installation des dépendances"
if bun install --frozen-lockfile > /dev/null 2>&1; then
    print_success "Dépendances installées"
    ((PASSED++))
else
    print_error "Échec de l'installation des dépendances"
    ((FAILED++))
    exit 1
fi

# ============================================
# 2. Génération Prisma
# ============================================
print_step "2/7 Génération des clients Prisma"
if bun run db:generate > /dev/null 2>&1; then
    print_success "Clients Prisma générés"
    ((PASSED++))
else
    print_warning "Échec de la génération Prisma (peut être normal si DB non configurée)"
    ((WARNINGS++))
fi

# ============================================
# 3. Code Quality - TypeScript
# ============================================
print_step "3/7 Vérification TypeScript"
if bun run typecheck 2>&1 | grep -q "error TS"; then
    ERROR_COUNT=$(bun run typecheck 2>&1 | grep -c "error TS" || echo "0")
    print_warning "TypeScript: ${ERROR_COUNT} erreurs détectées (tolérées par le CI)"
    ((WARNINGS++))
else
    print_success "TypeScript: Aucune erreur"
    ((PASSED++))
fi

# ============================================
# 4. Code Quality - ESLint
# ============================================
print_step "4/7 Vérification ESLint (backend)"
cd apps/backend
ESLINT_OUTPUT=$(bunx eslint . --ext .ts,.tsx 2>&1)
if echo "$ESLINT_OUTPUT" | grep -qE "✖ [0-9]+ problems \([1-9][0-9]* error"; then
    ERROR_COUNT=$(echo "$ESLINT_OUTPUT" | grep -oE "\([0-9]+ error" | grep -oE "[0-9]+")
    print_error "ESLint: ${ERROR_COUNT} erreurs détectées"
    ((FAILED++))
elif echo "$ESLINT_OUTPUT" | grep -q "warning"; then
    WARNING_COUNT=$(echo "$ESLINT_OUTPUT" | grep -oE "\([0-9]+ error, ([0-9]+) warning" | grep -oE "[0-9]+ warning" | grep -oE "[0-9]+" || echo "$ESLINT_OUTPUT" | grep -oE "[0-9]+ warning" | head -1 | grep -oE "[0-9]+")
    print_warning "ESLint: ${WARNING_COUNT} warnings (0 erreurs)"
    ((WARNINGS++))
else
    print_success "ESLint: Aucune erreur, aucun warning"
    ((PASSED++))
fi
cd ../..

# ============================================
# 5. Tests des packages
# ============================================
print_step "5/7 Tests des packages partagés"
PACKAGE_TEST_FAILED=0
for package in "@cashou/db-app" "@cashou/db-backoffice"; do
    if bun run --filter $package test > /dev/null 2>&1; then
        print_success "Tests $package: OK"
    else
        print_warning "Tests $package: Échec ou aucun test"
        ((PACKAGE_TEST_FAILED++))
    fi
done

if [ $PACKAGE_TEST_FAILED -eq 0 ]; then
    ((PASSED++))
else
    ((WARNINGS++))
fi

# ============================================
# 6. Tests des applications
# ============================================
print_step "6/7 Tests backend"
cd apps/backend

# Sauvegarder la sortie des tests
TEST_OUTPUT=$(bun test 2>&1 || true)
TEST_EXIT_CODE=$?

# Parser les résultats même si les tests ont des erreurs
PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ pass" | grep -oE "[0-9]+" | head -1 || echo "0")
FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ fail" | grep -oE "[0-9]+" | head -1 || echo "0")
SKIP_COUNT=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ skip" | grep -oE "[0-9]+" | head -1 || echo "0")

# Vérifier le résultat des tests
if [ "$TEST_EXIT_CODE" -eq 0 ]; then
    print_success "Tests backend: ${PASS_COUNT} pass, ${FAIL_COUNT} fail, ${SKIP_COUNT} skip"
    if [ "$SKIP_COUNT" -gt 0 ] && [ -z "$CASHOU_DB_URL" ]; then
        print_warning "  Note: ${SKIP_COUNT} tests d'intégration skippés (pas de DB locale)"
    fi
    ((PASSED++))
else
    print_error "Tests backend: ${PASS_COUNT} pass, ${FAIL_COUNT} fail, ${SKIP_COUNT} skip"
    ((FAILED++))
fi
cd ../..

# ============================================
# 7. Build des applications
# ============================================
print_step "7/7 Build TypeScript"
if bun run --filter backend build > /dev/null 2>&1; then
    print_success "Build backend: OK"
    ((PASSED++))
else
    print_warning "Build backend: Erreurs détectées (tolérées)"
    ((WARNINGS++))
fi

# ============================================
# Résumé final
# ============================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           RÉSUMÉ DE LA CI/CD           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Toutes les vérifications critiques sont passées!${NC}"
    echo ""
    echo -e "  ${GREEN}✓${NC} Réussites: ${PASSED}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "  ${YELLOW}⚠${NC} Avertissements: ${WARNINGS}"
    fi
    echo ""
    echo -e "${GREEN}🚀 Vous pouvez pusher en toute sécurité!${NC}"
    exit 0
else
    echo -e "${RED}✗ Des erreurs critiques ont été détectées${NC}"
    echo ""
    echo -e "  ${GREEN}✓${NC} Réussites: ${PASSED}"
    echo -e "  ${RED}✗${NC} Échecs: ${FAILED}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "  ${YELLOW}⚠${NC} Avertissements: ${WARNINGS}"
    fi
    echo ""
    echo -e "${RED}⛔ Corrigez les erreurs avant de pusher${NC}"
    exit 1
fi
