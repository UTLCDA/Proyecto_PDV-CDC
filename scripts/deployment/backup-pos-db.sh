#!/usr/bin/env bash
# ==============================================================================
# Script de Respaldo Semanal Automatizado de Base de Datos WPC Bajío (PDV)
# Servidor VPS: 193.46.198.88
# Base de Datos: PosLambrinDb
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/pos-database"
LOG_FILE="/var/log/pos-db-backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="PosLambrinDb_${TIMESTAMP}.bak"
CONTAINER_NAME="mssql-server"
CONTAINER_TEMP_DIR="/var/opt/mssql/data"
RETENTION_COUNT=8

log() {
    echo "[$(date -u +'%Y-%m-%d %H:%M:%S UTC')] $*" | tee -a "$LOG_FILE"
}

log "=== INICIANDO RESPALDO SEMANAL DE BASE DE DATOS ==="

# 1. Verificar que el contenedor de SQL Server esté activo
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: El contenedor ${CONTAINER_NAME} no se encuentra en ejecución."
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# 2. Generar el respaldo SQL dentro del contenedor
SQL_CMD="BACKUP DATABASE PosLambrinDb TO DISK = '${CONTAINER_TEMP_DIR}/${BACKUP_FILENAME}' WITH FORMAT, INIT;"

log "Ejecutando BACKUP DATABASE con compresión en SQL Server..."
docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost \
    -U wpcadminaam \
    -P 'Aaron2804#' \
    -C \
    -Q "$SQL_CMD" >> "$LOG_FILE" 2>&1

# 3. Extraer el archivo .bak del contenedor al almacenamiento del host
log "Copiando archivo a ${BACKUP_DIR}/${BACKUP_FILENAME}..."
docker cp "${CONTAINER_NAME}:${CONTAINER_TEMP_DIR}/${BACKUP_FILENAME}" "${BACKUP_DIR}/${BACKUP_FILENAME}"

# Limpiar archivo temporal dentro del contenedor
docker exec "$CONTAINER_NAME" rm -f "${CONTAINER_TEMP_DIR}/${BACKUP_FILENAME}"

# 4. Crear enlace/copia al último respaldo para herramientas de sincronización
cp -f "${BACKUP_DIR}/${BACKUP_FILENAME}" "${BACKUP_DIR}/PosLambrinDb_latest.bak"
cp -f "${BACKUP_DIR}/${BACKUP_FILENAME}" "/tmp/PosLambrinDb_Prod.bak"

BACKUP_SIZE=$(ls -lh "${BACKUP_DIR}/${BACKUP_FILENAME}" | awk '{print $5}')
log "Respaldo generado exitosamente: ${BACKUP_FILENAME} (Tamano: ${BACKUP_SIZE})"

# 5. Política de retención: conservar los últimos N respaldos semanales
log "Aplicando política de retención (conservando los últimos ${RETENTION_COUNT} respaldos)..."
cd "$BACKUP_DIR"
TOTAL_BACKUPS=$(ls -1 PosLambrinDb_*.bak 2>/dev/null | grep -v "latest" | wc -l)

if [ "$TOTAL_BACKUPS" -gt "$RETENTION_COUNT" ]; then
    DELETION_COUNT=$((TOTAL_BACKUPS - RETENTION_COUNT))
    log "Eliminando ${DELETION_COUNT} respaldos antiguos para optimizar almacenamiento..."
    ls -1t PosLambrinDb_*.bak | grep -v "latest" | tail -n "$DELETION_COUNT" | while read -r old_file; do
        rm -f "$old_file"
        log "Eliminado respaldo antiguo: $old_file"
    done
fi

log "=== RESPALDO SEMANAL FINALIZADO EXITOSAMENTE ==="
