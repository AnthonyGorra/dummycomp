#!/bin/bash

###############################################################################
# Canary Deployment Script
#
# This script automates canary deployments with progressive rollout
#
# Usage:
#   ./canary-deploy.sh <new-version> [--auto]
#
# Example:
#   ./canary-deploy.sh v2.0.0
#   ./canary-deploy.sh v2.0.0 --auto  # Automatic progressive rollout
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-default}"
APP_NAME="crm-app"
HEALTH_CHECK_ENDPOINT="/api/health"
STABLE_DEPLOYMENT="${APP_NAME}-stable"
CANARY_DEPLOYMENT="${APP_NAME}-canary"

# Canary rollout stages (traffic percentage)
STAGES=(10 25 50 75 100)
STAGE_DURATION=300  # 5 minutes per stage

# Metrics thresholds for automated promotion
ERROR_RATE_THRESHOLD=1  # 1% error rate
LATENCY_P99_THRESHOLD=1000  # 1000ms

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Deploy canary version
deploy_canary() {
    local version=$1

    log_info "Deploying canary version ${version}..."

    # Check if canary deployment exists
    if ! kubectl get deployment ${CANARY_DEPLOYMENT} -n ${NAMESPACE} &> /dev/null; then
        log_info "Canary deployment doesn't exist, creating..."
        kubectl apply -f k8s/canary/crm-app-canary.yaml -n ${NAMESPACE}
    fi

    # Update canary image
    kubectl set image deployment/${CANARY_DEPLOYMENT} \
        ${APP_NAME}=dummycomp/${APP_NAME}:${version} \
        -n ${NAMESPACE}

    # Wait for rollout
    log_info "Waiting for canary rollout..."
    kubectl rollout status deployment/${CANARY_DEPLOYMENT} -n ${NAMESPACE} --timeout=600s

    log_success "Canary deployment ready"
}

# Set traffic split using replica count
set_traffic_replicas() {
    local canary_percent=$1
    local total_replicas=10

    local canary_replicas=$((total_replicas * canary_percent / 100))
    local stable_replicas=$((total_replicas - canary_replicas))

    # Ensure at least 1 replica for canary when > 0%
    if [ $canary_percent -gt 0 ] && [ $canary_replicas -eq 0 ]; then
        canary_replicas=1
        stable_replicas=$((total_replicas - 1))
    fi

    log_info "Setting traffic split: ${canary_percent}% canary (${canary_replicas} replicas), $((100 - canary_percent))% stable (${stable_replicas} replicas)"

    kubectl scale deployment/${STABLE_DEPLOYMENT} --replicas=${stable_replicas} -n ${NAMESPACE}
    kubectl scale deployment/${CANARY_DEPLOYMENT} --replicas=${canary_replicas} -n ${NAMESPACE}

    # Wait for scaling
    sleep 10
}

# Set traffic split using NGINX Ingress annotations
set_traffic_nginx() {
    local canary_percent=$1

    log_info "Setting NGINX canary weight to ${canary_percent}%..."

    if kubectl get ingress ${APP_NAME}-canary -n ${NAMESPACE} &> /dev/null; then
        kubectl patch ingress ${APP_NAME}-canary -n ${NAMESPACE} \
            -p "{\"metadata\":{\"annotations\":{\"nginx.ingress.kubernetes.io/canary-weight\":\"${canary_percent}\"}}}"
    else
        log_warning "NGINX canary ingress not found, using replica-based traffic split"
        set_traffic_replicas $canary_percent
    fi
}

