# Deployment Scripts

This directory contains automation scripts for building, deploying, and managing the DummyComp CRM application.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `build-and-push.sh` | Build and push Docker images | `./build-and-push.sh v1.0.0 --push` |
| `blue-green-deploy.sh` | Blue-green deployment | `./blue-green-deploy.sh v1.0.0 green` |
| `canary-deploy.sh` | Canary deployment | `./canary-deploy.sh v1.0.0 --auto` |
| `rollback.sh` | Automated rollback | `./rollback.sh --strategy canary` |

---

## build-and-push.sh

Builds optimized Docker images with BuildKit cache and pushes to registry.

### Features
- Multi-stage Docker builds
- BuildKit cache optimization
- Remote cache support
- Automatic tagging for deployment strategies
- Parallel builds for multiple services

### Usage

```bash
# Basic build
./build-and-push.sh v1.0.0

# Build and push
./build-and-push.sh v1.0.0 --push

# Build with remote cache
./build-and-push.sh v1.0.0 --cache-from ghcr.io/dummycomp --push

# Build only CRM app
./build-and-push.sh v1.0.0 --crm-only --push

# Build without cache
./build-and-push.sh v1.0.0 --no-cache --push
```

### Environment Variables

```bash
export DOCKER_REGISTRY=ghcr.io
export DOCKER_ORG=dummycomp
export BUILDKIT_PROGRESS=plain

./build-and-push.sh v1.0.0 --push
```

### Image Tags Created

For version `v1.0.0`, the following tags are created:

**CRM App:**
- `dummycomp/crm-app:v1.0.0`
- `dummycomp/crm-app:latest`
- `dummycomp/crm-app:blue` (for blue-green)
- `dummycomp/crm-app:green` (for blue-green)
- `dummycomp/crm-app:stable` (for canary)
- `dummycomp/crm-app:canary` (for canary)

**Website:**
- `dummycomp/website:v1.0.0`
- `dummycomp/website:latest`

---

## blue-green-deploy.sh

Automates blue-green deployments with health checks and traffic switching.

### Features
- Automatic deployment to blue or green environment
- Health check validation
- Safe traffic switching
- Interactive confirmation prompts
- Rollback guidance on failure

### Usage

```bash
# Deploy to green environment
./blue-green-deploy.sh v2.0.0 green

# Deploy to blue environment
./blue-green-deploy.sh v2.0.0 blue

# Set namespace
NAMESPACE=production ./blue-green-deploy.sh v2.0.0 green
```

### Workflow

1. **Deploy Phase**
   - Updates target color deployment with new version
   - Waits for rollout to complete
   - Verifies all pods are running

2. **Health Check Phase**
   - Checks pod readiness
   - Tests health endpoint
   - Monitors for 5 minutes

3. **Traffic Switch Phase** (Optional)
   - User confirmation required
   - Updates service selector
   - Verifies traffic routing

### Testing Deployments

Before switching traffic, test the deployment:

```bash
# Blue environment
curl https://blue.crm.example.com/api/health

# Green environment
curl https://green.crm.example.com/api/health
```

---

## canary-deploy.sh

Implements progressive canary deployment with automated or manual rollout.

### Features
- Progressive traffic rollout (10% → 25% → 50% → 75% → 100%)
- Automated health monitoring
- Metrics-based promotion
- Support for NGINX Ingress and replica-based traffic splitting
- Automatic rollback on failures

### Usage

```bash
# Manual progressive rollout
./canary-deploy.sh v2.0.0

# Automatic progressive rollout
./canary-deploy.sh v2.0.0 --auto

# Set namespace
NAMESPACE=production ./canary-deploy.sh v2.0.0 --auto
```

### Manual Mode

In manual mode, the script:
1. Deploys canary at 10% traffic
2. Runs health checks
3. Waits for user confirmation before each stage
4. Allows testing at each traffic percentage

### Automatic Mode

In automatic mode, the script:
1. Deploys canary at 10% traffic
2. Monitors metrics for 5 minutes
3. Automatically progresses through stages if healthy
4. Aborts and keeps canary at current % if issues detected

### Traffic Split Stages

| Stage | Traffic | Duration | Notes |
|-------|---------|----------|-------|
| 1 | 10% | Manual confirmation | Initial canary |
| 2 | 25% | 5 min (auto) | First increase |
| 3 | 50% | 5 min (auto) | Half traffic |
| 4 | 75% | 5 min (auto) | Majority traffic |
| 5 | 100% | Manual confirmation | Full rollout |

### Monitoring During Rollout

```bash
# Watch canary pods
kubectl get pods -l track=canary -w

# Check canary logs
kubectl logs -l track=canary --tail=100 -f

# Compare error rates
kubectl logs -l track=stable --tail=100 | grep ERROR | wc -l
kubectl logs -l track=canary --tail=100 | grep ERROR | wc -l
```

