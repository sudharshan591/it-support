#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  ITSM Platform — VPS Deploy Script
#  Run this on your VPS after every git pull
# ─────────────────────────────────────────────────────────────
set -e

echo "▶ Pulling latest code..."
git pull origin main

# ── Backend ──────────────────────────────────────────────────
echo "▶ Installing backend dependencies..."
cd backend
npm install --omit=dev

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Building backend..."
npm run build

cd ..

# ── Frontend ─────────────────────────────────────────────────
echo "▶ Installing frontend dependencies..."
cd frontend
npm install --omit=dev

echo "▶ Building frontend..."
npm run build

cd ..

# ── PM2 ──────────────────────────────────────────────────────
echo "▶ Restarting services with PM2..."
pm2 reload ecosystem.config.js --env production

echo ""
echo "✅ Deployment complete!"
echo "   Backend  → http://localhost:4000/api"
echo "   Frontend → http://localhost:3000"
