#!/bin/bash

###############################################################################
# Rollback Automation Script
#
# This script provides automated rollback for both blue-green and canary deployments
#
# Usage:
#   ./rollback.sh [--strategy blue-green|canary] [--to-version VERSION]
#
# Example:
#   ./rollback.sh --strategy blue-green
#   ./rollback.sh --strategy canary
#   ./rollback.sh --strategy blue-green --to-version v1.5.0
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-default}"
APP_NAME="crm-app"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Automated rollback script for Kubernetes deployments

OPTIONS:
    --strategy STRATEGY    Deployment strategy (blue-green|canary) - auto-detected if not specified
    --to-version VERSION   Specific version to rollback to
    --yes                  Skip confirmation prompts
    -h, --help            Show this help message

EXAMPLES:
    $0 --strategy blue-green
    $0 --strategy canary
    $0 --strategy blue-green --to-version v1.5.0
    $0 --yes  # Auto-detect and rollback without confirmation

EOF
}

# Parse arguments
parse_args() {
    STRATEGY=""
    TARGET_VERSION=""
    AUTO_CONFIRM=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --strategy)
                STRATEGY="$2"
                shift 2
                ;;
            --to-version)
                TARGET_VERSION="$2"
                shift 2
                ;;
            --yes)
                AUTO_CONFIRM=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Detect deployment strategy
detect_strategy() {
    log_info "Detecting deployment strategy..."

    # Check for blue-green deployments
    if kubectl get deployment ${APP_NAME}-blue -n ${NAMESPACE} &> /dev/null && \
       kubectl get deployment ${APP_NAME}-green -n ${NAMESPACE} &> /dev/null; then
        log_info "Detected blue-green deployment"
        echo "blue-green"
        return
    fi

    # Check for canary deployments
    if kubectl get deployment ${APP_NAME}-stable -n ${NAMESPACE} &> /dev/null && \
       kubectl get deployment ${APP_NAME}-canary -n ${NAMESPACE} &> /dev/null; then
        log_info "Detected canary deployment"
        echo "canary"
        return
    fi

    # Check for standard deployment
    if kubectl get deployment ${APP_NAME} -n ${NAMESPACE} &> /dev/null; then
        log_info "Detected standard deployment"
        echo "standard"
        return
    fi

    log_error "Could not detect deployment strategy"
    return 1
}

# Get rollback history for standard deployment
get_rollback_history() {
    local deployment=$1

    log_info "Fetching rollback history for ${deployment}..."

    kubectl rollout history deployment/${deployment} -n ${NAMESPACE}
}

