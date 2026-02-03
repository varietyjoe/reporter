# Deployment Checklist (Neon + Vercel)

## 1) Create Neon database
- Create a project + database in Neon.
- Copy the connection string (with sslmode=require).

## 2) Configure Vercel
- Import repo into Vercel.
- Add environment variables:
  - DATABASE_URL
  - HUBSPOT_ACCESS_TOKEN
  - GRAIN_API_KEY
  - ANTHROPIC_API_KEY
  - NEXTAUTH_URL
  - NEXTAUTH_SECRET

## 3) Run migrations
- Set DATABASE_URL locally to the Neon connection string.
- Run: `npx prisma migrate dev --name init`
- Or use `npx prisma db push` for a quick start.

## 4) Verify
- Open `/dashboard/settings` and confirm:
  - HubSpot connected
  - Seats list loads
  - Auto-map owners works
