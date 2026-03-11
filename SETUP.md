# Math Heroes - Setup Guide

## Quick Start

The application is now running on: **http://localhost:3080**

## ⚠️ Important: Create Teacher Account

Before you can use the admin panel, you need to create the teacher account:

### Method 1: Using Browser
1. Open your browser
2. Navigate to: `http://localhost:3080/api/seed`
3. You should see a success message

### Method 2: Using PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:3080/api/seed" -Method POST
```

### Method 3: Using curl
```bash
curl -X POST http://localhost:3080/api/seed
```

## 🔐 Login Credentials

After seeding, use these credentials to login:

- **Email:** admin@school.com
- **Password:** password123

## 📱 Application Pages

1. **Homepage:** http://localhost:3080
2. **Game:** http://localhost:3080/game
3. **Teacher Login:** http://localhost:3080/login
4. **Admin Dashboard:** http://localhost:3080/admin (requires login)

## 🎮 How to Use

### For Students:
1. Go to homepage
2. Click "ابدأ اللعبة" (Start Game)
3. Enter your name
4. Answer 10 questions about doubling and halving numbers
5. View your results!

### For Teachers:
1. Click "لوحة المعلم" (Teacher Panel)
2. Login with the credentials above
3. View all student scores
4. Configure game sounds (optional)

## 🎵 Adding Sounds (Optional)

From the admin dashboard, you can add URLs for:
- Success sound (when answer is correct)
- Error sound (when answer is wrong)
- Background music

Example sound URLs you can use:
- https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3
- https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3

## 🛠️ Troubleshooting

### MongoDB Connection Error
Make sure MongoDB is running:
```powershell
# Check if MongoDB service is running
Get-Service -Name MongoDB

# Or start MongoDB manually if installed
mongod
```

### Port Already in Use
If port 3000 is busy, you can change it:
```powershell
# Stop the current server (Ctrl+C)
# Then run with a different port
$env:PORT=3001; npm run dev
```

## ✨ Features Implemented

✅ Full Arabic UI with RTL support
✅ Cairo font for kid-friendly design
✅ Interactive double/half game
✅ Confetti animations on correct answers
✅ Shake animation on wrong answers
✅ Teacher authentication with NextAuth
✅ Admin dashboard with student scores
✅ Audio settings management
✅ MongoDB integration
✅ Responsive design
✅ Beautiful gradient backgrounds

Enjoy teaching math! 🎉
