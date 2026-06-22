# 360° Feedback Web App — Setup Guide

## Quick Start (5 steps)

### 1. Edit `config.json`

Open `config.json` and fill in your company info:

```json
{
  "companyName": "Your Company",
  "allowedDomains": ["yourcompany.com"],
  "adminEmails": ["hr@yourcompany.com"],
  "notionEnabled": false,
  "members": [
    { "name": "Alice", "email": "alice@yourcompany.com", "notionDbId": "" },
    { "name": "Bob", "email": "bob@yourcompany.com", "notionDbId": "" }
  ]
}
```

- `allowedDomains`: Only emails from these domains can log in
- `adminEmails`: These users can see all feedback in the Admin page
- `notionEnabled`: Set to `true` if you want Notion daily standup integration
- `members`: List all team members (name + email)

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. Copy the Client ID and Client Secret

### 3. Create Database (Turso)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login & create database
turso auth login
turso db create 360-feedback
turso db show 360-feedback --url    # Copy DATABASE_URL
turso db tokens create 360-feedback  # Copy DATABASE_AUTH_TOKEN
```

### 4. Deploy to Vercel

```bash
# Install dependencies
npm install

# Push schema to database
npx prisma db push

# Seed initial sprints (edit prisma/seed.ts first!)
npx tsx prisma/seed.ts

# Deploy
npm i -g vercel
vercel login
vercel --prod
```

### 5. Set Environment Variables on Vercel

Go to Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `libsql://your-db.turso.io` |
| `DATABASE_AUTH_TOKEN` | (from turso db tokens create) |
| `AUTH_SECRET` | (run `npx auth secret` to generate) |
| `AUTH_URL` | `https://your-domain.vercel.app` |
| `AUTH_GOOGLE_ID` | (from Google Cloud Console) |
| `AUTH_GOOGLE_SECRET` | (from Google Cloud Console) |
| `CRON_SECRET` | (run `openssl rand -hex 32`) |

Optional (if `notionEnabled: true`):
| `NOTION_TOKEN` | (from Notion integrations page) |

---

## Feedback Cycles

Edit `prisma/seed.ts` to set up your feedback periods:

**Quarterly:**
```typescript
const sprints = [
  { name: "2026-Q3", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-30") },
  { name: "2026-Q4", startDate: new Date("2026-10-01"), endDate: new Date("2026-12-31") },
]
```

**Monthly:**
```typescript
const sprints = [
  { name: "2026-Jul", startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") },
  { name: "2026-Aug", startDate: new Date("2026-08-01"), endDate: new Date("2026-08-31") },
]
```

Then run: `npx tsx prisma/seed.ts`

---

## Features

- Google login (only allowed domains)
- Anonymous 360° feedback with 3 score categories
- Per-member profile pages
- Admin dashboard with all feedback
- Edit/delete your own feedback
- Daily auto-backup (Admin > Database Backup)
- Notion daily standup integration (optional)

## Support

Contact: nynin1@hayanmind.com
