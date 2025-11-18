# Network Segmentation

Network segmentation isolates different parts of the application infrastructure to limit the blast radius of security breaches and contain attacks.

## Overview

The network is segmented into multiple isolated layers:

1. **Public Layer** - Load balancers, reverse proxies (internet-facing)
2. **Application Layer** - Application servers (private, NAT access)
3. **Database Layer** - Databases, caches (completely isolated)
4. **Management Layer** - Bastion hosts (VPN access only)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Internet                           │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │   Public Network     │
         │   (172.20.0.0/16)    │
         │                      │
         │  ┌────────────────┐  │
         │  │  Nginx/ALB     │  │
         │  │  (Public IPs)  │  │
         │  └────────┬───────┘  │
         └───────────┼──────────┘
                     │
         ┌───────────▼──────────┐
         │  Application Network │
         │   (172.21.0.0/16)    │
         │                      │
         │  ┌────────────────┐  │
         │  │   CRM App      │  │
         │  │   (No public   │  │
         │  │    access)     │  │
         │  └────────┬───────┘  │
         └───────────┼──────────┘
                     │
         ┌───────────▼──────────┐
         │  Database Network    │
         │   (172.22.0.0/16)    │
         │   (ISOLATED)         │
         │                      │
         │  ┌────────────────┐  │
         │  │  PostgreSQL    │  │
         │  │  Redis         │  │
         │  │  (No internet) │  │
         │  └────────────────┘  │
         └──────────────────────┘

    ┌──────────────────────────────┐
    │     VPN Network              │
    │     (172.23.0.0/16)          │
    │                              │
    │  ┌────────────────────────┐  │
    │  │  Bastion Host          │  │
    │  │  (Admin access only)   │  │
    │  └────────────────────────┘  │
    └──────────────────────────────┘
```

## Docker Implementation

### Quick Start

```bash
cd infrastructure/network-segmentation
docker-compose -f docker-compose.segmented.yml up -d
```

### Network Layers

**1. Public Network (172.20.0.0/16)**
- Internet-accessible
- Nginx reverse proxy
- SSL termination
- DDoS protection

**2. Application Network (172.21.0.0/16)**
- Application servers
- No direct internet access (only via proxy)
- Can make outbound HTTPS calls
- Can connect to database network

**3. Database Network (172.22.0.0/16)**
- **Completely isolated** (internal: true)
- No internet access (inbound or outbound)
- Only accessible from application network
- PostgreSQL and Redis

**4. VPN Network (172.23.0.0/16)**
- Bastion host for admin access
- Requires VPN connection
- Can access all networks for maintenance

### Access Database (Maintenance Mode)

```bash
# Start with bastion host
docker-compose -f docker-compose.segmented.yml --profile maintenance up -d

# Connect to bastion
docker exec -it crm-bastion sh

# Access PostgreSQL from bastion
psql -h database -U your_user -d your_database

# Access Redis from bastion
redis-cli -h redis -a your_password
```

## AWS Implementation

### Prerequisites

- AWS account with appropriate permissions
- Terraform installed
- AWS CLI configured

### Deployment

```bash
cd infrastructure/network-segmentation/aws

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply configuration
terraform apply
```

### VPC Architecture

**Public Subnets** (10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24)
- Application Load Balancer
- NAT Gateways
- Internet Gateway attached

**Private App Subnets** (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24)
- EC2 instances (application servers)
- Internet access via NAT Gateway
- Can connect to database subnets

**Isolated DB Subnets** (10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24)
- RDS PostgreSQL instances
- ElastiCache Redis instances
- **NO internet access**
- Only accessible from app subnets

### Security Groups

**ALB Security Group**
- Inbound: 80, 443 from 0.0.0.0/0
- Outbound: 3000 to App SG only

**Application Security Group**
- Inbound: 3000 from ALB SG, 22 from Bastion SG
- Outbound: 5432 to DB SG, 6379 to Redis SG, 443 to internet

**Database Security Group**
- Inbound: 5432 from App SG and Bastion SG
- Outbound: NONE (responses only)

**Redis Security Group**
- Inbound: 6379 from App SG and Bastion SG
- Outbound: NONE (responses only)

**Bastion Security Group**
- Inbound: 22 from VPN CIDR only
- Outbound: 22 to App SG, 5432 to DB SG, 6379 to Redis SG

## Database Security

### PostgreSQL Configuration

**Authentication** (`pg_hba.conf`):
- Only allows connections from specific networks
- Requires SCRAM-SHA-256 authentication
- Rejects all other connections

**Connection Security**:
- SSL/TLS required for all connections
- TLS 1.2 minimum
- Strong cipher suites

**Access Control**:
- Row-Level Security (RLS) enabled
- User privileges strictly limited
- No superuser remote access

### PostgreSQL Hardening

```bash
# Generate SSL certificates
openssl req -new -x509 -days 365 -nodes -text \
  -out server.crt \
  -keyout server.key \
  -subj "/CN=database"