---

## rollback.sh

Automated rollback for all deployment strategies.

### Features
- Auto-detects deployment strategy
- Strategy-specific rollback procedures
- Health verification after rollback
- Smoke test execution
- Interactive and automatic modes

### Usage

```bash
# Auto-detect and rollback
./rollback.sh

# Specify strategy
./rollback.sh --strategy blue-green
./rollback.sh --strategy canary
./rollback.sh --strategy standard

# Rollback to specific version
./rollback.sh --strategy standard --to-version v1.5.0

# Skip confirmations
./rollback.sh --strategy blue-green --yes

# Set namespace
NAMESPACE=production ./rollback.sh --strategy canary
```

### Rollback Strategies

#### Blue-Green Rollback
- Switches traffic to inactive environment
- Scales up inactive environment if needed
- Verifies health before completing

#### Canary Rollback
- Scales canary to 0 replicas
- Restores stable to 100% traffic
- Removes canary ingress weights

#### Standard Rollback
- Uses Kubernetes native rollback
- Can specify version or previous revision
- Monitors rollout status

### Verification

After rollback, the script:
1. Waits for pods to be ready
2. Runs health checks
3. Executes smoke tests
4. Reports final status

---

## Environment Variables

All scripts support these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NAMESPACE` | Kubernetes namespace | `default` |
| `DOCKER_REGISTRY` | Container registry | `docker.io` |
| `DOCKER_ORG` | Registry organization | `dummycomp` |
| `BUILDKIT_PROGRESS` | Build output mode | `auto` |

### Example

```bash
export NAMESPACE=production
export DOCKER_REGISTRY=ghcr.io
export DOCKER_ORG=mycompany

./blue-green-deploy.sh v2.0.0 green
```

---

## Prerequisites

### Required Tools

- `kubectl` - Kubernetes CLI
- `docker` - Docker CLI with BuildKit support
- `bash` - Bash shell (v4+)

### Kubernetes Cluster

- Access to Kubernetes cluster
- Valid kubeconfig
- Appropriate RBAC permissions

### Container Registry

- Registry credentials configured
- Push access to registry

### Verify Setup

```bash
# Check kubectl
kubectl version --client
kubectl cluster-info

# Check Docker
docker version
docker buildx version

# Check bash version
bash --version
```

---

## Error Handling

All scripts include comprehensive error handling:

- **Exit on error:** Scripts exit immediately on command failures
- **Color-coded output:**
  - 🔵 Blue: Info messages
  - ✅ Green: Success messages
  - ⚠️ Yellow: Warnings
  - ❌ Red: Error messages
- **Validation:** Pre-flight checks before execution
- **Rollback guidance:** Instructions provided on failure

---

## Best Practices

1. **Always test in staging** before production
2. **Use version tags** (not `latest`) for production
3. **Monitor during deployment** - don't walk away
4. **Keep terminal logs** for troubleshooting
5. **Verify health checks** before switching traffic
6. **Have rollback ready** before deploying
7. **Use `--yes` flag** only in automation
8. **Set appropriate timeouts** for your application
9. **Review logs** after deployment
10. **Document changes** in deployment notes

---

## Troubleshooting

### Script fails with "command not found"

Ensure scripts are executable:
```bash
chmod +x scripts/*.sh
```

### kubectl connection errors

Check kubeconfig:
```bash
kubectl cluster-info
kubectl get nodes
```

### Docker build failures

Check BuildKit:
```bash
export DOCKER_BUILDKIT=1
docker buildx ls
```

### Permission denied errors

Check registry login:
```bash
docker login ghcr.io
```

---

## Integration with CI/CD

These scripts are designed to work with GitHub Actions but can be integrated with any CI/CD system:

### GitHub Actions
```yaml
- name: Deploy with blue-green
  run: ./scripts/blue-green-deploy.sh ${{ github.ref_name }} green
```

### GitLab CI
```yaml
deploy:
  script:
    - ./scripts/canary-deploy.sh ${CI_COMMIT_TAG} --auto
```

### Jenkins
```groovy
sh "./scripts/rollback.sh --strategy canary --yes"
```

---

## Support

For issues or questions:

1. Check script output for error messages
2. Review logs with `kubectl logs`
3. Consult [DEPLOYMENT.md](../DEPLOYMENT.md)
4. Create GitHub issue with:
   - Script name and command used
   - Full error output
   - Kubernetes version
   - Deployment strategy

---

## Contributing

When adding new scripts:

1. Follow existing naming conventions
2. Include comprehensive error handling
3. Add color-coded output
4. Provide usage examples
5. Update this README
6. Add to main DEPLOYMENT.md
