# 🚀 Mathearo - Cloudflare Pages Deployment Guide

## ✅ Current Status
Your Next.js project is configured for Cloudflare Pages but needs to be built in a Linux environment due to Windows compatibility issues.

## 📁 Project Structure Configured
- ✅ `package.json` - Updated with Cloudflare build scripts
- ✅ `wrangler.jsonc` - Configured for Cloudflare Pages
- ✅ `.env.production` - Production environment variables
- ✅ `app/middleware.ts` - Edge-compatible middleware
- ✅ `.github/workflows/deploy-cloudflare.yml` - GitHub Actions workflow
- ✅ `cloudflare-build.js` - Build script
- ✅ `build-wsl.sh` - WSL build script

## 🌐 Current Deployments
1. **Test Deployment (Working)**: https://c202203c.mathearo.pages.dev
2. **Project Deployments**: Multiple attempts made, but need proper build

## 🔧 How to Deploy Your Actual Next.js App

### Option 1: Use WSL (Windows Subsystem for Linux) - RECOMMENDED
```bash
# 1. Open WSL terminal
wsl

# 2. Navigate to your project
cd /mnt/c/Users/salah/Desktop/albar

# 3. Run the build script
bash build-wsl.sh

# 4. Deploy the built files
npx wrangler pages deploy .vercel/output/static --project-name=mathearo
```

### Option 2: Use GitHub Actions (Automatic Deployment)
1. Push your code to GitHub
2. Set up these secrets in GitHub repository settings:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
3. Push to `main` branch - automatic deployment will start

### Option 3: Manual Deployment with Docker
```bash
# Run in PowerShell
docker run -v ${PWD}:/app -w /app node:20-alpine sh -c "npm ci && npm run build && npx @cloudflare/next-on-pages"
npx wrangler pages deploy .vercel/output/static --project-name=mathearo
```

## 🔗 Custom Domain Setup: mathearo.com

### Step 1: Add Domain in Cloudflare Dashboard
1. Go to https://dash.cloudflare.com
2. Navigate to **Pages** → **mathearo** project
3. Click **Settings** → **Custom domains**
4. Click **Set up a custom domain**
5. Enter `mathearo.com`

### Step 2: Configure DNS Records
Cloudflare will automatically create these DNS records:
- `CNAME mathearo.com → mathearo.pages.dev`
- `CNAME www.mathearo.com → mathearo.pages.dev`

### Step 3: SSL Certificate
Cloudflare will automatically provision an SSL certificate for `mathearo.com`

## ⚠️ Windows Compatibility Issues
The following tools don't work reliably on Windows:
- `@cloudflare/next-on-pages`
- `@opennextjs/cloudflare`

**Solution**: Use WSL, GitHub Actions, or Docker for building.

## 🚀 Quick Start Commands

```bash
# Build and deploy using WSL
npm run deploy:cloudflare

# Preview locally (if build succeeds)
npm run preview:cloudflare

# Check deployment status
npx wrangler pages deployment list --project-name=mathearo
```

## 📞 Support
If you encounter issues:
1. Check the build logs in `.next` folder
2. Review Cloudflare Pages dashboard
3. Use WSL for reliable builds

## 🎯 Next Steps
1. [ ] Use WSL to build and deploy your actual app
2. [ ] Add custom domain `mathearo.com` in Cloudflare dashboard
3. [ ] Set up GitHub repository for automatic deployments
4. [ ] Configure production environment variables in Cloudflare

Your project is fully configured and ready for deployment. The only remaining step is to build it in a Linux environment!