# Copy to PostgreSQL container
docker cp server.crt crm-database:/var/lib/postgresql/
docker cp server.key crm-database:/var/lib/postgresql/
docker exec crm-database chmod 600 /var/lib/postgresql/server.key
docker exec crm-database chown postgres:postgres /var/lib/postgresql/server.*

# Restart database
docker-compose restart database
```

## Monitoring

### VPC Flow Logs (AWS)

All network traffic is logged to CloudWatch:

```bash
# View flow logs
aws logs tail /aws/vpc/crm-app-production --follow

# Query rejected connections
aws logs filter-log-events \
  --log-group-name /aws/vpc/crm-app-production \
  --filter-pattern "[version, account, eni, source, destination, srcport, destport, protocol, packets, bytes, windowstart, windowend, action=REJECT, flowlogstatus]"
```

### Docker Network Monitoring

```bash
# View network connections
docker network inspect database_network

# Monitor network traffic
docker run --rm -it --net container:crm-app nicolaka/netshoot
# Inside container: tcpdump -i eth0

# Check connectivity
docker exec crm-app ping -c 3 database  # Should work
docker exec crm-app ping -c 3 google.com  # Should work
docker exec database ping -c 3 google.com  # Should FAIL (isolated)
```

## Backup Strategy

Daily automated backups run from within the database network:

```bash
# Manual backup
docker exec crm-db-backup sh /backup.sh

# View backups
docker exec crm-db-backup ls -lh /backup/

# Restore from backup
docker exec -i crm-database psql -U your_user -d your_database < backup_20240101_120000.sql
```

## Firewall Rules (iptables)

For additional security on the host:

```bash
# Block direct database access from internet
sudo iptables -A INPUT -p tcp --dport 5432 -s 0.0.0.0/0 -j DROP
sudo iptables -A INPUT -p tcp --dport 6379 -s 0.0.0.0/0 -j DROP

# Allow only from Docker networks
sudo iptables -A INPUT -p tcp --dport 5432 -s 172.22.0.0/16 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -s 172.22.0.0/16 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

## Testing Network Segmentation

### Test Database Isolation

```bash
# This should FAIL - database has no internet access
docker exec crm-database ping -c 3 8.8.8.8
# Expected: "Network is unreachable"

# This should WORK - app can reach database
docker exec crm-app nc -zv database 5432
# Expected: "Connection to database 5432 port [tcp/postgresql] succeeded!"

# This should FAIL - external access to database
curl http://YOUR_SERVER_IP:5432
# Expected: Connection refused or timeout
```

### Test Application Isolation

```bash
# This should WORK - app has internet via NAT
docker exec crm-app curl -I https://google.com

# This should FAIL - direct access to app container
curl http://YOUR_SERVER_IP:3000
# Expected: Connection refused (only accessible via nginx)
```

## Compliance

This network segmentation helps meet compliance requirements:

- **PCI DSS**: Network isolation for cardholder data
- **HIPAA**: Protected health information (PHI) isolation
- **SOC 2**: Security controls and access restrictions
- **GDPR**: Data protection by design

## Best Practices

1. **Principle of Least Privilege**: Only allow necessary connections
2. **Defense in Depth**: Multiple layers of security
3. **Network Monitoring**: Log all network traffic
4. **Regular Audits**: Review security group rules monthly
5. **Bastion Access**: Never expose databases to internet
6. **VPN Required**: All admin access through VPN
7. **Automated Backups**: Daily backups in isolated network
8. **Encryption**: All data in transit encrypted (TLS)

## Troubleshooting

### Cannot Connect to Database

```bash
# Check network connectivity
docker exec crm-app nc -zv database 5432

# Check pg_hba.conf
docker exec crm-database cat /etc/postgresql/pg_hba.conf

# Check PostgreSQL logs
docker logs crm-database

# Verify network membership
docker network inspect database_network
```

### Bastion Host Access

```bash
# Start bastion if not running
docker-compose -f docker-compose.segmented.yml --profile maintenance up -d bastion

# Verify VPN connection
ping 10.8.0.1

# Connect to bastion
docker exec -it crm-bastion sh
```

## Security Checklist

- [ ] Database has NO internet access
- [ ] Application servers not directly accessible
- [ ] All database connections require SSL/TLS
- [ ] VPN required for admin access
- [ ] Security groups follow least privilege
- [ ] VPC Flow Logs enabled
- [ ] Automated backups configured
- [ ] Network segmentation tested
- [ ] Monitoring and alerting active
- [ ] Regular security audits scheduled

## Resources

- [AWS VPC Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html)
- [Docker Network Security](https://docs.docker.com/network/network-tutorial-standalone/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [PCI DSS Network Segmentation](https://www.pcisecuritystandards.org/documents/network_segmentation.pdf)
