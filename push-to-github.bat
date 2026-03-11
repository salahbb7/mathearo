@echo off
echo ========================================
echo   Pushing to GitHub - Mathearo
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Git...
git --version
if errorlevel 1 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo.
echo Initializing Git repository...
if not exist ".git" (
    git init
) else (
    echo Git already initialized
)

echo.
echo Adding all files (force adding ignored files)...
git add -A
git add -f .github/workflows/deploy-cloudflare.yml
git add -f push-to-github.bat
git add -f wrangler.jsonc
git add -f next.config.ts
git add -f package.json
git add -f package-lock.json
git add -f open-next.config.ts
git add -f tsconfig.json
git add -f postcss.config.mjs
git add -f .gitignore

echo.
echo Creating commit...
git commit -m "Update GitHub workflow - add pages write permission for Cloudflare deployment" || (
    echo No changes to commit, continuing...
)

echo.
echo Setting remote origin...
git remote add origin https://github.com/salahbb7/mathearo.git 2>nul || echo Remote already set

echo.
echo Checking current branch...
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%

echo.
echo Renaming branch to main...
git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main --force

echo.
echo ========================================
echo   DONE!
echo ========================================
echo.
echo Next steps:
echo 1. Go to https://github.com/salahbb7/mathearo/settings/secrets/actions
echo 2. Add these secrets:
echo    - CLOUDFLARE_API_TOKEN
echo    - CLOUDFLARE_ACCOUNT_ID
echo    - MONGODB_URI
echo    - NEXTAUTH_SECRET
echo    - NEXTAUTH_URL
echo.
pause
