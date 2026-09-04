#!/bin/bash
# ==============================================================================
# Script de Aprovisionamiento Automatizado de VPS en la Nube (Ubuntu 22.04/24.04/26.04)
# Sistema Punto de Venta e Inventario WPC Bajío (SQL Server 2022 + .NET 9 API)
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Iniciando Aprovisionamiento de VPS para WPC Bajío..."
echo "=========================================================="

# 0. Limpieza preventiva de listas previas que pudieran causar error GPG
rm -f /etc/apt/sources.list.d/*mssql* /etc/apt/sources.list.d/*msprod* /etc/apt/sources.list.d/*microsoft* /etc/apt/trusted.gpg.d/microsoft.gpg

# 1. Actualización de paquetes base del sistema
echo "📦 [1/5] Actualizando repositorios del sistema e instalando herramientas..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ufw nginx docker.io

systemctl start docker || true
systemctl enable docker || true

# 2. Despliegue de Microsoft SQL Server 2022 (Contenedor Oficial Microsoft)
MSSQL_SA_PASSWORD="Aaron2804#MasterSA"
echo "🗄️ [2/5] Desplegando Microsoft SQL Server 2022 (Express Edition)..."

systemctl stop mssql-server 2>/dev/null || true
systemctl disable mssql-server 2>/dev/null || true
pkill -f sqlservr 2>/dev/null || true
mkdir -p /var/opt/mssql
docker stop mssql-server 2>/dev/null || true
docker rm mssql-server 2>/dev/null || true

docker run -e "ACCEPT_EULA=Y" \
           -e "MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD" \
           -e "MSSQL_PID=Express" \
           -p 1433:1433 \
           --name mssql-server \
           -v /var/opt/mssql:/var/opt/mssql \
           -d --restart unless-stopped \
           mcr.microsoft.com/mssql/server:2022-latest

echo "⏳ Esperando a que el motor SQL Server esté listo para recibir conexiones..."
for i in {1..30}; do
    if docker exec mssql-server /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" >/dev/null 2>&1; then
        echo "✅ Motor SQL Server conectado exitosamente."
        break
    fi
    sleep 2
done

# 3. Creación de la Base de Datos PosLambrinDb y usuario de aplicación
echo "🏗️ [3/5] Configurando base de datos PosLambrinDb y credencial wpcadminaam..."

# Descargar clean_init.sql si no existe localmente
if [ ! -f "clean_init.sql" ]; then
    echo "📥 Descargando clean_init.sql desde el repositorio..."
    curl -fsSL https://raw.githubusercontent.com/UTLCDA/Proyecto_PDV-CDC/fix/cloudflare-tunnel-mobile-support/scratch/clean_init.sql -o clean_init.sql 2>/dev/null || \
    curl -fsSL https://raw.githubusercontent.com/UTLCDA/Proyecto_PDV-CDC/main/scratch/clean_init.sql -o clean_init.sql
fi

# Inicializar Base de Datos y Login
docker exec -i mssql-server /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PosLambrinDb')
BEGIN
    CREATE DATABASE [PosLambrinDb];
END;
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = N'wpcadminaam')
BEGIN
    CREATE LOGIN [wpcadminaam] WITH PASSWORD=N'Aaron2804#', DEFAULT_DATABASE=[PosLambrinDb], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF;
    ALTER SERVER ROLE [sysadmin] ADD MEMBER [wpcadminaam];
END;
"

# Aplicar las 26 tablas y datos semilla
if [ -f "clean_init.sql" ]; then
    echo "📋 Aplicando esquema de 26 tablas y semillas autoritativas a PosLambrinDb..."
    docker cp clean_init.sql mssql-server:/tmp/clean_init.sql
    docker exec -i mssql-server /opt/mssql-tools18/bin/sqlcmd -S localhost -U wpcadminaam -P "Aaron2804#" -d PosLambrinDb -C -i /tmp/clean_init.sql
    echo "✅ Base de datos PosLambrinDb inicializada al 100% con 26 tablas físicas."
fi

# 4. Instalación de .NET 9 ASP.NET Core Runtime y configuración de servicio
echo "⚙️ [4/5] Instalando .NET 9 ASP.NET Core Runtime..."
mkdir -p /usr/share/dotnet
curl -fsSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 9.0 --runtime aspnetcore --install-dir /usr/share/dotnet
ln -sf /usr/share/dotnet/dotnet /usr/bin/dotnet

# Crear directorio de la API y servicio systemd
mkdir -p /var/www/pos-api
chown -R www-data:www-data /var/www/pos-api

cat << 'EOF' > /etc/systemd/system/pos-api.service
[Unit]
Description=WPC Bajio POS ASP.NET Core Web API
After=network.target docker.service

[Service]
WorkingDirectory=/var/www/pos-api
ExecStart=/usr/bin/dotnet /var/www/pos-api/Pos.Api.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=pos-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=ASPNETCORE_URLS=http://127.0.0.1:5000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pos-api.service

# 5. Configuración de Nginx como Reverse Proxy y Firewall
echo "🌐 [5/5] Configurando Nginx Reverse Proxy para Cloudflare y Firewall..."
cat << 'EOF' > /etc/nginx/sites-available/pos-api
server {
    listen 80 default_server;
    server_name api.wpcbajio.com _;

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pos-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# Configurar Firewall UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=========================================================="
echo "✅ ¡Aprovisionamiento del VPS completado exitosamente!"
echo "=========================================================="
echo "• SQL Server 2022: Activo en localhost:1433 (PosLambrinDb con 26 tablas)"
echo "• Usuario BD: wpcadminaam"
echo "• .NET 9: Runtime instalado en /usr/bin/dotnet"
echo "• Nginx: Escuchando en puerto 80 -> http://127.0.0.1:5000"
echo "• Servicio API: pos-api.service habilitado (esperando binarios en /var/www/pos-api)"
echo "=========================================================="