# Check canary health
check_canary_health() {
    log_info "Checking canary health..."

    local ready_pods=$(kubectl get deployment ${CANARY_DEPLOYMENT} -n ${NAMESPACE} \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired_pods=$(kubectl get deployment ${CANARY_DEPLOYMENT} -n ${NAMESPACE} \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

    if [ "$ready_pods" = "$desired_pods" ] && [ "$ready_pods" != "0" ]; then
        log_success "Canary is healthy (${ready_pods}/${desired_pods} pods ready)"
        return 0
    else
        log_error "Canary is not healthy (${ready_pods}/${desired_pods} pods ready)"
        return 1
    fi
}

# Monitor canary metrics
monitor_canary() {
    local duration=$1

    log_info "Monitoring canary for ${duration} seconds..."

    local end_time=$(($(date +%s) + duration))

    while [ $(date +%s) -lt $end_time ]; do
        local remaining=$((end_time - $(date +%s)))

        # Check if canary is still healthy
        if ! check_canary_health; then
            log_error "Canary health check failed during monitoring"
            return 1
        fi

        # Get pod status
        local canary_pods=$(kubectl get pods -n ${NAMESPACE} \
            -l app=${APP_NAME},track=canary \
            --no-headers 2>/dev/null | wc -l)

        local ready_canary=$(kubectl get pods -n ${NAMESPACE} \
            -l app=${APP_NAME},track=canary \
            --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)

        log_info "Canary status: ${ready_canary}/${canary_pods} running | Time remaining: ${remaining}s"

        sleep 30
    done

    log_success "Monitoring period completed"
    return 0
}

# Analyze canary metrics (placeholder for real metrics analysis)
analyze_metrics() {
    log_info "Analyzing canary metrics..."

    # In production, this should query your monitoring system (Prometheus, DataDog, etc.)
    # For now, we'll do a basic health check

    local canary_errors=$(kubectl logs -n ${NAMESPACE} \
        -l app=${APP_NAME},track=canary \
        --tail=100 2>/dev/null | grep -i "error" | wc -l || echo "0")

    log_info "Recent error count in canary logs: ${canary_errors}"

    if [ $canary_errors -gt 10 ]; then
        log_warning "High error count detected in canary"
        return 1
    fi

    log_success "Metrics analysis passed"
    return 0
}

# Progressive rollout
progressive_rollout() {
    local version=$1
    local auto_mode=$2

    log_info "=== Starting Progressive Canary Rollout ==="

    for stage in "${STAGES[@]}"; do
        log_info ""
        log_info "=== Stage: ${stage}% traffic to canary ==="

        # Set traffic split
        set_traffic_nginx $stage

        # Wait for traffic to settle
        sleep 10

        # Check health
        if ! check_canary_health; then
            log_error "Canary health check failed at ${stage}% stage"
            return 1
        fi

        if [ $stage -eq 100 ]; then
            log_success "=== Canary promoted to 100% traffic ==="
            break
        fi

        # Monitor canary
        if [ "$auto_mode" = true ]; then
            log_info "Auto mode: Monitoring for ${STAGE_DURATION} seconds..."

            if ! monitor_canary $STAGE_DURATION; then
                log_error "Monitoring failed at ${stage}% stage"
                return 1
            fi

            if ! analyze_metrics; then
                log_error "Metrics analysis failed at ${stage}% stage"
                return 1
            fi

            log_success "Stage ${stage}% passed, proceeding to next stage..."
        else
            log_info "Manual mode: Review canary at ${stage}% traffic"
            log_info "Canary URL: https://canary.crm.example.com"
            log_info ""
            read -p "Continue to next stage? (y/n) " -n 1 -r
            echo

            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_warning "Rollout paused at ${stage}%"
                log_info "Current state: ${stage}% canary, $((100 - stage))% stable"
                return 2  # Paused status
            fi
        fi
    done

    log_success "Progressive rollout completed"
    return 0
}

# Promote canary to stable
promote_canary() {
    local version=$1

    log_info "Promoting canary to stable..."

    # Update stable deployment to canary version
    kubectl set image deployment/${STABLE_DEPLOYMENT} \
        ${APP_NAME}=dummycomp/${APP_NAME}:${version} \
        -n ${NAMESPACE}

    # Wait for stable rollout
    kubectl rollout status deployment/${STABLE_DEPLOYMENT} -n ${NAMESPACE} --timeout=600s

    # Scale stable back to normal
    kubectl scale deployment/${STABLE_DEPLOYMENT} --replicas=9 -n ${NAMESPACE}

    # Remove canary deployment
    kubectl scale deployment/${CANARY_DEPLOYMENT} --replicas=0 -n ${NAMESPACE}

    # Remove canary ingress weight
    if kubectl get ingress ${APP_NAME}-canary -n ${NAMESPACE} &> /dev/null; then
        kubectl patch ingress ${APP_NAME}-canary -n ${NAMESPACE} \
            -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'
    fi

    log_success "Canary promoted to stable"
}

# Main function
main() {
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <version> [--auto]"
        echo "Example: $0 v2.0.0"
        echo "         $0 v2.0.0 --auto"
        exit 1
    fi

    local new_version=$1
    local auto_mode=false

    if [ $# -eq 2 ] && [ "$2" = "--auto" ]; then
        auto_mode=true
    fi

    log_info "=== Canary Deployment Start ==="
    log_info "Version: ${new_version}"
    log_info "Mode: $([ "$auto_mode" = true ] && echo 'Automatic' || echo 'Manual')"
    log_info "Namespace: ${NAMESPACE}"

    check_prerequisites

    # Deploy canary
    deploy_canary "$new_version"

    # Initial health check
    if ! check_canary_health; then
        log_error "Initial canary health check failed"
        exit 1
    fi

    # Progressive rollout
    progressive_rollout "$new_version" $auto_mode
    local rollout_result=$?

    if [ $rollout_result -eq 0 ]; then
        # Promote canary to stable
        log_info ""
        read -p "Promote canary to stable? (y/n) " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            promote_canary "$new_version"
            log_success "=== Deployment Successful ==="
            log_info "Version ${new_version} is now stable"
        else
            log_info "Canary is at 100% but not promoted to stable"
            log_info "You can promote later or rollback"
        fi
    elif [ $rollout_result -eq 2 ]; then
        log_info "Rollout paused. Run rollback if needed."
    else
        log_error "Rollout failed. Run rollback script to revert."
        exit 1
    fi
}

main "$@"
