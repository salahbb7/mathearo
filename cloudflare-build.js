// Cloudflare Build Script for Next.js
// This script handles the build process for Cloudflare Pages

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Cloudflare build process...');

try {
  // Step 1: Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  const dirsToClean = ['.next', '.open-next', '.vercel'];
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`  ✓ Cleaned ${dir}`);
    }
  });

  // Step 2: Install dependencies if needed
  console.log('📦 Checking dependencies...');
  if (!fs.existsSync('node_modules')) {
    console.log('  Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Step 3: Build Next.js app
  console.log('🔨 Building Next.js app...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 4: Build for Cloudflare using @cloudflare/next-on-pages
  console.log('⚡️ Building for Cloudflare Pages...');
  execSync('npx @cloudflare/next-on-pages', { stdio: 'inherit' });

  // Step 5: Verify build output
  console.log('✅ Build completed successfully!');
  console.log('\n📁 Build output:');
  
  const vercelOutput = '.vercel/output';
  if (fs.existsSync(vercelOutput)) {
    const staticDir = path.join(vercelOutput, 'static');
    if (fs.existsSync(staticDir)) {
      const files = fs.readdirSync(staticDir);
      console.log(`  Static files: ${files.length} files`);
    }
    
    const workerFile = path.join(vercelOutput, 'static/_worker.js');
    if (fs.existsSync(workerFile)) {
      const stats = fs.statSync(workerFile);
      console.log(`  Worker file: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  }

  console.log('\n🎉 Ready for deployment!');
  console.log('Run: npx wrangler pages deploy .vercel/output/static --project-name=mathearo');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}