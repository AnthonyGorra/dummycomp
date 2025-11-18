# Quick Start Guide - Deployment

Get started with deploying DummyComp CRM in under 5 minutes.

## Prerequisites

```bash
# Install required tools
brew install kubectl docker docker-buildx  # macOS
# or
apt-get install kubectl docker.io          # Ubuntu

# Verify installation
kubectl version --client
docker --version
```

## 1. Build Images (2 minutes)

```bash
# Build all services with cache optimization
make build-cache

# Or build and push to registry
./scripts/build-and-push.sh v1.0.0 --push
```

## 2. Choose Deployment Strategy

### Option A: Blue-Green (Zero Downtime)

```bash
# Deploy to green environment
./scripts/blue-green-deploy.sh v1.0.0 green

# Test green deployment
curl https://green.crm.example.com/api/health

# Switch traffic when ready
# (script will prompt for confirmation)
```

### Option B: Canary (Progressive Rollout)

```bash
# Automatic progressive rollout
./scripts/canary-deploy.sh v1.0.0 --auto

# Or manual with confirmations at each stage
./scripts/canary-deploy.sh v1.0.0
```

### Option C: Standard (Simple)

```bash
# Deploy with Kubernetes
kubectl apply -f k8s/base/
kubectl set image deployment/crm-app crm-app=dummycomp/crm-app:v1.0.0
```

## 3. Verify Deployment

```bash
# Check pod status
kubectl get pods -l app=crm-app

# Check health
curl https://crm.example.com/api/health

# View logs
kubectl logs -l app=crm-app --tail=100
```

## 4. Rollback (if needed)

```bash
# Automated rollback
./scripts/rollback.sh

# Or specify strategy
./scripts/rollback.sh --strategy blue-green
./scripts/rollback.sh --strategy canary
```

---

## Local Development

```bash
# Start development environment
make up-dev

# View logs
make logs

# Open application
open http://localhost:3000

# Stop
make down
```

---

## Common Commands

```bash
# Build
make build              # Build all services
make build-cache        # Build with cache
make build-crm         # Build CRM only

# Run
make up                 # Start all services
make up-dev            # Start dev environment
make up-prod           # Start prod environment

# Logs
make logs              # All services
make logs-crm          # CRM only
make logs-website      # Website only

# Maintenance
make clean             # Clean containers
make prune             # Deep clean
make health            # Check health
```

---

## GitHub Actions (CI/CD)

### Manual Deployment

1. Go to **Actions** tab
2. Select workflow:
   - **CD - Blue-Green Deployment**
   - **CD - Canary Deployment**
3. Click **Run workflow**
4. Fill in parameters
5. Monitor progress

### Automatic on Push

CI pipeline runs automatically on:
- Push to `main`, `develop`, `feature/*`
- Pull requests

---

## Environment Variables

Create `.env` file:

```bash
# Kubernetes
NAMESPACE=production

# Docker Registry
DOCKER_REGISTRY=ghcr.io
DOCKER_ORG=dummycomp

# Application
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
ANTHROPIC_API_KEY=your-api-key
```

Then:
```bash
source .env
./scripts/blue-green-deploy.sh v1.0.0 green
```

---

## Monitoring

```bash
# Watch pods
kubectl get pods -l app=crm-app -w

# Stream logs
kubectl logs -l app=crm-app -f

# Resource usage
kubectl top pods
kubectl top nodes

# Events
kubectl get events --sort-by='.lastTimestamp'
```

---

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Image pull errors
```bash
# Login to registry
docker login ghcr.io

# Create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token>
```

### Traffic not routing
```bash
# Check service
kubectl get service crm-app -o yaml

# Check endpoints
kubectl get endpoints crm-app

# Check ingress
kubectl describe ingress crm-app
```

---

## Next Steps

- Read full [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides
- Review [k8s/blue-green/README.md](k8s/blue-green/README.md) for blue-green details
- Review [k8s/canary/README.md](k8s/canary/README.md) for canary details
- Check [scripts/README.md](scripts/README.md) for script documentation

---

## Support

- **Issues:** Create GitHub issue
- **Documentation:** See `DEPLOYMENT.md`
- **Scripts Help:** `./scripts/<script>.sh --help`
- **Kubernetes:** `kubectl --help`
