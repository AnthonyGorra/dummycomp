.PHONY: help build build-cache build-dev build-prod up up-dev up-prod down clean prune test

# Docker BuildKit optimization
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'

# Build targets
build: ## Build all services with cache optimization
	@echo "$(CYAN)Building all services with cache optimization...$(RESET)"
	DOCKER_BUILDKIT=1 docker-compose build --parallel

build-cache: ## Build with remote cache (requires registry access)
	@echo "$(CYAN)Building with remote cache...$(RESET)"
	DOCKER_BUILDKIT=1 docker-compose build \
		--build-arg BUILDKIT_INLINE_CACHE=1 \
		--parallel

build-dev: ## Build development images
	@echo "$(CYAN)Building development images...$(RESET)"
	docker-compose -f docker-compose.dev.yml build --parallel

build-prod: ## Build production images
	@echo "$(CYAN)Building production images...$(RESET)"
	docker-compose -f docker-compose.prod.yml build --parallel

build-crm: ## Build CRM app only
	@echo "$(CYAN)Building CRM app...$(RESET)"
	docker-compose build crm-app

build-website: ## Build website only
	@echo "$(CYAN)Building website...$(RESET)"
	docker-compose build website

# Run targets
up: ## Start all services
	@echo "$(CYAN)Starting all services...$(RESET)"
	docker-compose up -d

up-dev: ## Start development environment
	@echo "$(CYAN)Starting development environment...$(RESET)"
	docker-compose -f docker-compose.dev.yml up

up-prod: ## Start production environment
	@echo "$(CYAN)Starting production environment...$(RESET)"
	docker-compose -f docker-compose.prod.yml up -d

up-proxy: ## Start with nginx proxy
	@echo "$(CYAN)Starting with nginx proxy...$(RESET)"
	docker-compose --profile with-proxy up -d

down: ## Stop all services
	@echo "$(CYAN)Stopping all services...$(RESET)"
	docker-compose down
	docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Logs
logs: ## Show logs for all services
	docker-compose logs -f

logs-crm: ## Show logs for CRM app
	docker-compose logs -f crm-app

logs-website: ## Show logs for website
	docker-compose logs -f website

# Health checks
health: ## Check health of all services
	@echo "$(CYAN)Checking service health...$(RESET)"
	@docker ps --filter "label=com.dummycomp.service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Clean targets
clean: ## Remove stopped containers and dangling images
	@echo "$(CYAN)Cleaning up...$(RESET)"
	docker-compose down -v
	docker system prune -f

prune: ## Deep clean - remove all unused Docker resources
	@echo "$(CYAN)Pruning Docker system...$(RESET)"
	docker system prune -af --volumes

# Cache management
cache-clean: ## Clean build cache
	@echo "$(CYAN)Cleaning build cache...$(RESET)"
	docker builder prune -af

cache-inspect: ## Inspect build cache
	@echo "$(CYAN)Inspecting build cache...$(RESET)"
	docker buildx du

# Development helpers
dev-rebuild: ## Rebuild and restart development environment
	@echo "$(CYAN)Rebuilding development environment...$(RESET)"
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.dev.yml build --no-cache
	docker-compose -f docker-compose.dev.yml up

# Testing
test: ## Run tests in containers
	@echo "$(CYAN)Running tests...$(RESET)"
	docker-compose run --rm crm-app npm test
	docker-compose run --rm website npm test

test-crm: ## Run CRM app tests
	docker-compose run --rm crm-app npm test

test-website: ## Run website tests
	docker-compose run --rm website npm test

# Shell access
shell-crm: ## Open shell in CRM app container
	docker-compose exec crm-app sh

shell-website: ## Open shell in website container
	docker-compose exec website sh

# Quick deployment
deploy: build-prod ## Build and deploy production
	@echo "$(CYAN)Deploying to production...$(RESET)"
	docker-compose -f docker-compose.prod.yml up -d

# Tag and push images
push: ## Push images to registry
	@echo "$(CYAN)Pushing images to registry...$(RESET)"
	docker-compose push

# Database operations (if needed)
db-backup: ## Backup database (placeholder)
	@echo "$(CYAN)Database backup not yet implemented$(RESET)"

db-restore: ## Restore database (placeholder)
	@echo "$(CYAN)Database restore not yet implemented$(RESET)"

# Version management
version: ## Show current version
	@echo "$(CYAN)Current version: $${VERSION:-latest}$(RESET)"

tag: ## Tag images with version
	@if [ -z "$(VERSION)" ]; then echo "Usage: make tag VERSION=x.y.z"; exit 1; fi
	@echo "$(CYAN)Tagging images as $(VERSION)...$(RESET)"
	docker tag dummycomp/crm-app:latest dummycomp/crm-app:$(VERSION)
	docker tag dummycomp/website:latest dummycomp/website:$(VERSION)
