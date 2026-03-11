# GitHub Deployment Setup Guide

## Step 1: Install Git (if not installed)
Download from: https://git-scm.com/download/win

## Step 2: Create GitHub Repository

1. Go to https://github.com and sign in
2. Click "+" → "New repository"
3. Name: `mathearo` (or your preferred name)
4. Make it **Public** or **Private**
5. Click "Create repository"
6. **Don't** initialize with README (we already have files)

## Step 3: Initialize Git and Push Code

Open Command Prompt or PowerShell in your project folder and run:

```cmd
cd C:\Users\salah\Desktop\albar

git init
git add .
git commit -m "Initial commit - ready for Cloudflare deployment"

git remote add origin https://github.com/YOUR_USERNAME/mathearo.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 4: Get Cloudflare Credentials

### Get Account ID:
1. Go to https://dash.cloudflare.com
2. Click on your profile icon (bottom left)
3. Copy your Account ID

### Create API Token:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Custom Token"
3. Name: "GitHub Deploy"
4. Permissions:
   - Account: Edit
   - Zone: Read
5. Click "Create Token"
6. Copy the token

## Step 5: Add Secrets to GitHub

1. Go to your GitHub repository
2. Go to Settings → Secrets and variables → Actions
3. Click "New repository secret" and add:

| Secret Name | Value |
|------------|-------|
| CLOUDFLARE_API_TOKEN | (your API token) |
| CLOUDFLARE_ACCOUNT_ID | (your account ID) |
| MONGODB_URI | mongodb+srv://omteldev_db_user:lEvPxSywP2ZCm9Oy@mathhero.urx2x9q.mongodb.net/?appName=mathhero |
| NEXTAUTH_SECRET | K7pX2mNqR9vLwZjT4hYsF1cBdGiUeA8oM3nE6kJ0yP5 |
| NEXTAUTH_URL | https://mathhearo.com |

## Step 6: Deploy!

1. Go to your GitHub repository
2. Click "Actions" tab
3. You should see the deployment running
4. Wait for it to complete

## Step 7: Set Custom Domain

1. Go to Cloudflare Dashboard → Pages → mathearo
2. Go to Settings → Custom domains
3. Add `mathhearo.com`

---

## Quick Commands to Copy:

```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mathearo.git
git push -u origin main
