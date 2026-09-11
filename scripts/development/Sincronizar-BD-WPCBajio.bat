@echo off
title WPC Bajio POS - Sincronizar Base de Datos (VPS -^> Local DEV)
color 0B
echo ====================================================================
echo   Iniciando proceso de sincronizacion en 1 solo paso...
echo ====================================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sincronizar-BD-WPCBajio.ps1"
pause
