# ITSM Platform

Enterprise IT Support & Service Desk — built with Next.js, NestJS, SQLite and Redis.

---

## Tech Stack

| Layer      | Technology                           |
|------------|--------------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS |
| Backend    | NestJS, TypeScript, Prisma ORM       |
| Database   | SQLite (file-based, zero setup)      |
| Cache/Jobs | Redis                                |
| Auth       | JWT (15 min access + 7 day refresh)  |
| Process    | PM2                                  |
| Proxy      | Nginx                                |

---

## Local Development

### Prerequisites
- Node.js 20+
- Redis running on port 6379

### Backend
```bash
cd backend
cp .env.example .env        # edit values as needed
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev           # runs on http://localhost:4000
```

### Seed demo data (optional)
```bash
cd backend
npm run prisma:seed
```

### Frontend
```bash
cd frontend
cp .env.example .env.local  # edit NEXT_PUBLIC_API_URL if needed
npm install
npm run dev                 # runs on http://localhost:3000
```

---

## Default Credentials

| Role       | Email                 | Password        |
|------------|-----------------------|-----------------|
| Admin      | admin@itsm.local      | Admin@1234      |
| IT Support | itsupport@itsm.local  | Itsupport@1234  |
| User       | sudharshan@itsm.local | Sudharshan@1234 |

---

## VPS Deployment (Ubuntu / Debian)

### 1 — Server setup (one time)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server && sudo systemctl start redis-server

# Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 2 — Clone the repo

```bash
git clone https://github.com/yourusername/itsm-platform.git /var/www/itsm
cd /var/www/itsm
```

### 3 — Configure environment

```bash
cp backend/.env.example backend/.env
nano backend/.env
# Set: JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL

cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
# Set: NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

Generate strong JWT secrets:
```bash
openssl rand -hex 64   # for JWT_SECRET
openssl rand -hex 64   # for JWT_REFRESH_SECRET
```

### 4 — Build and start

```bash
mkdir -p logs

# Backend
cd backend && npm install --omit=dev
npx prisma generate && npx prisma migrate deploy
npm run build && cd ..

# Frontend
cd frontend && npm install --omit=dev
npm run build && cd ..

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # run the printed command to auto-start on reboot
```

### 5 — Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/itsm
sudo nano /etc/nginx/sites-available/itsm   # change server_name to your domain
sudo ln -s /etc/nginx/sites-available/itsm /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6 — SSL (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 7 — Seed users

```bash
cd /var/www/itsm/backend
NODE_ENV=production npm run prisma:seed
```

---

## Deploying Updates

```bash
cd /var/www/itsm
bash deploy.sh
```

Pulls latest → installs deps → migrates DB → builds → restarts PM2.

---

## PM2 Quick Reference

```bash
pm2 status                                         # service health
pm2 logs itsm-backend                              # backend logs
pm2 logs itsm-frontend                             # frontend logs
pm2 reload ecosystem.config.js --env production    # zero-downtime reload
```

---

## Project Structure

```
itsm-platform/
├── backend/              # NestJS API  →  port 4000
│   ├── prisma/           # Schema, migrations, seed
│   ├── src/              # Modules, controllers, services
│   ├── uploads/          # User-uploaded files
│   ├── .env.example
│   └── package.json
├── frontend/             # Next.js app  →  port 3000
│   ├── src/app/          # Pages (App Router)
│   ├── src/components/   # UI components
│   ├── src/lib/          # API client, utils
│   ├── src/stores/       # Zustand state
│   ├── .env.example
│   └── package.json
├── ecosystem.config.js   # PM2 process manager config
├── nginx.conf            # Nginx reverse proxy config
├── deploy.sh             # One-command deploy script
└── README.md
```
