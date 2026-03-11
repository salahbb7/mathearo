# Complete Guide: Deploying Next.js App to Cloudflare with Custom Domain

## Project Analysis

Your Next.js project (`albar`) is already well-configured for Cloudflare deployment. Here's what I found:

### ✅ **Already Configured:**
- **@opennextjs/cloudflare** - Installed and configured
- **@cloudflare/next-on-pages** - Installed as dev dependency
- **wrangler** - Installed and configured with `wrangler.jsonc`
- **Next.js config** - Already initialized for Cloudflare
- **Middleware** - Edge-compatible middleware using JWT tokens
- **Database** - MongoDB with mongoose using module-level singleton pattern (Cloudflare compatible)

### ⚠️ **Potential Issues to Address:**
1. **Environment Variables** - Need to be set in Cloudflare
2. **Node.js APIs** - Some Node.js APIs may not be available on Cloudflare Workers
3. **Build Output** - Need to verify build configuration

---

## 📋 **Step-by-Step Deployment Guide**

### **1. Project Preparation**

#### **1.1 Verify Dependencies**
Your `package.json` already has the correct dependencies. Ensure they're installed:

```bash
npm install
```

#### **1.2 Environment Variables**
Create a `.env.local` file with required variables (if not already present):

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=https://mathhearo.com
```

**Important:** Generate a strong NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

#### **1.3 Verify Cloudflare Compatibility**
Your project uses:
- **Edge Runtime** for middleware (✅ compatible)
- **Mongoose** with Node.js compatibility flag (✅ compatible with `nodejs_compat`)
- **NextAuth.js** with JWT strategy (✅ compatible)

**Node.js APIs to AVOID on Cloudflare:**
- `fs` module (file system access)
- `child_process` module
- `http`/`https` modules (use `fetch` instead)
- Native Node.js streams

Your project appears to avoid these incompatible APIs.

---

### **2. Deployment Method**

#### **Option A: Wrangler CLI (Recommended for Full Control)**
Your project already has wrangler scripts configured:

```bash
# Build the project for Cloudflare
npm run pages:build

# Preview locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

#### **Option B: GitHub Integration (Recommended for CI/CD)**
1. Push your code to a GitHub repository
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → Create a project
3. Connect your GitHub repository
4. Configure build settings (see Section 3 below)
5. Set environment variables in Cloudflare dashboard

**Which method is better?**
- **Wrangler CLI**: Better for development, testing, and manual deployments
- **GitHub Integration**: Better for production with automatic deployments on push

---

### **3. Build Settings for Cloudflare Pages**

#### **If using GitHub Integration:**
- **Build command:** `npm run pages:build`
- **Build output directory:** `.open-next/assets`
- **Root directory:** `/` (leave as default)
- **Node.js version:** 20 (or latest supported)

#### **Environment Variables in Cloudflare Dashboard:**
Add these in **Settings → Environment variables**:
- `MONGODB_URI` = `your_mongodb_connection_string`
- `NEXTAUTH_SECRET` = `your_generated_secret`
- `NEXTAUTH_URL` = `https://mathhearo.com`

#### **Build Configuration:**
Your `wrangler.jsonc` is already correctly configured:
```jsonc
{
    "name": "mathearo",
    "compatibility_date": "2025-01-01",
    "compatibility_flags": ["nodejs_compat"],  // Required for mongoose
    "pages_build_output_dir": ".open-next/assets",
    "observability": { "enabled": true }
}
```

---

### **4. Custom Domain Setup (mathhearo.com)**

#### **Prerequisites:**
1. Your domain must be using Cloudflare DNS
2. You need access to the Cloudflare account that manages mathhearo.com

#### **Step-by-Step Instructions:**

##### **4.1 Add Domain to Cloudflare (if not already)**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click "Add site"
3. Enter `mathhearo.com`
4. Follow prompts to change nameservers (if not already using Cloudflare)

##### **4.2 Configure Custom Domain in Pages**
1. Go to your Pages project → **Settings → Custom domains**
2. Click **"Set up a custom domain"**
3. Enter `mathhearo.com`
4. Cloudflare will automatically create the necessary DNS records

##### **4.3 Verify DNS Records**
Cloudflare should create these records automatically:
- **CNAME** `mathhearo.com` → `your-project.pages.dev`
- **CNAME** `www.mathhearo.com` → `your-project.pages.dev`

