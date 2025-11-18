#!/bin/sh

# Database Backup Script
# Runs daily backups of PostgreSQL database

set -e

BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

echo "========================================="
echo "Database Backup - $(date)"
echo "========================================="

# Create backup directory if not exists
mkdir -p ${BACKUP_DIR}

# Perform backup
echo "Creating backup: ${BACKUP_FILE}"
PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
  -h ${POSTGRES_HOST} \
  -U ${POSTGRES_USER} \
  -d ${POSTGRES_DB} \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ -f ${BACKUP_FILE} ]; then
  BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
  echo "Backup successful: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "ERROR: Backup failed!"
  exit 1
fi

# Remove old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List current backups
echo ""
echo "Current backups:"
ls -lh ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo ""
echo "Backup complete!"
