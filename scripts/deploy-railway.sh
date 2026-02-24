#!/bin/bash
# WayWork Railway Deployment Script
# Run this from the project root: bash scripts/deploy-railway.sh
# Optional:
#   APP_URL="https://your-domain.com" bash scripts/deploy-railway.sh
#   SEED_DEMO_DATA="true" bash scripts/deploy-railway.sh

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
if command -v openssl &> /dev/null; then
    AUTH_SECRET_VALUE="$(openssl rand -base64 32)"
else
    AUTH_SECRET_VALUE="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
fi
railway vars set AUTH_SECRET="$AUTH_SECRET_VALUE" 2>/dev/null || true
railway vars set AUTH_TRUST_HOST="true" 2>/dev/null || true
railway vars set EMAIL_FROM="WayWork <noreply@waywork.com>" 2>/dev/null || true

if [ -n "${APP_URL:-}" ]; then
    railway vars set AUTH_URL="$APP_URL" 2>/dev/null || true
    railway vars set NEXT_PUBLIC_APP_URL="$APP_URL" 2>/dev/null || true
    echo "✅ Set AUTH_URL/NEXT_PUBLIC_APP_URL to $APP_URL"
else
    echo "ℹ️ APP_URL not set. AUTH_URL/NEXT_PUBLIC_APP_URL will be set after domain creation."
fi

echo ""
echo "🚂 Deploying to Railway..."
railway up --detach

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "🗄️ Running database schema sync..."
PUBLIC_DB_URL="$(railway run -s Postgres -- node -e "process.stdout.write(process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '')" 2>/dev/null || true)"
if [ -n "$PUBLIC_DB_URL" ]; then
    if DATABASE_URL="$PUBLIC_DB_URL" npm run db:deploy; then
        echo "✅ Database schema synced"
    else
        echo "⚠️ Could not sync schema automatically. Run: DATABASE_URL=\"<postgres-public-url>\" npm run db:deploy"
    fi
else
    echo "⚠️ Could not resolve Postgres public URL. Run schema sync manually."
fi

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    echo ""
    echo "🌱 Seeding demo data..."
    railway run npm run db:seed
fi

echo ""
echo "📋 Next steps:"
echo "   1. Ensure PostgreSQL is attached (Railway auto-injects DATABASE_URL)"
echo "   2. Generate a domain: railway domain"
echo "   3. Set APP_URL vars once domain is known:"
echo "      railway vars set AUTH_URL=https://<your-domain>"
echo "      railway vars set NEXT_PUBLIC_APP_URL=https://<your-domain>"
echo "   4. Redeploy: railway up --detach"
echo ""
echo "   To check deployment status: railway status"
echo "   To view logs: railway logs"
echo "   To open dashboard: railway open"
