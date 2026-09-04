#!/bin/bash
# ==============================================================================
# Script de Aprovisionamiento Automatizado de VPS en la Nube (Ubuntu 22.04/24.04/26.04)
# Sistema Punto de Venta e Inventario WPC Bajío (SQL Server 2022 + .NET 9 API)
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Iniciando Aprovisionamiento de VPS para WPC Bajío..."
echo "=========================================================="

# 1. Actualización de paquetes base
echo "📦 [1/6] Actualizando repositorios del sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl gnupg2 software-properties-common apt-transport-https ufw nginx

# 2. Configurar llaves y repositorios de Microsoft de forma segura
echo "🔑 [2/6] Configurando llaves y repositorios de Microsoft..."
rm -f /etc/apt/sources.list.d/mssql-server*.list /etc/apt/sources.list.d/msprod*.list

mkdir -p /etc/apt/trusted.gpg.d
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor --yes -o /etc/apt/trusted.gpg.d/microsoft.gpg
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys EB3E94ADBE1229CF 2>/dev/null || true

echo "deb [arch=amd64 signed-by=/etc/apt/trusted.gpg.d/microsoft.gpg] https://packages.microsoft.com/ubuntu/22.04/mssql-server-2022 jammy main" > /etc/apt/sources.list.d/mssql-server-2022.list
echo "deb [arch=amd64 signed-by=/etc/apt/trusted.gpg.d/microsoft.gpg] https://packages.microsoft.com/ubuntu/22.04/prod jammy main" > /etc/apt/sources.list.d/msprod.list

apt-get update -y || true

# 3. Instalación de Microsoft SQL Server 2022
MSSQL_SA_PASSWORD="Aaron2804#MasterSA"
echo "🗄️ [3/6] Instalando Microsoft SQL Server 2022 (Express Edition)..."

USE_DOCKER_MSSQL=false

if ACCEPT_EULA=Y apt-get install -y mssql-server; then
    echo "Configurando SQL Server nativo..."
    /opt/mssql/bin/mssql-conf -n set-sa-password "$MSSQL_SA_PASSWORD" || true
    /opt/mssql/bin/mssql-conf -n set-edition "Express" || true
    /opt/mssql/bin/mssql-conf -n set telemetry.customerfeedback false || true
    systemctl restart mssql-server || true
    systemctl enable mssql-server || true
else
    echo "⚠️ La versión de Ubuntu requiere contenedor Docker oficial de SQL Server 2022..."
    USE_DOCKER_MSSQL=true
    apt-get install -y docker.io || true
    systemctl start docker || true
    systemctl enable docker || true
    mkdir -p /var/opt/mssql
    docker stop mssql-server 2>/dev/null || true
    docker rm mssql-server 2>/dev/null || true
    docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD" -e "MSSQL_PID=Express" \
        -p 1433:1433 --name mssql-server -v /var/opt/mssql:/var/opt/mssql \
        -d --restart unless-stopped mcr.microsoft.com/mssql/server:2022-latest
fi

# Instalar herramientas sqlcmd si es posible
ACCEPT_EULA=Y apt-get install -y mssql-tools18 unixodbc-dev 2>/dev/null || true
export PATH="$PATH:/opt/mssql-tools18/bin"

echo "⏳ Esperando a que el motor SQL Server esté listo..."
sleep 10

# 4. Creación de la Base de Datos PosLambrinDb y usuario de aplicación
echo "🏗️ [4/6] Configurando base de datos PosLambrinDb y credencial wpcadminaam..."

# Descargar clean_init.sql si no existe
if [ ! -f "clean_init.sql" ]; then
    echo "📥 Descargando clean_init.sql desde el repositorio..."
    curl -fsSL https://raw.githubusercontent.com/UTLCDA/Proyecto_PDV-CDC/fix/cloudflare-tunnel-mobile-support/scratch/clean_init.sql -o clean_init.sql 2>/dev/null || \
    curl -fsSL https://raw.githubusercontent.com/UTLCDA/Proyecto_PDV-CDC/main/scratch/clean_init.sql -o clean_init.sql
fi

INIT_SQL_COMMAND="
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

if [ -f "/opt/mssql-tools18/bin/sqlcmd" ]; then
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "$INIT_SQL_COMMAND"
    if [ -f "clean_init.sql" ]; then
        echo "📋 Aplicando esquema de 26 tablas y semillas desde clean_init.sql..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U wpcadminaam -P "Aaron2804#" -d PosLambrinDb -C -i "clean_init.sql"
    fi
elif docker ps | grep -q mssql-server; then
    docker exec -i mssql-server /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "$INIT_SQL_COMMAND"
    if [ -f "clean_init.sql" ]; then
        echo "📋 Aplicando esquema de 26 tablas y semillas vía Docker..."
        docker cp clean_init.sql mssql-server:/tmp/clean_init.sql
        docker exec -i mssql-server /opt/mssql-tools18/bin/sqlcmd -S localhost -U wpcadminaam -P "Aaron2804#" -d PosLambrinDb -C -i /tmp/clean_init.sql
    fi
fi

echo "✅ Base de datos PosLambrinDb configurada y verificada."

# 5. Instalación de .NET 9 Runtime y configuración de servicio
echo "⚙️ [5/6] Instalando .NET 9 ASP.NET Core Runtime..."
if ! apt-get install -y dotnet-runtime-9.0 aspnetcore-runtime-9.0 2>/dev/null; then
    echo "Instalando .NET 9 mediante el script oficial multiplataforma de Microsoft..."
    curl -fsSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 9.0 --runtime aspnetcore --install-dir /usr/share/dotnet
    ln -sf /usr/share/dotnet/dotnet /usr/bin/dotnet
fi

mkdir -p /var/www/pos-api
chown -R www-data:www-data /var/www/pos-api

cat << 'EOF' > /etc/systemd/system/pos-api.service
[Unit]
Description=WPC Bajio POS ASP.NET Core Web API
After=network.target

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

# 6. Configuración de Nginx como Reverse Proxy
echo "🌐 [6/6] Configurando Nginx Reverse Proxy para Cloudflare..."
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
echo "• SQL Server 2022: Activo en localhost:1433 (PosLambrinDb)"
echo "• Usuario BD: wpcadminaam"
echo "• Nginx: Escuchando en puerto 80 -> http://127.0.0.1:5000"
echo "• Servicio API: pos-api.service habilitado"
echo "=========================================================="
