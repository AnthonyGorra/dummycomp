# Canary Deployment Strategy

This directory contains Kubernetes manifests for implementing canary deployment for the CRM application.

## Overview

Canary deployment is a strategy that gradually rolls out new versions to a subset of users before rolling it out to the entire infrastructure. This allows you to test new versions in production with minimal risk.

## Architecture

- **Stable Deployment**: `crm-app-stable` - Current production version (90% traffic)
- **Canary Deployment**: `crm-app-canary` - New version being tested (10% traffic)
- **Traffic Splitting**: Controlled via replicas or service mesh

## Deployment Methods

### Method 1: Replica-based Traffic Split (Simple)

Traffic is split based on the number of replicas:
- Stable: 9 replicas (90% traffic)
- Canary: 1 replica (10% traffic)

```bash
# Deploy stable version
kubectl apply -f crm-app-stable.yaml
kubectl apply -f crm-app-service.yaml

# Deploy canary version
kubectl apply -f crm-app-canary.yaml

# Verify traffic split
kubectl get pods -l app=crm-app
```

### Method 2: NGINX Ingress Canary (Recommended)

Uses NGINX Ingress Controller's native canary support:

```bash
# Deploy both stable and canary
kubectl apply -f crm-app-stable.yaml
kubectl apply -f crm-app-canary.yaml
kubectl apply -f crm-app-service.yaml

# Deploy ingress with canary configuration
kubectl apply -f ingress-nginx.yaml
```

Adjust traffic percentage by editing the annotation:
```yaml
nginx.ingress.kubernetes.io/canary-weight: "10"  # 10% to canary
```

### Method 3: Istio Service Mesh (Advanced)

Requires Istio to be installed. Provides advanced traffic management:

```bash
# Install Istio (if not already installed)
istioctl install --set profile=production

# Label namespace for Istio injection
kubectl label namespace default istio-injection=enabled

# Deploy application and Istio configuration
kubectl apply -f crm-app-stable.yaml
kubectl apply -f crm-app-canary.yaml
kubectl apply -f crm-app-service.yaml
kubectl apply -f istio-virtualservice.yaml
```

## Canary Rollout Process

### Stage 1: Deploy Canary (10% traffic)

```bash
# Update canary deployment with new version
# Edit crm-app-canary.yaml: image: dummycomp/crm-app:v2.0.0

kubectl apply -f crm-app-canary.yaml

# Wait for canary to be ready
kubectl rollout status deployment/crm-app-canary

# Verify canary pods
kubectl get pods -l track=canary
```

### Stage 2: Monitor Canary

```bash
# Check canary logs
kubectl logs -l track=canary --tail=100 -f

# Monitor error rates
kubectl top pods -l track=canary

# Test canary directly
curl https://canary.crm.example.com/api/health

# With header-based routing (NGINX)
curl -H "X-Canary: always" https://crm.example.com/
```

### Stage 3: Increase Canary Traffic (if healthy)

#### For Replica-based:
```bash
# Gradually increase canary replicas
# 50-50 split
kubectl scale deployment crm-app-stable --replicas=5
kubectl scale deployment crm-app-canary --replicas=5

# Monitor metrics before proceeding
```

#### For NGINX Ingress:
```bash
# Increase canary weight to 50%
kubectl patch ingress crm-app-canary -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"50"}}}'
```

#### For Istio:
```bash
# Edit VirtualService weights
kubectl edit virtualservice crm-app
# Change weights: stable=50, canary=50
```

### Stage 4: Promote Canary to Stable

```bash
# Update stable deployment to canary version
kubectl set image deployment/crm-app-stable \
  crm-app=dummycomp/crm-app:v2.0.0

# Wait for stable rollout
kubectl rollout status deployment/crm-app-stable

# Remove canary deployment
kubectl delete deployment crm-app-canary

# For NGINX: Remove canary ingress
kubectl delete ingress crm-app-canary
```

### Stage 5: Rollback (if issues detected)

```bash
# Immediately scale down canary
kubectl scale deployment crm-app-canary --replicas=0

# Or delete canary
kubectl delete deployment crm-app-canary

# For NGINX: Set canary weight to 0
kubectl patch ingress crm-app-canary -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'

# For Istio: Update VirtualService
kubectl patch virtualservice crm-app --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"crm-app-stable","port":{"number":80}},"weight":100}]}]}}'
```

## Traffic Split Strategies

### Progressive Rollout Schedule
1. **10%** - Initial canary (1-2 hours)
2. **25%** - Quarter rollout (2-4 hours)
3. **50%** - Half rollout (4-8 hours)
4. **75%** - Majority rollout (8-12 hours)
5. **100%** - Full rollout (promote to stable)

### Header-based Canary (NGINX)

Test canary for specific users:
```bash
# Edit ingress to add header-based routing
nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
nginx.ingress.kubernetes.io/canary-by-header-value: "always"

# Users with header get canary
curl -H "X-Canary: always" https://crm.example.com/
```

## Monitoring Canary Health

### Key Metrics to Monitor
- Error rate (4xx, 5xx)
- Response time (p50, p95, p99)
- Request rate
- CPU and memory usage
- Custom business metrics

### Automated Canary Analysis

Example using Prometheus metrics:
```bash
# Check error rate
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -s http://prometheus:9090/api/v1/query?query='rate(http_requests_total{status=~"5..",track="canary"}[5m])'

# Compare stable vs canary error rates
```

## Advantages

- **Gradual Rollout**: Minimize impact of issues
- **Real Traffic Testing**: Test with actual production traffic
- **Quick Rollback**: Easy to revert if problems detected
- **Metrics Comparison**: Compare new version metrics with stable

## Best Practices

1. **Monitor Closely**: Watch metrics during canary phase
2. **Automated Checks**: Use automated canary analysis tools
3. **Gradual Increase**: Slowly increase traffic percentage
4. **Rollback Plan**: Have clear rollback criteria
5. **Time-based**: Set time windows for each phase
6. **A/B Testing**: Can be combined with feature flags

## Automation

See the `/scripts/canary-deploy.sh` script for automated canary deployments with progressive rollout.

## Additional Tools

- **Flagger**: Automated canary deployments with metrics analysis
- **Argo Rollouts**: Advanced progressive delivery
- **Spinnaker**: Multi-cloud continuous delivery platform
