@echo off
REM ===================================
REM ALGORA Environment Setup Script (Windows)
REM ===================================

setlocal enabledelayedexpansion

echo ====================================
echo ALGORA Environment Setup
echo ====================================
echo.

REM Check if .env.local exists
if exist .env.local (
    echo [WARNING] .env.local already exists
    set /p overwrite="Do you want to overwrite it? (y/N): "
    if /i not "!overwrite!"=="y" (
        echo Setup cancelled.
        exit /b 0
    )
    copy .env.local .env.local.backup >nul
    echo [OK] Backup created: .env.local.backup
)

REM Create .env.local from example
if exist .env.local.example (
    copy .env.local.example .env.local >nul
    echo [OK] .env.local created from template
) else (
    echo [ERROR] .env.local.example not found
    exit /b 1
)

echo.
echo Please provide your API credentials:
echo ====================================
echo.

REM Supabase Configuration
echo [1/3] Supabase Setup
set /p SUPABASE_URL="Supabase Project URL (https://xxx.supabase.co): "
set /p SUPABASE_KEY="Supabase Anon Key (eyJ...): "

REM OpenAI Configuration
echo.
echo [2/3] OpenAI Setup
set /p OPENAI_KEY="OpenAI API Key (sk-...): "

REM App Configuration
set APP_URL=http://localhost:3000

REM Update .env.local (PowerShell method for better string handling)
powershell -Command "(Get-Content .env.local) -replace 'NEXT_PUBLIC_SUPABASE_URL=.*', 'NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%' | Set-Content .env.local"
powershell -Command "(Get-Content .env.local) -replace 'NEXT_PUBLIC_SUPABASE_ANON_KEY=.*', 'NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_KEY%' | Set-Content .env.local"
powershell -Command "(Get-Content .env.local) -replace 'OPENAI_API_KEY=.*', 'OPENAI_API_KEY=%OPENAI_KEY%' | Set-Content .env.local"
powershell -Command "(Get-Content .env.local) -replace 'NEXT_PUBLIC_APP_URL=.*', 'NEXT_PUBLIC_APP_URL=%APP_URL%' | Set-Content .env.local"

echo.
echo [OK] Environment variables configured
echo.

REM Configuration Summary
echo Configuration Summary:
echo ====================================
echo Supabase URL: %SUPABASE_URL%
echo OpenAI Key: %OPENAI_KEY:~0,8%...
echo App URL: %APP_URL%
echo.

REM Test OpenAI
if not "%OPENAI_KEY%"=="" (
    echo Testing OpenAI API...
    curl -s -o nul -w "%%{http_code}" https://api.openai.com/v1/models -H "Authorization: Bearer %OPENAI_KEY%" | findstr "200" >nul
    if !errorlevel! equ 0 (
        echo [OK] OpenAI Connected
    ) else (
        echo [ERROR] OpenAI Connection Failed
        echo Please check your OpenAI API key
    )
)

REM Test Supabase
if not "%SUPABASE_URL%"=="" (
    echo Testing Supabase connection...
    curl -s -o nul -w "%%{http_code}" "%SUPABASE_URL%/rest/v1/" -H "apikey: %SUPABASE_KEY%" | findstr "200" >nul
    if !errorlevel! equ 0 (
        echo [OK] Supabase Connected
    ) else (
        echo [ERROR] Supabase Connection Failed
        echo Please check your Supabase credentials
    )
)

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Next Steps:
echo 1. Run database schema in Supabase SQL Editor
echo 2. Start dev server: npm run dev
echo 3. Open http://localhost:3000
echo.
echo Documentation:
echo - Setup guides: docs/
echo - Database schema: database/schema.sql
echo - README: README.md
echo.

pause
