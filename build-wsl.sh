#!/bin/bash
# WSL Build Script for Cloudflare Pages
# Run this script in WSL for reliable builds

echo "🚀 Starting Cloudflare build in WSL..."

# Navigate to project directory (adjust path if needed)
cd /mnt/c/Users/salah/Desktop/albar

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next .open-next .vercel node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build Next.js app
echo "🔨 Building Next.js app..."
npm run build

# Build for Cloudflare Pages
echo "⚡️ Building for Cloudflare Pages..."
npx @cloudflare/next-on-pages

# Verify build output
echo "✅ Build completed!"
echo ""
echo "📁 Build output in .vercel/output/static:"
if [ -d ".vercel/output/static" ]; then
    file_count=$(find .vercel/output/static -type f | wc -l)
    echo "  Total files: $file_count"
    
    if [ -f ".vercel/output/static/_worker.js" ]; then
        worker_size=$(stat -c%s ".vercel/output/static/_worker.js")
        echo "  Worker size: $((worker_size / 1024)) KB"
    fi
fi

echo ""
echo "🎉 Ready for deployment!"
echo "To deploy: npx wrangler pages deploy .vercel/output/static --project-name=mathearo"
echo "To preview: npx wrangler pages dev .vercel/output/static"