# Rollback blue-green deployment
rollback_blue_green() {
    log_info "=== Blue-Green Rollback ==="

    # Get current active version
    local active_version=$(kubectl get service ${APP_NAME} -n ${NAMESPACE} \
        -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")

    if [ -z "$active_version" ]; then
        log_error "Cannot determine active version"
        return 1
    fi

    log_info "Current active version: ${active_version}"

    # Determine rollback target
    local rollback_to=""
    if [ "$active_version" = "blue" ]; then
        rollback_to="green"
    else
        rollback_to="blue"
    fi

    log_info "Rollback target: ${rollback_to}"

    # Get current image versions
    local active_image=$(kubectl get deployment ${APP_NAME}-${active_version} -n ${NAMESPACE} \
        -o jsonpath='{.spec.template.spec.containers[0].image}')
    local rollback_image=$(kubectl get deployment ${APP_NAME}-${rollback_to} -n ${NAMESPACE} \
        -o jsonpath='{.spec.template.spec.containers[0].image}')

    log_info "Current active image: ${active_image}"
    log_info "Rollback target image: ${rollback_image}"

    # Check if rollback target is healthy
    local ready_pods=$(kubectl get deployment ${APP_NAME}-${rollback_to} -n ${NAMESPACE} \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired_pods=$(kubectl get deployment ${APP_NAME}-${rollback_to} -n ${NAMESPACE} \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

    if [ "$ready_pods" != "$desired_pods" ] || [ "$ready_pods" = "0" ]; then
        log_warning "Rollback target (${rollback_to}) is not fully ready (${ready_pods}/${desired_pods})"

        if [ "$AUTO_CONFIRM" = false ]; then
            read -p "Do you want to scale up ${rollback_to} first? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log_info "Scaling up ${rollback_to} to 3 replicas..."
                kubectl scale deployment ${APP_NAME}-${rollback_to} --replicas=3 -n ${NAMESPACE}
                kubectl rollout status deployment/${APP_NAME}-${rollback_to} -n ${NAMESPACE} --timeout=300s
            fi
        fi
    fi

    # Confirm rollback
    if [ "$AUTO_CONFIRM" = false ]; then
        log_warning ""
        log_warning "=== ROLLBACK CONFIRMATION ==="
        log_warning "This will switch traffic from ${active_version} to ${rollback_to}"
        log_warning "From: ${active_image}"
        log_warning "To:   ${rollback_image}"
        log_warning ""
        read -p "Proceed with rollback? (y/n) " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Rollback cancelled"
            return 0
        fi
    fi

    # Execute rollback
    log_info "Switching traffic to ${rollback_to}..."

    kubectl patch service ${APP_NAME} -n ${NAMESPACE} \
        -p "{\"spec\":{\"selector\":{\"version\":\"${rollback_to}\"}}}"

    kubectl annotate service ${APP_NAME} -n ${NAMESPACE} \
        blue-green.deployment/active-version=${rollback_to} --overwrite

    # Verify rollback
    sleep 5
    local new_active=$(kubectl get service ${APP_NAME} -n ${NAMESPACE} \
        -o jsonpath='{.spec.selector.version}')

    if [ "$new_active" = "$rollback_to" ]; then
        log_success "=== Rollback Successful ==="
        log_info "Traffic switched to ${rollback_to}"
        log_info "Image: ${rollback_image}"
    else
        log_error "Rollback verification failed"
        return 1
    fi
}

# Rollback canary deployment
rollback_canary() {
    log_info "=== Canary Rollback ==="

    # Get current canary status
    local canary_replicas=$(kubectl get deployment ${APP_NAME}-canary -n ${NAMESPACE} \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

    log_info "Current canary replicas: ${canary_replicas}"

    if [ "$canary_replicas" = "0" ]; then
        log_info "No active canary deployment to rollback"
        return 0
    fi

    # Get images
    local stable_image=$(kubectl get deployment ${APP_NAME}-stable -n ${NAMESPACE} \
        -o jsonpath='{.spec.template.spec.containers[0].image}')
    local canary_image=$(kubectl get deployment ${APP_NAME}-canary -n ${NAMESPACE} \
        -o jsonpath='{.spec.template.spec.containers[0].image}')

    log_info "Stable image: ${stable_image}"
    log_info "Canary image: ${canary_image}"

    # Confirm rollback
    if [ "$AUTO_CONFIRM" = false ]; then
        log_warning ""
        log_warning "=== ROLLBACK CONFIRMATION ==="
        log_warning "This will scale down canary and restore 100% traffic to stable"
        log_warning ""
        read -p "Proceed with rollback? (y/n) " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Rollback cancelled"
            return 0
        fi
    fi

    # Execute rollback
    log_info "Scaling down canary deployment..."
    kubectl scale deployment ${APP_NAME}-canary --replicas=0 -n ${NAMESPACE}

    log_info "Scaling up stable deployment..."
    kubectl scale deployment ${APP_NAME}-stable --replicas=10 -n ${NAMESPACE}

    # Remove canary ingress weight
    if kubectl get ingress ${APP_NAME}-canary -n ${NAMESPACE} &> /dev/null; then
        log_info "Removing canary ingress weight..."
        kubectl patch ingress ${APP_NAME}-canary -n ${NAMESPACE} \
            -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'
    fi

    # Wait for stable to be ready
    kubectl rollout status deployment/${APP_NAME}-stable -n ${NAMESPACE} --timeout=300s

    log_success "=== Rollback Successful ==="
    log_info "Canary scaled to 0, all traffic to stable"
    log_info "Stable image: ${stable_image}"
}

# Rollback standard deployment
rollback_standard() {
    log_info "=== Standard Deployment Rollback ==="

    # Show rollout history
    get_rollback_history ${APP_NAME}

    # Determine rollback target
    if [ -n "$TARGET_VERSION" ]; then
        log_info "Rolling back to specific version: ${TARGET_VERSION}"
        # This would require finding the revision number for the version
        # For now, we'll just do a standard rollback
        log_warning "Specific version rollback not fully implemented for standard deployments"
        log_info "Performing rollback to previous revision..."
    fi

    # Confirm rollback
    if [ "$AUTO_CONFIRM" = false ]; then
        log_warning ""
        read -p "Rollback to previous revision? (y/n) " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Rollback cancelled"
            return 0
        fi
    fi

    # Execute rollback
    log_info "Rolling back deployment..."
    kubectl rollout undo deployment/${APP_NAME} -n ${NAMESPACE}

    # Wait for rollout
    kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=300s

    log_success "=== Rollback Successful ==="
}

# Main function
main() {
    parse_args "$@"

    log_info "=== Kubernetes Rollback Tool ==="
    log_info "Namespace: ${NAMESPACE}"

    # Auto-detect strategy if not specified
    if [ -z "$STRATEGY" ]; then
        STRATEGY=$(detect_strategy)
        if [ $? -ne 0 ]; then
            exit 1
        fi
    fi

    log_info "Strategy: ${STRATEGY}"

    # Execute rollback based on strategy
    case $STRATEGY in
        blue-green)
            rollback_blue_green
            ;;
        canary)
            rollback_canary
            ;;
        standard)
            rollback_standard
            ;;
        *)
            log_error "Unknown strategy: ${STRATEGY}"
            exit 1
            ;;
    esac
}

main "$@"
