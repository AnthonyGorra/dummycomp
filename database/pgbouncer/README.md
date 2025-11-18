# PgBouncer Connection Pooling Setup

## Overview

PgBouncer is a lightweight connection pooler for PostgreSQL. It reduces the overhead of creating new database connections and allows your application to handle many more concurrent users.

## Why PgBouncer?

**Without PgBouncer:**
- Each application request = new database connection
- Connection creation overhead: 10-50ms per request
- Limited by PostgreSQL's max_connections (60-200 on Supabase)
- Wasted resources on idle connections

**With PgBouncer:**
- Connection pooling and reuse
- 500+ concurrent clients → 100 database connections
- Sub-millisecond connection overhead
- Efficient resource utilization

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your Supabase credentials
nano .env
```

Required environment variables:
```env
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password
```

### 2. Configure Authentication

```bash
# Run the interactive setup script
chmod +x setup.sh
./setup.sh
```

Or manually create `userlist.txt`:
```bash
# Generate MD5 password hash
echo -n "your_password_postgres" | md5sum
# Output: abc123def456...

# Add to userlist.txt
echo '"postgres" "md5abc123def456..."' > userlist.txt
chmod 600 userlist.txt
```

### 3. Start PgBouncer

```bash
# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f pgbouncer
```

### 4. Update Application

Update your application's `DATABASE_URL`:

```env
# Before (direct connection)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# After (via PgBouncer)
DATABASE_URL=postgresql://postgres:password@localhost:6432/postgres
```

## Configuration

### Pool Mode

**Transaction Mode** (default, recommended):
- Best for web applications
- Connection returned to pool after each transaction
- Most efficient use of connections

```ini
pool_mode = transaction
```

**Session Mode** (if needed):
- One connection per client session
- Required for: temporary tables, prepared statements, session variables

```ini
pool_mode = session
```

### Pool Sizes

Adjust in `pgbouncer.ini`:

```ini
# Maximum connections to PostgreSQL (should be < your plan limit)
max_db_connections = 100

# Default pool size per user+database
default_pool_size = 25

# Maximum client connections allowed
max_client_conn = 500
```

**Supabase Connection Limits:**
- Free tier: 60 connections
- Pro tier: 200+ connections
- Set `max_db_connections` below your limit

### Timeouts

```ini
# How long clients wait for a connection
query_wait_timeout = 120

# Disconnect idle clients
client_idle_timeout = 600

# Close idle server connections
server_idle_timeout = 600

# Refresh connections periodically
server_lifetime = 3600
```

## Monitoring

### Admin Console

Connect to PgBouncer admin console:

```bash
docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer
```

### Common Commands

```sql
-- View pool statistics
SHOW POOLS;

-- View client connections
SHOW CLIENTS;

-- View server connections
SHOW SERVERS;

-- View statistics
SHOW STATS;

-- View configuration
SHOW CONFIG;

-- Reload configuration
RELOAD;

-- Pause all connections
PAUSE;

-- Resume connections
RESUME;
```

### Pool Statistics

```bash
# View pool stats
docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS"
```

Output columns:
- `database`: Database name
- `user`: Username
- `cl_active`: Active client connections
- `cl_waiting`: Clients waiting for connection
- `sv_active`: Active server connections
- `sv_idle`: Idle server connections
- `maxwait`: How long oldest client waited (seconds)

### Prometheus Metrics

Metrics are exported at `http://localhost:9127/metrics`

View in Grafana or query directly:
```bash
curl http://localhost:9127/metrics
```

Key metrics:
- `pgbouncer_pools_server_active_connections`
- `pgbouncer_pools_server_idle_connections`
- `pgbouncer_pools_client_active_connections`
- `pgbouncer_pools_client_waiting_connections`

## Troubleshooting

### Connection Issues

**Problem**: "connection refused"
```bash
# Check if PgBouncer is running
docker-compose ps

# Check logs for errors
docker-compose logs pgbouncer

# Restart PgBouncer
docker-compose restart pgbouncer
```

**Problem**: "authentication failed"
```bash
# Verify userlist.txt
cat userlist.txt

# Regenerate password hash
echo -n "password_username" | md5sum
# Add "md5" prefix and update userlist.txt
```

**Problem**: "no more connections allowed"
```bash
# Check pool usage
docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS"

# Increase pool size in pgbouncer.ini
max_db_connections = 150  # Increase if below plan limit
default_pool_size = 30    # Increase pool size
```

### Performance Issues

