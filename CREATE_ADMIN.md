# Create Admin User

The admin user doesn't exist in your database yet. Here are 3 ways to create it:

## Option 1: Using Registration Endpoint (Easiest)

Since the registration endpoint currently only allows 'client' or 'professional' roles, you'll need to temporarily modify it or use Option 2/3.

## Option 2: Direct SQL Query (Recommended)

Connect to your PostgreSQL database and run:

```sql
-- First, check if admin exists
SELECT * FROM users WHERE email = 'admin@focus.com';

-- If it doesn't exist, create it (password is 'password123' hashed)
-- You'll need to hash the password first. Use this Node.js one-liner:
-- node -e "const bcrypt=require('bcryptjs');bcrypt.hash('password123',10).then(h=>console.log(h))"

-- Or use this SQL (if you have pgcrypto extension):
INSERT INTO users (id, email, password, role, full_name, phone, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@focus.com',
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- This is 'password123' hashed
  'admin',
  'Focus Admin',
  '+91 99999 99999',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
```

## Option 3: Run Seed Script (Creates all sample data)

Make sure your `.env` file has `DATABASE_URL` set, then run:

```bash
npx tsx server/seed.ts
```

This will create:
- Admin user: `admin@focus.com` / `password123`
- Client user: `rahul@example.com` / `password123`
- Professional users: `dr.mehta@focus.com` / `password123`

## Option 4: Quick Node.js Script

Create a file `create-admin.js`:

```javascript
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  await pool.query(`
    INSERT INTO users (id, email, password, role, full_name, phone, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
  `, ['admin@focus.com', hashedPassword, 'admin', 'Focus Admin', '+91 99999 99999']);
  
  console.log('✅ Admin user created!');
  console.log('Email: admin@focus.com');
  console.log('Password: password123');
  process.exit(0);
}

createAdmin().catch(console.error);
```

Then run: `node create-admin.js`

## Admin Credentials

Once created, use:
- **Email:** `admin@focus.com`
- **Password:** `password123`

⚠️ **Important:** Change the password after first login!



