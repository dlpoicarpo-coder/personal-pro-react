@echo off
echo ========================================
echo    Personal PRO React - Setup Local
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERRO] Node.js nao encontrado!
  echo.
  echo Por favor instale o Node.js em:
  echo https://nodejs.org/en/download/
  echo.
  pause
  exit /b 1
)

echo [OK] Node.js encontrado:
node --version

echo.
echo Instalando dependencias...
npm install

echo.
echo Iniciando servidor de desenvolvimento...
echo Acesse: http://localhost:5173
echo.
npm run dev
