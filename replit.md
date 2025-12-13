# Focus - Integrated Mental Health Platform for India

## Overview

Focus is a comprehensive mental health platform designed specifically for the Indian market. It connects users with psychiatrists, psychologists, therapists, and yoga gurus through a unified digital platform. The application integrates modern therapeutic approaches with traditional Indian wisdom, particularly drawing from the Bhagavad Gita for AI-powered counseling support.

Key features include:
- Professional consultations with mental health experts and yoga gurus
- AI-powered chatbot with Bhagavad Gita wisdom integration
- Wallet-based payment system for per-minute consultations
- Mood tracking and journaling capabilities
- Crisis detection and emergency helpline integration
- Professional dashboard for therapists and practitioners

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom Vedic/Saffron color palette theme
- **Animations**: Framer Motion for page transitions and UI animations
- **Fonts**: Plus Jakarta Sans (sans-serif) and Lora (serif) from Google Fonts

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints served under `/api` prefix
- **Build System**: esbuild for server bundling, Vite for client bundling

### Authentication System
- **Primary Auth**: Replit Auth using OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)
- **Fallback Auth**: Local strategy with Passport.js and bcrypt password hashing
- **Session Storage**: PostgreSQL-backed sessions with 7-day TTL

### Database Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: users, professional_profiles, wallets, sessions, journal_entries, chat_messages, reviews

### AI Integration
- **Provider**: OpenAI via Replit AI Integrations service
- **Model**: GPT-5 for chat completions
- **Use Cases**: Mental health counseling with Bhagavad Gita wisdom, journal insights, mood analysis
- **Crisis Detection**: Keyword-based detection with immediate helpline responses

### Payment Integration
- **Primary Provider**: Stripe via Replit Connectors (for international cards)
  - Sync Library: stripe-replit-sync for webhook management and data synchronization
- **UPI Provider**: Razorpay (for Indian UPI payments)
  - Client: `server/razorpayClient.ts` with HMAC-SHA256 signature verification
  - Order tracking via `payment_orders` table for security and replay prevention
  - Required secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- **Model**: Wallet-based prepaid system with per-minute billing for consultations

### Project Structure
```
client/           # React frontend application
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Route-based page components
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utilities and API functions
server/           # Express backend
├── index.ts      # Server entry point
├── routes.ts     # API route definitions
├── storage.ts    # Database operations
├── auth.ts       # Authentication logic
└── ai.ts         # AI service integration
shared/           # Shared code between client and server
└── schema.ts     # Drizzle database schema
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management and query building

### Authentication Services
- **Replit OIDC**: Primary authentication provider via `ISSUER_URL`
- **Session Secret**: Required `SESSION_SECRET` environment variable

### AI Services
- **OpenAI API**: Accessed through Replit AI Integrations
  - `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - `AI_INTEGRATIONS_OPENAI_API_KEY`

### Payment Processing
- **Stripe**: Payment processing via Replit Connectors
  - Managed webhooks for event synchronization
  - Development/Production environment separation

### External APIs
- **Google Fonts**: Typography (Plus Jakarta Sans, Lora)
- **Pexels Videos**: Hero section background videos
- **Unsplash Images**: Professional profile images and illustrations

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` + `drizzle-kit`: Database ORM and migrations
- `passport` + `openid-client`: Authentication
- `stripe` + `stripe-replit-sync`: Payment processing
- `framer-motion`: Animations
- `sonner`: Toast notifications