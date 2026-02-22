#!/bin/bash
# WayWork Railway Deployment Script
# Run this from the project root: bash scripts/deploy-railway.sh

set -e

echo "🚀 WayWork Railway Deployment"
echo "=============================="
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null 2>&1; then
    echo "📝 You need to log in to Railway first."
    echo "   Running: railway login"
    railway login
fi

echo "✅ Logged in as: $(railway whoami)"
echo ""

# Initialize project if needed
if ! railway status &> /dev/null 2>&1; then
    echo "📦 Creating new Railway project..."
    railway init --name waywork
    echo ""
fi

# Add PostgreSQL if not already present
echo "🗄️  Setting up PostgreSQL database..."
echo "   If you haven't added PostgreSQL yet, please add it from the Railway dashboard."
echo "   Railway will automatically set DATABASE_URL."
echo ""

# Set environment variables
echo "🔧 Setting environment variables..."
railway vars set AUTH_SECRET="$(openssl rand -base64 32)" 2>/dev/null || true
railway vars set AUTH_URL="https://waywork.up.railway.app" 2>/dev/null || true
railway vars set NEXT_PUBLIC_APP_URL="https://waywork.up.railway.app" 2>/dev/null || true
railway vars set EMAIL_FROM="WayWork <noreply@waywork.com>" 2>/dev/null || true

echo ""
echo "🚂 Deploying to Railway..."
railway up --detach

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "   1. Add a PostgreSQL database from your Railway dashboard"
echo "   2. Railway will auto-inject DATABASE_URL"
echo "   3. Generate a domain: railway domain"
echo "   4. Your app will be live at the generated URL!"
echo ""
echo "   To check deployment status: railway status"
echo "   To view logs: railway logs"
echo "   To open dashboard: railway open"