**Manual DNS Configuration (if needed):**
1. Go to **DNS → Records** for mathhearo.com
2. Add these records:
   ```
   Type: CNAME
   Name: @ (or mathhearo.com)
   Target: your-project.pages.dev
   Proxy status: Proxied (orange cloud)
   ```
   
   ```
   Type: CNAME
   Name: www
   Target: your-project.pages.dev
   Proxy status: Proxied (orange cloud)
   ```

##### **4.4 SSL/TLS Configuration**
1. Go to **SSL/TLS → Edge Certificates**
2. Ensure **"Always Use HTTPS"** is enabled
3. SSL/TLS encryption mode: **Full (strict)**
4. Enable **"Automatic HTTPS Rewrites"**

##### **4.5 Wait for Propagation**
DNS changes can take 5-30 minutes to propagate globally.

---

### **5. Testing Your Deployment**

#### **5.1 Local Testing**
```bash
# Test build locally
npm run pages:build

# Preview with wrangler
npm run preview
# Visit http://localhost:8788
```

#### **5.2 Verify Deployment**
```bash
# Deploy to Cloudflare
npm run deploy

# Check deployment status
wrangler pages deployment list
```

#### **5.3 Verify Custom Domain**
1. Visit `https://mathhearo.com`
2. Check SSL certificate is valid
3. Test all application features

---

### **6. Troubleshooting Common Issues**

#### **Issue: MongoDB Connection Fails**
**Solution:** Ensure:
1. `MONGODB_URI` is correctly set in Cloudflare environment variables
2. MongoDB Atlas allows connections from Cloudflare IPs (add 0.0.0.0/0 to IP whitelist)
3. `nodejs_compat` flag is enabled in wrangler.jsonc

#### **Issue: NextAuth.js Not Working**
**Solution:** 
1. Verify `NEXTAUTH_SECRET` is set and consistent
2. Ensure `NEXTAUTH_URL` matches your custom domain
3. Check middleware is using JWT strategy (your setup is correct)

#### **Issue: Static Assets Not Loading**
**Solution:** 
1. Verify build output directory is `.open-next/assets`
2. Check `public` folder files are included in build
3. Ensure asset paths use relative URLs

#### **Issue: API Routes Not Working**
**Solution:**
1. Check API routes don't use incompatible Node.js APIs
2. Verify middleware configuration
3. Check CORS headers if needed

---

### **7. Production Optimization**

#### **7.1 Caching Strategy**
Configure in `wrangler.jsonc`:
```jsonc
"kv_namespaces": [
  {
    "binding": "MY_KV",
    "id": "your-kv-namespace-id"
  }
]
```

#### **7.2 Performance Monitoring**
1. Enable **Observability** in wrangler.jsonc (already enabled)
2. Use **Cloudflare Analytics** in dashboard
3. Set up **Error Tracking**

#### **7.3 Security Hardening**
1. Enable **WAF** rules in Cloudflare
2. Set up **Rate Limiting**
3. Configure **Bot Management** if needed

---

### **8. Maintenance & Updates**

#### **8.1 Update Dependencies**
```bash
# Update Next.js and Cloudflare packages
npm update @opennextjs/cloudflare @cloudflare/next-on-pages wrangler

# Update all dependencies
npm update
```

#### **8.2 Redeploy Changes**
```bash
# After making code changes
git add .
git commit -m "Update"
git push origin main  # Triggers auto-deploy if using GitHub

# Or manually deploy
npm run deploy
```

#### **8.3 Monitor Performance**
1. Check **Cloudflare Pages Analytics**
2. Monitor **MongoDB Atlas** performance
3. Review **Error logs** in Cloudflare dashboard

---

## **Quick Reference Commands**

```bash
# Install dependencies
npm install

# Build for Cloudflare
npm run pages:build

# Preview locally
npm run preview

# Deploy to Cloudflare
npm run deploy

# Check deployment status
wrangler pages deployment list

# View logs
wrangler pages deployment view <deployment-id>
```

---

## **Support & Resources**

- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **OpenNext Documentation:** https://opennext.js.org/cloudflare
- **Next.js on Cloudflare:** https://nextjs.org/docs/app/building-your-application/deploying/cloudflare
- **Community Support:** Cloudflare Discord, GitHub Discussions

---

**Your project is ready for deployment!** The configuration is already optimized for Cloudflare's edge network. Follow the steps above to deploy to Cloudflare Pages and connect your custom domain `mathhearo.com`.