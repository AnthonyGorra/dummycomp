# Deployment Guide

This guide covers all deployment strategies and automation tools available for the DummyComp CRM application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Build & Docker](#build--docker)
3. [Deployment Strategies](#deployment-strategies)
4. [CI/CD Pipelines](#cicd-pipelines)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development

```bash
# Start development environment
make up-dev

# View logs
make logs

# Stop environment
make down
```

### Production Build

```bash
# Build all services
make build

# Build with cache optimization
make build-cache

# Build and push to registry
./scripts/build-and-push.sh v1.0.0 --push
```

---

## Build & Docker

### Multi-Stage Docker Build

The application uses optimized multi-stage Docker builds with:
- ✅ BuildKit cache mounts for faster builds
- ✅ Dependency layer optimization
- ✅ Production-only dependencies in final image
- ✅ Security hardening (non-root user, read-only filesystem)
- ✅ Health checks built-in

#### Build Optimization Features

**BuildKit Cache Mounts:**
```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline
```

**Next.js Cache:**
```dockerfile
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
```

### Docker Compose

Three compose files for different scenarios:

1. **docker-compose.yml** - Standard deployment
2. **docker-compose.dev.yml** - Development with hot reload
3. **docker-compose.prod.yml** - Production with replicas

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Makefile Commands

```bash
make help                # Show all available commands
make build              # Build all services
make build-cache        # Build with cache optimization
make up                 # Start all services
make down               # Stop all services
make logs               # View logs
make health             # Check service health
make clean              # Clean up containers
make prune              # Deep clean (removes all unused resources)
```

---

## Deployment Strategies

### 1. Blue-Green Deployment

**Overview:**
- Two identical environments (blue and green)
- Zero-downtime deployments
- Instant rollback capability
- Suitable for major version changes

**Directory:** `k8s/blue-green/`

#### Deploy to Green Environment

```bash
# Using automation script
./scripts/blue-green-deploy.sh v2.0.0 green

# Manual Kubernetes commands
kubectl apply -f k8s/blue-green/crm-app-green.yaml
kubectl set image deployment/crm-app-green crm-app=dummycomp/crm-app:v2.0.0
kubectl rollout status deployment/crm-app-green
```

#### Switch Traffic

```bash
# Switch to green
kubectl patch service crm-app -p '{"spec":{"selector":{"version":"green"}}}'

# Verify
kubectl get service crm-app -o yaml | grep version
```

#### Testing URLs

- Production: `https://crm.example.com`
- Blue Preview: `https://blue.crm.example.com`
- Green Preview: `https://green.crm.example.com`

#### Using GitHub Actions

Navigate to: **Actions → CD - Blue-Green Deployment**

1. Click "Run workflow"
2. Enter version (e.g., `v2.0.0`)
3. Select target color (blue/green)
4. Choose environment (staging/production)
5. Optionally enable auto-switch

### 2. Canary Deployment

**Overview:**
- Gradual rollout to subset of users
- Traffic splitting (10% → 25% → 50% → 75% → 100%)
- Metrics-based promotion
- Suitable for continuous deployment

**Directory:** `k8s/canary/`

#### Deploy Canary

```bash
# Using automation script (automatic progressive rollout)
./scripts/canary-deploy.sh v2.0.0 --auto

# Manual progressive rollout
./scripts/canary-deploy.sh v2.0.0
```

#### Traffic Splitting Methods

**Method 1: NGINX Ingress (Recommended)**
```bash
# Set canary to 10%
kubectl patch ingress crm-app-canary \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"10"}}}'

# Increase to 25%
kubectl patch ingress crm-app-canary \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"25"}}}'
```

**Method 2: Replica-based**
```bash
# 10% canary, 90% stable
kubectl scale deployment/crm-app-stable --replicas=9
kubectl scale deployment/crm-app-canary --replicas=1
```

**Method 3: Istio Service Mesh**
```bash
kubectl apply -f k8s/canary/istio-virtualservice.yaml
# Edit VirtualService to adjust traffic weights
```

#### Progressive Rollout Stages

| Stage | Traffic % | Duration | Rollback Window |
|-------|-----------|----------|-----------------|
| 1     | 10%       | 5 min    | Immediate       |
| 2     | 25%       | 5 min    | < 1 min         |
| 3     | 50%       | 10 min   | < 1 min         |
| 4     | 75%       | 10 min   | < 2 min         |
| 5     | 100%      | -        | < 5 min         |

#### Using GitHub Actions

Navigate to: **Actions → CD - Canary Deployment**

1. Click "Run workflow"
2. Enter version
3. Select environment
4. Choose initial traffic percentage
5. Enable auto-promote for automated rollout

### 3. Standard Rolling Update

**Overview:**
- Default Kubernetes rolling update
- Suitable for simple deployments
- No additional infrastructure needed

```bash
# Deploy new version
kubectl set image deployment/crm-app crm-app=dummycomp/crm-app:v2.0.0

# Monitor rollout
kubectl rollout status deployment/crm-app

# Rollback if needed
kubectl rollout undo deployment/crm-app
```

---

## CI/CD Pipelines

### GitHub Actions Workflows

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to main/develop/feature branches
- Pull requests

**Jobs:**
- ✅ Lint code (ESLint)
- ✅ Run tests
- ✅ Security scanning (Trivy)
- ✅ Build Docker images
- ✅ Push to container registry
- ✅ Image vulnerability scanning

**Usage:**
Automatically runs on every push and PR.

#### 2. Blue-Green CD (`.github/workflows/cd-blue-green.yml`)

**Triggers:** Manual workflow dispatch

**Steps:**
1. Deploy to target color (blue/green)
2. Run health checks
3. Optionally switch traffic
4. Send notifications

**Usage:**
```bash
# Via GitHub UI
Actions → CD - Blue-Green Deployment → Run workflow

# Via GitHub CLI
gh workflow run cd-blue-green.yml \
  -f version=v2.0.0 \
  -f target_color=green \
  -f environment=production \
  -f auto_switch=true
```

#### 3. Canary CD (`.github/workflows/cd-canary.yml`)

**Triggers:** Manual workflow dispatch

**Steps:**
1. Deploy canary version
2. Set initial traffic percentage
3. Monitor metrics (5 minutes)
4. Progressively increase traffic (if auto-promote enabled)
5. Send notifications

**Usage:**
```bash
gh workflow run cd-canary.yml \
  -f version=v2.0.0 \
  -f environment=production \
  -f traffic_percentage=10 \
  -f auto_promote=false
```

#### 4. Rollback (`.github/workflows/rollback.yml`)

**Triggers:** Manual workflow dispatch

**Steps:**
1. Auto-detect or use specified strategy
2. Execute rollback
3. Verify rollback
4. Run smoke tests
5. Create incident issue if failed

**Usage:**
```bash
gh workflow run rollback.yml \
  -f strategy=blue-green \
  -f environment=production
```

### Required Secrets

Configure these in GitHub repository settings:

```yaml
KUBECONFIG                    # Base64 encoded kubeconfig
NEXT_PUBLIC_SUPABASE_URL      # Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon key
N8N_WEBHOOK_URL               # N8N webhook URL
N8N_API_KEY                   # N8N API key
WEBHOOK_SECRET                # Webhook secret
ANTHROPIC_API_KEY             # Claude API key
```

---

## Rollback Procedures

### Automated Rollback

```bash
# Using rollback script (auto-detects strategy)
./scripts/rollback.sh

# Specify strategy
./scripts/rollback.sh --strategy blue-green
./scripts/rollback.sh --strategy canary

# Skip confirmation
./scripts/rollback.sh --strategy blue-green --yes
```

### Manual Rollback

#### Blue-Green Rollback

```bash
# Get current active version
kubectl get service crm-app -o jsonpath='{.spec.selector.version}'

# Switch to other color (if blue is active, switch to green)
kubectl patch service crm-app \
  -p '{"spec":{"selector":{"version":"green"}}}'
```

#### Canary Rollback

```bash
# Scale down canary
kubectl scale deployment/crm-app-canary --replicas=0

# Scale up stable
kubectl scale deployment/crm-app-stable --replicas=10

# Remove canary traffic
kubectl patch ingress crm-app-canary \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'
```

#### Standard Rollback

```bash
# Rollback to previous revision
kubectl rollout undo deployment/crm-app

# Rollback to specific revision
kubectl rollout undo deployment/crm-app --to-revision=3

# Check rollout history
kubectl rollout history deployment/crm-app
```

### Using GitHub Actions for Rollback

Navigate to: **Actions → Rollback Deployment**

1. Click "Run workflow"
2. Select strategy (blue-green/canary/standard)
3. Choose environment
4. Optionally specify version

---

## Monitoring & Health Checks

### Health Check Endpoint

All deployments include a health check endpoint:

```bash
# Test health endpoint
curl https://crm.example.com/api/health

# Expected response: 200 OK
```

### Kubernetes Health Checks

All deployments include:

**Liveness Probe:**
- Checks if application is alive
- Restarts pod if failing
- Path: `/api/health`
- Interval: 10s

**Readiness Probe:**
- Checks if application is ready to serve traffic
- Removes from load balancer if failing
- Path: `/api/health`
- Interval: 5s

**Startup Probe:**
- Gives application time to start
- Protects slow-starting containers
- Failure threshold: 12 (60s max)

### Pod Status

```bash
# Check pod status
kubectl get pods -l app=crm-app

# Check pod events
kubectl describe pod <pod-name>

# Check logs
kubectl logs -l app=crm-app --tail=100

# Stream logs
kubectl logs -l app=crm-app -f
```

### Metrics & Monitoring

**Prometheus Integration:**
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/api/metrics"
```

**Key Metrics to Monitor:**
- Request rate
- Error rate (4xx, 5xx)
- Response time (p50, p95, p99)
- CPU and memory usage
- Pod restart count

---

## Troubleshooting

### Common Issues

#### 1. Image Pull Errors

```bash
# Check image pull secrets
kubectl get secrets

# Create registry secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token>

# Add to deployment
spec:
  imagePullSecrets:
  - name: ghcr-secret
```

#### 2. Pods Not Ready

```bash
# Check pod events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check resources
kubectl top pod <pod-name>

# Check node resources
kubectl top nodes
```

#### 3. Traffic Not Switching

```bash
# Verify service selector
kubectl get service crm-app -o yaml

# Check endpoints
kubectl get endpoints crm-app

# Verify ingress
kubectl describe ingress crm-app
```

#### 4. Build Cache Issues

```bash
# Clear Docker build cache
docker builder prune -af

# Build without cache
docker build --no-cache -t crm-app .

# Check BuildKit status
docker buildx ls
```

### Debug Commands

```bash
# Get pod shell
kubectl exec -it <pod-name> -- sh

# Check DNS
kubectl exec -it <pod-name> -- nslookup crm-app

# Test connectivity
kubectl exec -it <pod-name> -- wget -O- http://crm-app/api/health

# View deployment history
kubectl rollout history deployment/crm-app

# Check resource usage
kubectl top pods
kubectl top nodes

# Event log
kubectl get events --sort-by='.lastTimestamp'
```

### Getting Help

- **Documentation:** See individual README files in `k8s/` subdirectories
- **Scripts:** Check `scripts/` directory for automation tools
- **Issues:** Create GitHub issue with deployment logs
- **Logs:** Include output from `kubectl describe` and `kubectl logs`

---

## Best Practices

1. **Always test in staging first** before production deployments
2. **Monitor metrics** during canary rollouts
3. **Keep rollback window** small (< 5 minutes for critical issues)
4. **Use semantic versioning** for image tags
5. **Document changes** in deployment notes
6. **Run smoke tests** after deployment
7. **Have rollback plan** ready before deployment
8. **Review resource limits** before scaling
9. **Check dependencies** before upgrading
10. **Backup data** before major version changes

---

## Additional Resources

- [Blue-Green Deployment Guide](k8s/blue-green/README.md)
- [Canary Deployment Guide](k8s/canary/README.md)
- [Makefile Commands](#makefile-commands)
- [Deployment Scripts](scripts/)
- [GitHub Actions Workflows](.github/workflows/)
