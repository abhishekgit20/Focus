# Serene Space - Complete Features Documentation

**Project Name:** Serene Space (Focus)  
**Type:** Mental Health & Wellness Platform  
**Version:** 1.0  
**Date:** 2024

---

## Table of Contents

1. [Overview](#overview)
2. [User Authentication & Management](#user-authentication--management)
3. [Professional Services](#professional-services)
4. [AI-Powered Features](#ai-powered-features)
5. [Payment & Wallet System](#payment--wallet-system)
6. [Sessions & Consultations](#sessions--consultations)
7. [Journaling & Mood Tracking](#journaling--mood-tracking)
8. [Reviews & Feedback System](#reviews--feedback-system)
9. [Admin Dashboard](#admin-dashboard)
10. [Resources & Recommendations](#resources--recommendations)
11. [Partner Program](#partner-program)
12. [User Profile & Dashboard](#user-profile--dashboard)
13. [Real-time Communication](#real-time-communication)
14. [Technical Features](#technical-features)

---

## Overview

Serene Space is a comprehensive mental health platform designed specifically for the Indian market. It connects users with psychiatrists, psychologists, therapists, and yoga gurus through a unified digital platform. The application integrates modern therapeutic approaches with traditional Indian wisdom, particularly drawing from the Bhagavad Gita for AI-powered counseling support.

**Key Value Propositions:**
- Accessible mental healthcare for 200+ million Indians
- Breaking stigma around mental health
- Integration of ancient wisdom with modern therapy
- Multi-language support (English, Hindi)
- Affordable per-minute consultation billing

---

## User Authentication & Management

### Registration & Login
- **Email/Password Registration**: Users can create accounts with email and password
- **Role-Based Registration**: Support for three user roles:
  - **Client**: Standard users seeking mental health services
  - **Professional**: Therapists, psychiatrists, psychologists, yoga gurus
  - **Admin**: Platform administrators
- **Password Security**: Bcrypt hashing with salt rounds
- **Email Validation**: Server-side email format validation
- **Password Requirements**: Minimum length validation

### Social Authentication
- **Google OAuth 2.0**: One-click login with Google account
  - Automatic account creation if email doesn't exist
  - Automatic wallet creation for new client users
  - Session management with secure cookies
- **Apple OAuth** (Partial Implementation): Framework in place for Apple Sign-In

### Session Management
- **PostgreSQL-Backed Sessions**: Secure session storage using `connect-pg-simple`
- **Session Security**:
  - HTTP-only cookies
  - Secure cookies in production
  - SameSite protection
  - 7-day session TTL
- **Session Persistence**: Maintains login state across browser sessions

### User Profile Management
- **Profile Information**:
  - Full name
  - Email address
  - Profile image (with fallback to initials)
  - Account creation date
  - User role
- **Profile Updates**: Users can update their profile information
- **Avatar System**: Automatic generation of user initials for profile display

---

## Professional Services

### Professional Directory
- **Browse Professionals**: View all available mental health professionals
- **Professional Profiles**: Detailed information including:
  - Name and credentials
  - Specialization (Psychiatry, Psychology, Therapy, Yoga)
  - Bio and experience
  - Ratings and reviews
  - Availability status
  - Consultation types (Video, Chat, In-Person)
  - Pricing per minute
- **Search & Filter**: Find professionals by specialization, availability, or rating

### Professional Registration
- **Professional Profile Creation**: Extended profile for professionals including:
  - Specialization
  - Qualifications
  - Years of experience
  - Bio/description
  - Consultation types offered
  - Pricing structure
  - Availability schedule

### Professional Dashboard
- **Session Management**:
  - View upcoming sessions
  - View past sessions
  - Session status tracking (scheduled, active, completed, cancelled)
  - Client information for each session
- **Earnings Tracking**:
  - Total earnings
  - Today's earnings
  - Earnings history
  - Wallet balance
- **Statistics**:
  - Total sessions conducted
  - Sessions today
  - Average session duration
  - Client satisfaction metrics
- **Availability Management**: Update availability status and schedule

---

## AI-Powered Features

### Gita Wisdom Chatbot
- **24/7 Availability**: Round-the-clock mental health support
- **Bhagavad Gita Integration**: Responses incorporate ancient Indian wisdom
- **Multilingual Support**: English and Hindi language support
- **Contextual Responses**: AI understands conversation context and provides relevant guidance
- **Crisis Detection**: Automatic detection of crisis keywords including:
  - Suicide-related terms
  - Self-harm indicators
  - Hindi crisis keywords
- **Emergency Response**: Immediate display of crisis helplines when detected:
  - iCall: 9152987821
  - Vandrevala Foundation: 1860-2662-345
  - NIMHANS: 080-46110007
  - Snehi: 044-24640050
  - Emergency: 112

### Public Chat (Pre-Login)
- **Anonymous Chat**: Users can chat with AI before creating an account
- **Limited Features**: Basic AI interaction without personalization
- **Conversion Path**: Encourages account creation for full features

### Journal Insights
- **AI-Powered Analysis**: Automatic analysis of journal entries
- **Personalized Insights**: Tailored feedback based on journal content
- **Mood Pattern Recognition**: Identifies trends in emotional states
- **Actionable Recommendations**: Suggests activities based on journal content

### Mood Analysis
- **Sentiment Analysis**: AI analyzes text for emotional state
- **Mood Tracking**: Tracks mood patterns over time
- **Visualization**: Charts and graphs showing mood trends

### AI Model Configuration
- **OpenAI Integration**: Uses GPT-4o model (configurable)
- **Error Handling**: Comprehensive error handling for API failures
- **Quota Management**: Graceful handling of API quota limits
- **Response Optimization**: Efficient token usage and response formatting

---

## Payment & Wallet System

### Wallet Features
- **Prepaid Wallet**: Users maintain a wallet balance for consultations
- **Balance Display**: Real-time wallet balance
- **Transaction History**: Complete history of all wallet transactions
- **Auto-Debit**: Automatic deduction for per-minute consultations

### Recharge Options
- **Multiple Recharge Packs**:
  - ₹500 pack
  - ₹1000 pack (with bonus)
  - ₹2000 pack (with bonus)
  - ₹5000 pack (with bonus)
- **Bonus Credits**: Additional credits on higher value recharges
- **Flexible Amounts**: Custom recharge amounts supported

### Payment Gateways

#### Stripe Integration
- **International Payments**: Support for international credit/debit cards
- **Secure Checkout**: Stripe-hosted checkout pages
- **Webhook Support**: Real-time payment verification
- **Payment Intent**: Secure payment processing
- **Success/Cancel Redirects**: User-friendly payment flow

#### Razorpay Integration
- **Indian Payment Methods**: Support for Indian payment options
- **UPI Payments**: Direct UPI integration
- **Net Banking**: Bank transfer support
- **Wallets**: Support for Paytm, PhonePe, etc.
- **Order Verification**: HMAC-SHA256 signature verification
- **Replay Prevention**: Payment order tracking to prevent duplicate charges

### Transaction Management
- **Transaction Types**:
  - Recharge (wallet top-up)
  - Consultation payment
  - Refund (if applicable)
- **Transaction Status**: Pending, completed, failed
- **Receipt Generation**: Transaction receipts for all payments

---

## Sessions & Consultations

### Session Booking
- **Professional Selection**: Choose from available professionals
- **Session Type Selection**:
  - Video consultation
  - Chat consultation
  - In-person consultation
- **Scheduling**: Book sessions with preferred professionals
- **Availability Check**: Real-time availability verification

### Session Management
- **Session Status Tracking**:
  - Scheduled: Booked but not started
  - Active: Currently in progress
  - Completed: Successfully finished
  - Cancelled: User or professional cancelled
- **Session Duration**: Automatic tracking of session length
- **Per-Minute Billing**: Charges calculated based on actual duration
- **Session History**: Complete history of all sessions

### Real-Time Consultation
- **WebSocket Support**: Real-time communication during sessions
- **Video Consultation**: Video call integration (framework ready)
- **Chat Consultation**: Real-time text chat during sessions
- **Session Timer**: Automatic tracking of consultation duration
- **Cost Calculation**: Real-time cost calculation based on duration

### Professional Session Management
- **Upcoming Sessions**: View all scheduled sessions
- **Client Information**: Access to client details for each session
- **Session Control**: Start, end, and manage active sessions
- **Earnings Calculation**: Automatic earnings calculation per session

---

## Journaling & Mood Tracking

### Journal Entries
- **Create Entries**: Users can write journal entries
- **Rich Text Support**: Support for formatted text
- **Date/Time Stamping**: Automatic timestamp for each entry
- **Entry History**: View all past journal entries
- **Search & Filter**: Find entries by date or content

### AI-Powered Journal Insights
- **Automatic Analysis**: AI analyzes journal entries after creation
- **Personalized Insights**: Tailored feedback based on entry content
- **Pattern Recognition**: Identifies recurring themes and emotions
- **Actionable Suggestions**: Recommendations for self-care activities

### Mood Tracking
- **Mood Logging**: Record daily mood states
- **Mood Scale**: 1-10 scale for mood rating
- **Visual Tracking**: Charts showing mood trends over time
- **Mood Patterns**: Identification of mood patterns and triggers
- **Weekly/Monthly Views**: Aggregate mood data visualization

### Profile Statistics
- **Self-Care Streak**: Track consecutive days of self-care activities
- **Total Practice Hours**: Cumulative time spent on wellness activities
- **Badges & Achievements**: Recognition for milestones
- **Progress Visualization**: Charts and graphs showing progress
- **Monthly Goals**: Set and track monthly wellness goals

---

## Reviews & Feedback System

### Professional Reviews
- **Rating System**: 1-5 star rating for professionals
- **Written Reviews**: Detailed feedback about sessions
- **Review Display**: Public display of reviews on professional profiles
- **Review History**: View all reviews given by a user
- **Average Rating**: Automatic calculation of professional ratings

### User Feedback System
- **Feedback Submission**: Users can submit platform feedback
- **Rating System**: 1-5 star rating for overall experience
- **Feature Feedback**: Specify which features were used
- **Public Testimonials**: Option to display feedback as public testimonial
- **Anonymous Option**: Users can submit anonymous feedback
- **Review Process**: Admin moderation before public display

### Testimonials on Homepage
- **Dynamic Testimonials**: Approved feedback displayed on homepage
- **Always 3 Testimonials**: Ensures homepage always shows 3 testimonials
- **Fallback System**: Default testimonials if insufficient approved feedback
- **Anonymous Display**: Shows "Anonymous" if name not provided
- **Text Truncation**: Long feedback truncated with ellipsis

---

## Admin Dashboard

### Admin Authentication
- **Dedicated Login**: Separate admin login page (`/admin/login`)
- **Role Verification**: Ensures only admin role can access
- **Secure Access**: Admin-only routes protected by middleware

### Feedback Management
- **View All Feedback**: Complete list of all user feedback submissions
- **Status Management**: 
  - Pending: Awaiting review
  - Approved: Published as testimonials
  - Rejected: Not suitable for public display
- **Bulk Actions**: Approve or reject multiple feedback entries
- **Statistics Dashboard**:
  - Total feedback count
  - Pending feedback count
  - Approved feedback count
  - Rejected feedback count
- **Feedback Details**: View complete feedback including:
  - User name (or anonymous)
  - Rating
  - Feedback text
  - Features used
  - Submission date
  - Homepage display preference

### Admin Features
- **User Management**: View and manage user accounts (framework ready)
- **Professional Verification**: Verify professional credentials (framework ready)
- **Platform Analytics**: View platform usage statistics (framework ready)

---

## Resources & Recommendations

### Book Recommendations
- **Curated Book List**: Handpicked books for mental wellness
- **Book Details**: Each book includes:
  - Title and author
  - Cover image
  - Category tags
  - Rating
  - Mindfulness summary
  - "Why this helps" section
- **Featured Books**:
  - The Power of Now (Eckhart Tolle)
  - Atomic Habits (James Clear)
  - Why We Sleep (Matthew Walker)
  - Man's Search for Meaning (Viktor E. Frankl)
  - The Bhagavad Gita (Vyasa)
  - The Upanishads (Various Sages)
  - The Yoga Sutras of Patanjali (Patanjali)

### Book Detail Pages
- **Dynamic Routing**: Individual page for each book (`/reads/:id`)
- **Comprehensive Information**:
  - High-quality book cover
  - Full title and author
  - Rating display
  - Category tags
  - Detailed mindfulness summary
  - Mental wellbeing benefits explanation
- **Purchase Links**: Direct links to purchase books (Amazon India)
- **External Links**: Opens in new tab with security (`rel="noopener noreferrer"`)

### App Recommendations
- **Wellness Apps**: Recommendations for mental health apps
- **Featured Apps**:
  - Headspace (Meditation app)
  - Calm.com (Sleep and meditation)
- **External Links**: Direct links to app websites

### Resource Categories
- **Books**: Self-help and spiritual books
- **Apps**: Mobile and web applications
- **Articles**: Mental health articles (framework ready)

---

## Partner Program

### Individual Partner Registration
- **Partner Inquiry Form**: Form for individuals interested in partnering
- **Information Collection**:
  - Name
  - Email
  - Phone
  - Organization (optional)
  - Message/Inquiry
- **Submission**: Secure form submission to backend

### Organization Partner Registration
- **Organization Inquiry**: Separate form for organizations
- **Business Information**: Company/organization details
- **Partnership Type**: Specify type of partnership interest
- **Contact Information**: Primary contact details

### Partner Management
- **Inquiry Tracking**: All partner inquiries stored in database
- **Admin Review**: Admin can review and respond to inquiries
- **Follow-up System**: Framework for partner onboarding process

---

## User Profile & Dashboard

### My Journey Page
- **Personalized Greeting**: Welcome message with user's name
- **Wellbeing Snapshot**: Overview of user's mental health journey
- **Statistics Display**:
  - Self-care streak (consecutive days)
  - Moments of growth (badges earned)
  - Time invested in wellbeing (total practice hours)
  - Monthly self-care goal progress
- **Emotional Support**: Affirming messages and encouragement
- **Progress Visualization**:
  - Line charts for mood trends
  - Area charts for activity patterns
  - Progress bars for goals
- **Mood Tracking**: Weekly mood chart with daily scores
- **Activity Tracking**: Daily activity minutes visualization

### Next Gentle Step
- **Optional Guidance**: Non-mandatory suggestions for daily activities
- **Activity Options**:
  - Continue last chat session
  - Quick breathing exercise
  - Write one journal line
- **Supportive Language**: Encouraging, non-commanding tone
- **Flexible Approach**: All suggestions are optional

### Progress Tracking
- **Streak System**: Track consecutive days of self-care
- **Badge System**: Earn badges for milestones
- **Practice Hours**: Total time spent on wellness activities
- **Monthly Goals**: Set and track monthly objectives
- **Progress Explanation**: "How is this calculated?" tooltip
- **Non-Judgmental Approach**: Emphasis on personal progress, not comparison

### Formula Guide
- **Transparency**: Explains how metrics are calculated
- **Progress Philosophy**: Emphasizes personal progress over comparison
- **Educational Content**: Helps users understand their journey

---

## Real-Time Communication

### WebSocket Support
- **Real-Time Chat**: WebSocket server for instant messaging
- **Session-Based Communication**: Real-time chat during consultations
- **Message Persistence**: All messages stored in database
- **Connection Management**: Automatic reconnection on disconnect

### Chat Features
- **Message History**: Complete conversation history
- **Typing Indicators**: Show when user is typing (framework ready)
- **Read Receipts**: Message delivery confirmation (framework ready)
- **File Sharing**: Support for sharing files (framework ready)

### Professional Chat
- **Dedicated Chat Interface**: Full-screen chat for consultations
- **Session Integration**: Chat linked to consultation sessions
- **Message Timestamps**: Track when messages were sent
- **Client Information**: Display client details during chat

---

## Technical Features

### Frontend Architecture
- **React 19**: Latest React with TypeScript
- **Vite**: Fast build tool and dev server
- **Wouter**: Lightweight client-side routing
- **TanStack React Query**: Server state management with caching
- **shadcn/ui**: Accessible component library
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions

### Backend Architecture
- **Node.js 20 LTS**: Latest LTS version
- **Express.js**: Web framework
- **TypeScript**: Type-safe code
- **ESM Modules**: Modern JavaScript modules
- **PostgreSQL**: Relational database
- **Drizzle ORM**: Type-safe database queries

### Database Features
- **Connection Pooling**: Efficient database connections
- **SSL Support**: Secure database connections for remote databases
- **Retry Logic**: Automatic retry on connection failures
- **Query Timeouts**: Prevents hanging queries
- **Migration System**: Drizzle-kit for schema management

### Security Features
- **Password Hashing**: Bcrypt with salt rounds
- **Session Security**: HTTP-only, secure cookies
- **CORS Protection**: Configured CORS policies
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries via ORM
- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: SameSite cookie attributes

### Performance Optimizations
- **Code Splitting**: Lazy loading of non-critical pages
- **Image Optimization**: Lazy loading and proper sizing
- **React Query Caching**: 5-minute cache for API calls
- **Compression**: Gzip compression for responses
- **Database Indexing**: Optimized database queries
- **Connection Pooling**: Efficient database connections

### Deployment Features
- **Production Build**: Optimized production builds
- **Environment Variables**: Secure configuration management
- **Docker Support**: Multi-stage Docker builds
- **Railway Ready**: Deployment configuration for Railway
- **Render Ready**: Deployment configuration for Render
- **Static File Serving**: Efficient static asset delivery

### Error Handling
- **Centralized Error Middleware**: Consistent error responses
- **API Error Handling**: Specific error messages for different scenarios
- **Database Error Handling**: Graceful handling of connection issues
- **OpenAI Error Handling**: Specific messages for quota/API errors
- **User-Friendly Messages**: Clear error messages for users

### Logging & Monitoring
- **Request Logging**: Log all API requests with timing
- **Error Logging**: Comprehensive error logging
- **Performance Monitoring**: Track response times
- **Database Health Checks**: Monitor database connectivity

### Development Features
- **Hot Module Replacement**: Fast development with Vite
- **TypeScript Checking**: Type safety during development
- **Environment Management**: `.env` file support
- **Database Migrations**: Easy schema updates
- **Seed Scripts**: Populate database with test data

---

## Additional Features

### Homepage Features
- **Hero Section**: Dynamic content based on login status
  - Marketing content for non-logged-in users
  - Personalized greeting for logged-in users
- **Daily Verses**: Bhagavad Gita verses displayed daily
- **Problem & Solution Section**: Highlights mental health challenges
- **Services Overview**: Quick access to main services
- **Testimonials**: Always displays 3 approved testimonials
- **Video Background**: Engaging background video
- **Parallax Effects**: Smooth scrolling animations

### Navigation Features
- **Responsive Navbar**: Mobile-friendly navigation
- **Role-Based Menu**: Different menu items for different user roles
- **User Avatar**: Display user initials in navbar
- **Dropdown Menu**: User account menu with options
- **Mobile Menu**: Hamburger menu for mobile devices

### UI/UX Features
- **Accessibility**: ARIA labels and keyboard navigation
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Clear loading indicators
- **Error States**: User-friendly error messages
- **Empty States**: Helpful messages when no data
- **Toast Notifications**: Non-intrusive notifications
- **Dialog Modals**: Confirmation dialogs for important actions
- **Tooltips**: Helpful hints and explanations

### Cultural Sensitivity
- **Indian Context**: Designed for Indian users
- **Hindi Support**: Hindi language in AI responses
- **Cultural Integration**: Bhagavad Gita wisdom integration
- **Local Payment Methods**: Razorpay for Indian payments
- **Indian Helplines**: Crisis helplines specific to India

---

## Feature Summary by User Role

### Client Features
- Account registration and login
- Browse and book professionals
- AI chatbot access
- Wallet management and recharge
- Session booking and management
- Journaling and mood tracking
- Review professionals
- Submit feedback
- View profile and progress
- Access resources and recommendations

### Professional Features
- Professional profile creation
- Availability management
- Session management
- Earnings tracking
- Client communication
- Review display
- Professional dashboard
- Statistics and analytics

### Admin Features
- Admin login
- Feedback moderation
- User management (framework)
- Professional verification (framework)
- Platform analytics (framework)

### Public (Non-Logged-In) Features
- Browse homepage
- View services
- Browse professionals (limited)
- Public AI chat
- View testimonials
- Access resources
- Partner inquiry forms

---

## API Endpoints Summary

### Authentication
- `GET /api/auth/user` - Get current user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/apple` - Apple OAuth
- `GET /api/auth/apple/callback` - Apple OAuth callback
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get authenticated user

### Professionals
- `GET /api/professionals` - List all professionals
- `GET /api/professionals/:userId` - Get professional details
- `GET /api/professional/profile` - Get current professional profile
- `PATCH /api/professionals/availability` - Update availability

### Wallet
- `GET /api/wallet` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history
- `GET /api/stripe/config` - Get Stripe configuration
- `POST /api/wallet/checkout` - Create Stripe checkout
- `POST /api/wallet/recharge` - Recharge wallet
- `GET /api/razorpay/config` - Get Razorpay configuration
- `POST /api/wallet/razorpay-order` - Create Razorpay order
- `POST /api/wallet/razorpay-verify` - Verify Razorpay payment

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - Get user sessions
- `GET /api/sessions/upcoming` - Get upcoming sessions (professional)
- `PATCH /api/sessions/:id/status` - Update session status

### Earnings (Professional)
- `GET /api/earnings` - Get earnings history
- `GET /api/earnings/today` - Get today's earnings
- `GET /api/professional/stats` - Get professional statistics
- `GET /api/professional/sessions/today` - Get today's sessions
- `GET /api/professional/wallet` - Get professional wallet

### Journal
- `POST /api/journal` - Create journal entry
- `GET /api/journal` - Get journal entries

### Chat
- `POST /api/chat` - Send chat message
- `GET /api/chat/:conversationId` - Get conversation messages
- `POST /api/public-chat` - Public AI chat (no auth)

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/:professionalId` - Get professional reviews

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/testimonials` - Get approved testimonials
- `GET /api/admin/feedback` - Get all feedback (admin)
- `PATCH /api/admin/feedback/:id/status` - Update feedback status (admin)

### Partner
- `POST /api/partner-inquiry` - Submit partner inquiry

### Webhooks
- `POST /api/stripe/webhook` - Stripe webhook handler
- `POST /api/razorpay/webhook` - Razorpay webhook handler

---

## Conclusion

Serene Space is a comprehensive mental health platform with over 50 major features covering authentication, professional services, AI-powered counseling, payment processing, session management, journaling, reviews, admin tools, and more. The platform is designed to be culturally sensitive, accessible, and supportive of users' mental health journeys.

**Total Features Documented:** 50+ major features  
**API Endpoints:** 30+ RESTful endpoints  
**User Roles:** 3 (Client, Professional, Admin)  
**Payment Gateways:** 2 (Stripe, Razorpay)  
**AI Integration:** OpenAI GPT-4o  
**Database:** PostgreSQL with Drizzle ORM

---

**Document Generated:** 2024  
**Last Updated:** 2024  
**Version:** 1.0



