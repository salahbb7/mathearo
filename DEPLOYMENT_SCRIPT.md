# Cloudflare Deployment Script

## Important Note for Windows Users
OpenNext has known compatibility issues with Windows. For reliable deployment, consider:

1. **Use WSL (Windows Subsystem for Linux)** - Recommended for production builds
2. **Use GitHub Actions** - Let Cloudflare build your project in their Linux environment
3. **Use a Linux VM or container** for building

## Deployment Options

### Option 1: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Go to Cloudflare Dashboard → Pages → Create project
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `npm run pages:build`
   - **Build output directory:** `.open-next/assets`
   - **Node.js version:** 20
5. Set environment variables in Cloudflare dashboard

### Option 2: Manual Deployment with Wrangler (Using WSL)
If you have WSL installed:

```bash
# In WSL terminal
cd /mnt/c/Users/salah/Desktop/albar

# Install dependencies
npm install

# Build the project
npm run pages:build

# Deploy to Cloudflare
npm run deploy
```

### Option 3: Manual Deployment (Windows - May Have Issues)
```bash
# Install dependencies
npm install

# Try building (may fail on Windows)
npm run pages:build

# If build succeeds, deploy
npm run deploy
```

## Environment Variables Required
Create a `.env.local` file or set in Cloudflare dashboard:

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=generate_with: openssl rand -base64 32
NEXTAUTH_URL=https://mathhearo.com
```

## Custom Domain Setup
1. Ensure `mathhearo.com` is using Cloudflare DNS
2. In Cloudflare Pages → Settings → Custom domains
3. Add `mathhearo.com`
4. Cloudflare will auto-create DNS records
5. Wait 5-30 minutes for propagation

## Troubleshooting Windows Build Issues
If you encounter esbuild alias errors on Windows:

1. **Use WSL** (most reliable solution)
2. **Try cleaning and rebuilding:**
   ```bash
   rm -rf .next .open-next node_modules/.cache
   npm install
   npm run pages:build
   ```
3. **Check Node.js version:** Use Node.js 20.x
4. **Update dependencies:**
   ```bash
   npm update @opennextjs/cloudflare @cloudflare/next-on-pages wrangler
   ```

## Quick Test Commands
```bash
# Test build locally (may work in WSL)
npm run pages:build

# Preview locally
npm run preview
# Visit http://localhost:8788

# Check wrangler version
npx wrangler --version

# List deployments
npx wrangler pages deployment list
```

## Production Readiness Checklist
- [ ] Environment variables set in Cloudflare
- [ ] MongoDB Atlas IP whitelist includes Cloudflare IPs (0.0.0.0/0)
- [ ] Custom domain configured
- [ ] SSL certificate verified
- [ ] All routes tested
- [ ] Authentication working
- [ ] Database connections stable