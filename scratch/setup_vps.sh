#!/bin/bash
# ==============================================================================
# Script de Aprovisionamiento Automatizado de VPS en la Nube (Ubuntu 22.04/24.04)
# Sistema Punto de Venta e Inventario WPC Bajío (SQL Server 2022 + .NET 9 API)
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Iniciando Aprovisionamiento de VPS para WPC Bajío..."
echo "=========================================================="

# 1. Actualización de paquetes base
echo "📦 [1/6] Actualizando repositorios del sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y curl gnupg2 software-properties-common apt-transport-https ufw nginx

# 2. Agregar repositorios oficiales de Microsoft
echo "🔑 [2/6] Configurando llaves y repositorios de Microsoft..."
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg

UBUNTU_CODENAME=$(lsb_release -cs)
# Si es Ubuntu 24.04 (noble), usar repositorio jammy (22.04) para compatibilidad con mssql-server 2022
if [ "$UBUNTU_CODENAME" = "noble" ]; then
    MSSQL_REPO="https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2022.list"
    PROD_REPO="https://packages.microsoft.com/config/ubuntu/22.04/prod.list"
else
    MSSQL_REPO="https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2022.list"
    PROD_REPO="https://packages.microsoft.com/config/ubuntu/22.04/prod.list"
fi

curl -fsSL "$MSSQL_REPO" | tee /etc/apt/sources.list.d/mssql-server-2022.list > /dev/null
curl -fsSL "$PROD_REPO" | tee /etc/apt/sources.list.d/msprod.list > /dev/null

apt-get update -y

# 3. Instalación de Microsoft SQL Server 2022 y herramientas
echo "🗄️ [3/6] Instalando Microsoft SQL Server 2022 (Express Edition)..."
ACCEPT_EULA=Y apt-get install -y mssql-server
ACCEPT_EULA=Y apt-get install -y mssql-tools18 unixodbc-dev

# Configurar variables de entorno para sqlcmd
echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> /root/.bashrc
export PATH="$PATH:/opt/mssql-tools18/bin"

# Configuración desatendida de SQL Server Express con contraseña SA
MSSQL_SA_PASSWORD="Aaron2804#MasterSA"
MSSQL_PID="Express"
/opt/mssql/bin/mssql-conf -n set-sa-password "$MSSQL_SA_PASSWORD"
/opt/mssql/bin/mssql-conf -n set-edition "$MSSQL_PID"
/opt/mssql/bin/mssql-conf -n set telemetry.customerfeedback false

systemctl restart mssql-server
systemctl enable mssql-server

echo "⏳ Esperando a que el motor SQL Server esté listo..."
sleep 5

# 4. Creación de la Base de Datos PosLambrinDb y usuario de aplicación
echo "🏗️ [4/6] Creando base de datos PosLambrinDb y credencial wpcadminaam..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "
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

# Si existe el archivo de esquema en el directorio actual, aplicarlo
if [ -f "clean_init.sql" ]; then
    echo "📋 Aplicando esquema de 26 tablas y semillas desde clean_init.sql..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U wpcadminaam -P "Aaron2804#" -d PosLambrinDb -C -i "clean_init.sql"
    echo "✅ Base de datos PosLambrinDb inicializada con 26 tablas físicas y usuarios autoritativos."
fi

# 5. Instalación de .NET 9 Runtime y configuración de servicio
echo "⚙️ [5/6] Instalando .NET 9 ASP.NET Core Runtime..."
apt-get install -y dotnet-runtime-9.0 aspnetcore-runtime-9.0

# Crear directorio para la aplicación
mkdir -p /var/www/pos-api
chown -R www-data:www-data /var/www/pos-api

# Crear servicio systemd para la API
cat << 'EOF' > /etc/systemd/system/pos-api.service
[Unit]
Description=WPC Bajio POS ASP.NET Core Web API
After=network.target mssql-server.service

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
    listen 80;
    server_name api.wpcbajio.com;

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
echo "• SQL Server 2022: Activo en localhost (PosLambrinDb)"
echo "• Usuario BD: wpcadminaam"
echo "• Nginx: Escuchando en puerto 80 -> http://127.0.0.1:5000"
echo "• Servicio API: pos-api.service habilitado (esperando binarios en /var/www/pos-api)"
echo "=========================================================="
