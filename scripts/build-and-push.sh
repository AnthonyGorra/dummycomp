#!/bin/bash

###############################################################################
# Build and Push Docker Images
#
# This script builds optimized Docker images and pushes them to registry
#
# Usage:
#   ./build-and-push.sh <version> [--cache-from REGISTRY] [--push]
#
# Example:
#   ./build-and-push.sh v2.0.0 --push
#   ./build-and-push.sh v2.0.0 --cache-from ghcr.io/dummycomp --push
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
ORG="${DOCKER_ORG:-dummycomp}"
BUILDKIT_PROGRESS="${BUILDKIT_PROGRESS:-auto}"

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Show usage
show_usage() {
    cat << EOF
Usage: $0 <version> [OPTIONS]

Build and push Docker images with BuildKit optimization

OPTIONS:
    --cache-from REGISTRY  Use remote cache from registry
    --push                 Push images to registry after build
    --no-cache            Build without cache
    --crm-only            Build only CRM app
    --website-only        Build only website
    -h, --help            Show this help message

ENVIRONMENT VARIABLES:
    DOCKER_REGISTRY       Registry URL (default: docker.io)
    DOCKER_ORG           Organization name (default: dummycomp)
    BUILDKIT_PROGRESS    Progress output type (default: auto)

EXAMPLES:
    $0 v2.0.0 --push
    $0 v2.0.0 --cache-from ghcr.io/dummycomp --push
    DOCKER_REGISTRY=ghcr.io $0 v2.0.0 --push

EOF
}

# Parse arguments
parse_args() {
    if [ $# -lt 1 ]; then
        show_usage
        exit 1
    fi

    VERSION=$1
    shift

    CACHE_FROM=""
    PUSH_IMAGES=false
    USE_CACHE=true
    BUILD_CRM=true
    BUILD_WEBSITE=true

    while [[ $# -gt 0 ]]; do
        case $1 in
            --cache-from)
                CACHE_FROM="$2"
                shift 2
                ;;
            --push)
                PUSH_IMAGES=true
                shift
                ;;
            --no-cache)
                USE_CACHE=false
                shift
                ;;
            --crm-only)
                BUILD_WEBSITE=false
                shift
                ;;
            --website-only)
                BUILD_CRM=false
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check if BuildKit is enabled
    if ! docker buildx version &> /dev/null; then
        log_error "Docker BuildKit is not available"
        log_info "Enable BuildKit: export DOCKER_BUILDKIT=1"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Build image
build_image() {
    local app_name=$1
    local context_dir=$2
    local image_name="${REGISTRY}/${ORG}/${app_name}"

    log_info "Building ${app_name}..."
    log_info "Image: ${image_name}:${VERSION}"
    log_info "Context: ${context_dir}"

    # Build args
    local build_args=(
        --file "${context_dir}/Dockerfile"
        --tag "${image_name}:${VERSION}"
        --tag "${image_name}:latest"
        --build-arg BUILDKIT_INLINE_CACHE=1
        --progress="${BUILDKIT_PROGRESS}"
    )

    # Add cache configuration
    if [ "$USE_CACHE" = true ]; then
        if [ -n "$CACHE_FROM" ]; then
            log_info "Using remote cache from: ${CACHE_FROM}/${app_name}"
            build_args+=(--cache-from "type=registry,ref=${CACHE_FROM}/${app_name}:latest")
        fi
        build_args+=(--cache-from "type=registry,ref=${image_name}:latest")
    else
        build_args+=(--no-cache)
    fi

    # Build
    DOCKER_BUILDKIT=1 docker build "${build_args[@]}" "${context_dir}"

    if [ $? -eq 0 ]; then
        log_success "${app_name} built successfully"
        return 0
    else
        log_error "Failed to build ${app_name}"
        return 1
    fi
}

# Push image
push_image() {
    local app_name=$1
    local image_name="${REGISTRY}/${ORG}/${app_name}"

    log_info "Pushing ${app_name}:${VERSION}..."

    docker push "${image_name}:${VERSION}"
    docker push "${image_name}:latest"

    if [ $? -eq 0 ]; then
        log_success "${app_name} pushed successfully"
        return 0
    else
        log_error "Failed to push ${app_name}"
        return 1
    fi
}

# Tag for deployment strategies
tag_for_strategies() {
    local app_name=$1
    local image_name="${REGISTRY}/${ORG}/${app_name}"

    log_info "Tagging for deployment strategies..."

    # Tag for blue-green
    docker tag "${image_name}:${VERSION}" "${image_name}:blue"
    docker tag "${image_name}:${VERSION}" "${image_name}:green"

    # Tag for canary
    docker tag "${image_name}:${VERSION}" "${image_name}:stable"
    docker tag "${image_name}:${VERSION}" "${image_name}:canary"

    if [ "$PUSH_IMAGES" = true ]; then
        log_info "Pushing strategy tags..."
        docker push "${image_name}:blue"
        docker push "${image_name}:green"
        docker push "${image_name}:stable"
        docker push "${image_name}:canary"
    fi

    log_success "Strategy tags created"
}

# Main function
main() {
    parse_args "$@"

    log_info "=== Docker Build and Push ==="
    log_info "Version: ${VERSION}"
    log_info "Registry: ${REGISTRY}"
    log_info "Organization: ${ORG}"
    log_info "Push: ${PUSH_IMAGES}"
    log_info "Use cache: ${USE_CACHE}"

    check_prerequisites

    # Build CRM app
    if [ "$BUILD_CRM" = true ]; then
        if build_image "crm-app" "./crm-app"; then
            tag_for_strategies "crm-app"

            if [ "$PUSH_IMAGES" = true ]; then
                push_image "crm-app"
            fi
        else
            exit 1
        fi
    fi

    # Build website
    if [ "$BUILD_WEBSITE" = true ]; then
        if build_image "website" "./website"; then
            if [ "$PUSH_IMAGES" = true ]; then
                push_image "website"
            fi
        else
            exit 1
        fi
    fi

    log_success "=== Build Complete ==="

    if [ "$PUSH_IMAGES" = true ]; then
        log_info ""
        log_info "Images pushed to registry:"
        [ "$BUILD_CRM" = true ] && log_info "  - ${REGISTRY}/${ORG}/crm-app:${VERSION}"
        [ "$BUILD_WEBSITE" = true ] && log_info "  - ${REGISTRY}/${ORG}/website:${VERSION}"
    else
        log_info ""
        log_info "Images built locally. Use --push to push to registry."
    fi
}

main "$@"