**Problem**: Clients waiting for connections
```bash
# Check pool stats
SHOW POOLS;

# If cl_waiting > 0, increase pool size
# Edit pgbouncer.ini:
default_pool_size = 30  # Increase from 25
```

**Problem**: High `maxwait` times
```bash
# Increase pool size or connection limits
# Check if database is overloaded

# View slow queries
SELECT * FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > interval '1 second';
```

### Configuration Changes

After modifying `pgbouncer.ini`:

```bash
# Reload configuration (no downtime)
docker-compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "RELOAD"

# Or restart container
docker-compose restart pgbouncer
```

## Advanced Configuration

### TLS/SSL

Enable TLS for client connections:

```ini
# In pgbouncer.ini
client_tls_sslmode = require
client_tls_cert_file = /etc/ssl/certs/server.crt
client_tls_key_file = /etc/ssl/private/server.key
```

### Multiple Databases

```ini
# In pgbouncer.ini [databases] section
db1 = host=db1.supabase.co port=5432 dbname=postgres
db2 = host=db2.supabase.co port=5432 dbname=postgres
```

### Connection Limits per User

```ini
# In pgbouncer.ini
max_user_connections = 50
```

### Custom DNS

```ini
# In pgbouncer.ini
dns_max_ttl = 15
dns_nxdomain_ttl = 15
```

## Production Deployment

### Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    configs:
      - source: pgbouncer_config
        target: /etc/pgbouncer/pgbouncer.ini
    secrets:
      - source: pgbouncer_userlist
        target: /etc/pgbouncer/userlist.txt
```

### Kubernetes

```yaml
# pgbouncer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: pgbouncer
        image: pgbouncer/pgbouncer:latest
        ports:
        - containerPort: 6432
        volumeMounts:
        - name: config
          mountPath: /etc/pgbouncer
```

### Health Checks

```bash
# Add to your load balancer
health_check:
  test: ["CMD", "psql", "-h", "127.0.0.1", "-p", "6432", "-U", "pgbouncer", "pgbouncer", "-c", "SHOW STATS"]
  interval: 30s
  timeout: 5s
  retries: 3
```

## Performance Tuning

### Optimal Settings for Different Workloads

**High-Traffic Web App:**
```ini
pool_mode = transaction
max_db_connections = 100
default_pool_size = 25
max_client_conn = 1000
query_wait_timeout = 30
```

**Low-Traffic with Long Queries:**
```ini
pool_mode = transaction
max_db_connections = 50
default_pool_size = 10
query_timeout = 0  # No query timeout
server_lifetime = 7200
```

**API Backend:**
```ini
pool_mode = transaction
max_db_connections = 100
default_pool_size = 20
max_client_conn = 500
query_wait_timeout = 60
```

## Backup and Recovery

### Backup Configuration

```bash
# Backup PgBouncer configuration
tar -czf pgbouncer-backup-$(date +%Y%m%d).tar.gz pgbouncer.ini userlist.txt

# Restore
tar -xzf pgbouncer-backup-20250118.tar.gz
docker-compose restart pgbouncer
```

### Disaster Recovery

```bash
# If PgBouncer fails, applications can fall back to direct connection
# Keep direct connection URL as fallback

# In your application:
# PRIMARY_DB_URL=postgresql://...@db.supabase.co:5432/postgres  # Direct
# DATABASE_URL=postgresql://...@localhost:6432/postgres         # Via PgBouncer
```

## Best Practices

1. **Monitor Pool Usage**
   - Check `SHOW POOLS` regularly
   - Alert on high `cl_waiting` values
   - Monitor `maxwait` times

2. **Set Appropriate Pool Sizes**
   - Start conservative, increase as needed
   - Don't exceed database connection limits
   - Monitor for queued clients

3. **Use Transaction Mode**
   - Best for most web applications
   - More efficient than session mode
   - Switch to session mode only if required

4. **Configure Timeouts**
   - Set reasonable `query_wait_timeout`
   - Use `client_idle_timeout` to free up connections
   - Refresh connections with `server_lifetime`

5. **Security**
   - Keep `userlist.txt` secure (chmod 600)
   - Use TLS for production
   - Limit admin access
   - Don't commit secrets to git

6. **Testing**
   - Test failover scenarios
   - Benchmark with and without PgBouncer
   - Load test before production

## Resources

- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Performance Optimization Guide](../../PERFORMANCE_OPTIMIZATION.md)

## Support

For issues:
1. Check logs: `docker-compose logs pgbouncer`
2. Review configuration: `SHOW CONFIG`
3. Monitor pools: `SHOW POOLS`
4. Consult documentation above
