#!/bin/bash

###############################################################################
# Blue-Green Deployment Script
#
# This script automates blue-green deployments for the CRM application
#
# Usage:
#   ./blue-green-deploy.sh <new-version> <target-color>
#
# Example:
#   ./blue-green-deploy.sh v2.0.0 green
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-default}"
APP_NAME="crm-app"
HEALTH_CHECK_ENDPOINT="/api/health"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
SLEEP_BETWEEN_CHECKS=10

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if kubectl is available
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Function to get current active version
get_active_version() {
    local active_version=$(kubectl get service ${APP_NAME} -n ${NAMESPACE} \
        -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")

    if [ -z "$active_version" ]; then
        log_warning "No active version found, defaulting to blue"
        echo "blue"
    else
        echo "$active_version"
    fi
}

# Function to get inactive version
get_inactive_version() {
    local active_version=$1
    if [ "$active_version" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to deploy to specific color
deploy_to_color() {
    local version=$1
    local color=$2

    log_info "Deploying version ${version} to ${color} environment..."

    # Update deployment image
    kubectl set image deployment/${APP_NAME}-${color} \
        ${APP_NAME}=dummycomp/${APP_NAME}:${version} \
        -n ${NAMESPACE}

    # Wait for rollout to complete
    log_info "Waiting for rollout to complete..."
    kubectl rollout status deployment/${APP_NAME}-${color} -n ${NAMESPACE} --timeout=600s

    log_success "Deployment to ${color} completed"
}

# Function to check health of deployment
check_health() {
    local color=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + HEALTH_CHECK_TIMEOUT))

    log_info "Checking health of ${color} deployment..."

    while [ $(date +%s) -lt $end_time ]; do
        # Get pod count
        local ready_pods=$(kubectl get deployment ${APP_NAME}-${color} -n ${NAMESPACE} \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired_pods=$(kubectl get deployment ${APP_NAME}-${color} -n ${NAMESPACE} \
            -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

        if [ "$ready_pods" = "$desired_pods" ] && [ "$ready_pods" != "0" ]; then
            log_success "All ${ready_pods}/${desired_pods} pods are ready"

            # Additional health check via service endpoint
            log_info "Running additional health checks..."
            local service_url="http://${APP_NAME}-${color}.${NAMESPACE}.svc.cluster.local${HEALTH_CHECK_ENDPOINT}"

            # Try to hit health endpoint (this requires a pod with curl)
            if kubectl run health-check-${color} --rm -i --restart=Never \
                --image=curlimages/curl:latest -n ${NAMESPACE} -- \
                curl -f -s -m 5 "${service_url}" > /dev/null 2>&1; then
                log_success "Health check passed for ${color} deployment"
                return 0
            else
                log_warning "Health check endpoint not responding yet, retrying..."
            fi
        else
            log_info "Waiting for pods to be ready (${ready_pods}/${desired_pods})..."
        fi

        sleep ${SLEEP_BETWEEN_CHECKS}
    done

    log_error "Health check timeout for ${color} deployment"
    return 1
}

# Function to switch traffic
switch_traffic() {
    local target_color=$1

    log_info "Switching traffic to ${target_color}..."

    # Update service selector
    kubectl patch service ${APP_NAME} -n ${NAMESPACE} \
        -p "{\"spec\":{\"selector\":{\"version\":\"${target_color}\"}}}"

    # Update annotation to track active version
    kubectl annotate service ${APP_NAME} -n ${NAMESPACE} \
        blue-green.deployment/active-version=${target_color} --overwrite

    log_success "Traffic switched to ${target_color}"
}

# Function to verify traffic switch
verify_traffic() {
    local expected_color=$1

    log_info "Verifying traffic is routing to ${expected_color}..."

    local actual_color=$(kubectl get service ${APP_NAME} -n ${NAMESPACE} \
        -o jsonpath='{.spec.selector.version}')

    if [ "$actual_color" = "$expected_color" ]; then
        log_success "Traffic is correctly routing to ${expected_color}"
        return 0
    else
        log_error "Traffic routing verification failed. Expected: ${expected_color}, Actual: ${actual_color}"
        return 1
    fi
}

# Main deployment function
main() {
    if [ $# -ne 2 ]; then
        echo "Usage: $0 <version> <target-color>"
        echo "Example: $0 v2.0.0 green"
        exit 1
    fi

    local new_version=$1
    local target_color=$2

    # Validate target color
    if [ "$target_color" != "blue" ] && [ "$target_color" != "green" ]; then
        log_error "Invalid target color. Must be 'blue' or 'green'"
        exit 1
    fi

    log_info "=== Blue-Green Deployment Start ==="
    log_info "Version: ${new_version}"
    log_info "Target: ${target_color}"
    log_info "Namespace: ${NAMESPACE}"

    # Check prerequisites
    check_prerequisites

    # Get current active version
    local active_color=$(get_active_version)
    log_info "Current active environment: ${active_color}"

    if [ "$active_color" = "$target_color" ]; then
        log_warning "Target color ${target_color} is already active"
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi

    # Deploy to target color
    deploy_to_color "$new_version" "$target_color"

    # Health check
    if ! check_health "$target_color"; then
        log_error "Health check failed for ${target_color}"
        log_warning "Deployment is still available but not healthy"
        log_warning "You can manually rollback by running:"
        log_warning "  kubectl patch service ${APP_NAME} -n ${NAMESPACE} -p '{\"spec\":{\"selector\":{\"version\":\"${active_color}\"}}}'"
        exit 1
    fi

    # Prompt for traffic switch
    log_info ""
    log_info "=== Ready to Switch Traffic ==="
    log_info "Current active: ${active_color}"
    log_info "New deployment: ${target_color} (version ${new_version})"
    log_info ""
    log_info "You can test the new deployment at:"
    log_info "  https://${target_color}.crm.example.com"
    log_info ""
    read -p "Switch traffic to ${target_color}? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Switch traffic
        switch_traffic "$target_color"

        # Verify traffic switch
        if verify_traffic "$target_color"; then
            log_success "=== Deployment Successful ==="
            log_info "Version ${new_version} is now active on ${target_color}"
            log_info "Previous version on ${active_color} is still running for quick rollback"
            log_info ""
            log_info "To rollback, run:"
            log_info "  ./blue-green-deploy.sh <old-version> ${active_color}"
            log_info "  Or use the rollback script: ./rollback.sh"
        else
            log_error "Traffic verification failed"
            exit 1
        fi
    else
        log_info "Traffic switch cancelled"
        log_info "${target_color} deployment is ready but not receiving traffic"
    fi
}

# Run main function
main "$@"
