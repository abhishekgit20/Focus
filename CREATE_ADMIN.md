# Create Admin User

The recommended way to create the admin user is the built-in script, which generates a random password (shown once in the console) instead of a fixed one.

## Option 1: Run the Admin Creation Script (Recommended)

Make sure your `.env` file has `DATABASE_URL` set, then run:

```bash
npm run create-admin
```

This connects through the app's own database layer (`server/createAdmin.ts`), checks whether an admin already exists for `admin@focus.com` (override with the `ADMIN_EMAIL` env var), and if not, creates one with a freshly generated random password printed to the console **once**. Save it in a password manager immediately — change it after first login.

## Option 2: Run the Seed Script (creates full sample data)

```bash
npx tsx server/seed.ts
```

This is for **local development only** — it creates an admin plus sample client/professional accounts with a fixed demo password. Do not run this against a production database.

## Option 3: Direct SQL (advanced)

If you need to create the admin manually against a database directly, hash a password with bcrypt yourself and insert it:

```bash
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('YOUR-OWN-STRONG-PASSWORD',10).then(h=>console.log(h))"
```

```sql
INSERT INTO users (id, email, password, role, full_name, phone, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@focus.com',
  '<paste the bcrypt hash from above>',
  'admin',
  'Focus Admin',
  '+91 99999 99999',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
```

⚠️ **Important:** Whatever method you use, treat the admin password like a production secret — never commit it, and rotate it if it's ever shared over an insecure channel.
