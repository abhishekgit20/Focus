# Serene Space - Mental Health & Wellness Platform

A comprehensive mental health platform designed to connect users with psychiatrists, psychologists, therapists, and yoga gurus through a unified digital platform. The application integrates modern therapeutic approaches with traditional Indian wisdom, particularly drawing from the Bhagavad Gita for AI-powered counseling support.

## Features

- **Professional Consultations**: Connect with mental health experts and yoga gurus
- **AI-Powered Chatbot**: Mental health counseling with Bhagavad Gita wisdom integration
- **Wallet-Based Payments**: Per-minute consultation billing system
- **Mood Tracking & Journaling**: Track your mental health journey
- **Crisis Detection**: Emergency helpline integration
- **Professional Dashboard**: Tools for therapists and practitioners

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Wouter** for routing
- **TanStack React Query** for state management
- **shadcn/ui** component library with Radix UI
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### Backend
- **Node.js 20 LTS** with Express.js
- **TypeScript** with ESM modules
- **PostgreSQL** database
- **Drizzle ORM** for database management
- **Passport.js** for authentication
- **WebSocket** for real-time chat

### Services
- **Stripe** for international payments
- **Razorpay** for Indian UPI payments
- **OpenAI** for AI-powered features

## Prerequisites

- **Node.js 20 LTS** or higher
- **PostgreSQL 16** or higher
- **npm** or **yarn** package manager

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Serene-Space
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/serene_space

# Session Configuration
SESSION_SECRET=your-session-secret-key-change-in-production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o
```

**Important**: 
- Generate a secure `SESSION_SECRET` using: `openssl rand -base64 32`
- Get Stripe keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- Get Razorpay keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
- Get OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### 4. Set Up Database

Create a PostgreSQL database:

```bash
createdb serene_space
# Or using psql:
psql -U postgres
CREATE DATABASE serene_space;
```

Push the database schema:

```bash
npm run db:push
```

### 5. Run the Application

#### Development Mode

```bash
npm run dev
```

This will start both the frontend (Vite dev server) and backend (Express server) on port 5000.

#### Production Build

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
Serene-Space/
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route-based page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and API functions
│   └── index.html
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route definitions
│   ├── auth.ts          # Authentication logic
│   ├── storage.ts       # Database operations
│   ├── ai.ts            # AI service integration
│   ├── stripeClient.ts  # Stripe integration
│   └── razorpayClient.ts # Razorpay integration
├── shared/              # Shared code between client and server
│   └── schema.ts        # Drizzle database schema
├── script/              # Build and utility scripts
└── dist/                # Production build output
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm run db:push` - Push database schema changes

## Deployment

### Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add a PostgreSQL service
4. Set all environment variables in Railway dashboard
5. Railway will automatically detect the build and start commands

**Environment Variables to Set:**
- `DATABASE_URL` (automatically provided by Railway PostgreSQL service)
- `SESSION_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `OPENAI_API_KEY`
- `NODE_ENV=production`
- `PORT` (Railway sets this automatically)
- `BASE_URL` (your Railway app URL)

### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the following:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add a PostgreSQL database
5. Set all environment variables in Render dashboard

**Environment Variables to Set:**
- `DATABASE_URL` (automatically provided by Render PostgreSQL service)
- `SESSION_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `OPENAI_API_KEY`
- `NODE_ENV=production`
- `PORT` (Render sets this automatically)
- `BASE_URL` (your Render app URL)

### Stripe Webhook Configuration

After deployment, configure Stripe webhooks:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-app-url.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` environment variable

## Development Notes

- The application uses **PostgreSQL sessions** for session storage (production-ready)
- Authentication uses **Passport.js** with local strategy (email/password)
- All API routes are prefixed with `/api`
- Frontend is served from the same server in production (SPA routing)
- Development mode uses Vite middleware for hot module replacement

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

