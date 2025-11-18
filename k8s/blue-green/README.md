# Blue-Green Deployment Strategy

This directory contains Kubernetes manifests for implementing blue-green deployment for the CRM application.

## Overview

Blue-green deployment is a strategy that reduces downtime and risk by running two identical production environments (Blue and Green). At any time, only one environment is live, serving all production traffic.

## Architecture

- **Blue Deployment**: `crm-app-blue` - One version of the application
- **Green Deployment**: `crm-app-green` - New version of the application
- **Main Service**: Routes traffic to the active deployment
- **Preview Services**: Allow testing each deployment independently

## Deployment Process

### 1. Initial Deployment (Blue is active)

```bash
# Deploy blue environment
kubectl apply -f crm-app-blue.yaml
kubectl apply -f crm-app-service.yaml
kubectl apply -f ingress.yaml

# Verify blue is running
kubectl get pods -l version=blue
kubectl get svc crm-app
```

### 2. Deploy New Version to Green

```bash
# Update green deployment with new image
# Edit crm-app-green.yaml and update image tag
# image: dummycomp/crm-app:v2.0.0

kubectl apply -f crm-app-green.yaml

# Wait for green to be ready
kubectl rollout status deployment/crm-app-green

# Verify green pods are running
kubectl get pods -l version=green
```

### 3. Test Green Environment

```bash
# Access green environment via preview URL
# https://green.crm.example.com

# Run smoke tests
curl -f https://green.crm.example.com/api/health

# Check logs
kubectl logs -l version=green --tail=100
```

### 4. Switch Traffic to Green

```bash
# Update service to route to green
kubectl patch service crm-app -p '{"spec":{"selector":{"version":"green"}}}'

# Update annotation to track active version
kubectl annotate service crm-app blue-green.deployment/active-version=green --overwrite

# Verify traffic is routing to green
kubectl describe service crm-app
```

### 5. Monitor and Rollback if Needed

```bash
# Monitor green deployment
kubectl get pods -l version=green -w

# If issues occur, rollback to blue immediately
kubectl patch service crm-app -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl annotate service crm-app blue-green.deployment/active-version=blue --overwrite
```

### 6. Cleanup Old Blue Deployment

```bash
# After green is stable, scale down blue or keep it for quick rollback
kubectl scale deployment crm-app-blue --replicas=0

# Or update blue to latest version for next deployment
```

## Quick Commands

### Check Current Active Version
```bash
kubectl get service crm-app -o jsonpath='{.metadata.annotations.blue-green\.deployment/active-version}'
```

### Switch to Blue
```bash
kubectl patch service crm-app -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl annotate service crm-app blue-green.deployment/active-version=blue --overwrite
```

### Switch to Green
```bash
kubectl patch service crm-app -p '{"spec":{"selector":{"version":"green"}}}'
kubectl annotate service crm-app blue-green.deployment/active-version=green --overwrite
```

### Get Deployment Status
```bash
kubectl get deployments -l app=crm-app
kubectl get pods -l app=crm-app
kubectl get services -l app=crm-app
```

## Advantages

- **Zero Downtime**: Traffic switches instantly between environments
- **Easy Rollback**: Simply switch service selector back to previous version
- **Testing**: Test new version in production environment before switching traffic
- **Database Migrations**: Can run migrations on green before switching traffic

## Considerations

- Requires double the resources (both blue and green running)
- Database schema must be compatible with both versions during transition
- Session state may be lost during switch (use external session store)

## Automation

See the `/scripts/blue-green-deploy.sh` script for automated blue-green deployments.
