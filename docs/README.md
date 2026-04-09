# Korevel Xenon

## Stacks

- Vercel: Next.js 16, React 19, TypeScript
- Supabase: Postgres
- Resend: Email
- Clerk: Authentication

## Environment Variables

- `POSTGRES_PRISMA_URL` - Supabase Postgres connection string
- `DIRECT_URL` - Supabase Postgres connection string

## Migration

- Vercel Postgres to Supabase Postgres

### Commands

- `npx prisma db seed` - Seed the database
- `npx prisma migrate dev` - Create the database schema
- `npx prisma generate` - Generate the Prisma client
