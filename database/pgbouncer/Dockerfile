FROM pgbouncer/pgbouncer:latest

# Install additional tools
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /etc/pgbouncer /var/log/pgbouncer /var/run/pgbouncer && \
    chown -R pgbouncer:pgbouncer /etc/pgbouncer /var/log/pgbouncer /var/run/pgbouncer

# Copy configuration files
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY userlist.txt /etc/pgbouncer/userlist.txt

# Set permissions
RUN chown pgbouncer:pgbouncer /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/userlist.txt && \
    chmod 600 /etc/pgbouncer/userlist.txt

USER pgbouncer

# Expose PgBouncer port
EXPOSE 6432

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW STATS" || exit 1

CMD ["/usr/bin/pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]
