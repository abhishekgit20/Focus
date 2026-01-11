# Quick Start Guide - Run Locally

## Prerequisites

- ✅ **Node.js 20+** (you have v24.12.0)
- ✅ **PostgreSQL 16+** installed and running
- ✅ **npm** (comes with Node.js)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env` File

Copy the example file:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

### 3. Set Up PostgreSQL Database

Create a database:

```bash
# Using psql (replace 'postgres' with your PostgreSQL username)
psql -U postgres

# Then in psql:
CREATE DATABASE serene_space;
\q
```

**Or using createdb command:**
```bash
createdb -U postgres serene_space
```

### 4. Configure `.env` File

Edit `.env` and update these **required** variables:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/serene_space

# Session Secret - Generate a random string (required for auth)
SESSION_SECRET=your-random-secret-key-here
```

**Generate Session Secret:**
- **Windows PowerShell:**
  ```powershell
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
  ```
- **Mac/Linux:**
  ```bash
  openssl rand -base64 32
  ```

**Optional (for full functionality):**
- `STRIPE_SECRET_KEY` - Get from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
- `STRIPE_PUBLISHABLE_KEY` - Get from Stripe Dashboard
- `RAZORPAY_KEY_ID` - Get from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
- `RAZORPAY_KEY_SECRET` - Get from Razorpay Dashboard
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)

**Note:** The app will run without these, but payment and AI features won't work.

### 5. Initialize Database Schema

```bash
npm run db:push
```

This creates all the required database tables.

### 6. Run the Development Server

```bash
npm run dev
```

This starts:
- ✅ Backend Express server on port 5000
- ✅ Frontend Vite dev server (served through the backend)
- ✅ Hot module replacement for fast development

### 7. Open in Browser

Navigate to:
```
http://localhost:5000
```

## Troubleshooting

### Database Connection Error

**Error:** `DATABASE_URL must be set`

**Solution:** Make sure your `.env` file exists and has the correct `DATABASE_URL` format:
```
DATABASE_URL=postgresql://username:password@localhost:5432/serene_space
```

### Port Already in Use

**Error:** `Port 5000 is already in use`

**Solution:** Either:
1. Change `PORT=5000` to a different port in `.env` (e.g., `PORT=3000`)
2. Stop the other application using port 5000

### Database Schema Errors

**Error:** Table doesn't exist

**Solution:** Run `npm run db:push` again to sync the database schema.

## Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server (after build)
- `npm run db:push` - Push database schema changes
- `npm run check` - Type check with TypeScript

## What's Running?

- **Backend API:** `http://localhost:5000/api/*`
- **Frontend:** `http://localhost:5000`
- **WebSocket:** `ws://localhost:5000/ws` (for real-time chat)

## Next Steps

1. Register a user account through the web interface
2. Explore the features (consultations, wallet, journaling, etc.)
3. Check the API endpoints at `/api/*`

