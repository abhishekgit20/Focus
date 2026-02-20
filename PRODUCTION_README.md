# Focus App - Production Deployment Guide

This guide covers deploying the Focus mental health platform to production.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (Supabase, AWS RDS, or self-hosted)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in all required environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SESSION_SECRET`: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `NODE_ENV=production`
   - `BASE_URL`: Your production URL (e.g., `https://yourdomain.com`)
   - `FRONTEND_URL`: Same as BASE_URL for same-origin setup

3. Optional but recommended:
   - Payment providers (Stripe, Razorpay)
   - OAuth providers (Google)
   - AI services (OpenAI, Gemini)

## Security Checklist

- [ ] `SESSION_SECRET` is at least 32 characters and randomly generated
- [ ] `DATABASE_URL` uses SSL connection
- [ ] All API keys are stored securely (never commit to git)
- [ ] CORS is configured to only allow your frontend domain
- [ ] Rate limiting is enabled (already configured)
- [ ] Security headers are enabled (already configured)
- [ ] HTTPS is enabled (via reverse proxy or load balancer)

## Database Setup

1. Create PostgreSQL database
2. Run migrations:
   ```bash
   npm run db:push
   ```
3. Verify connection in health check: `GET /health`

## Build and Deploy

### Option 1: Docker (Recommended)

```bash
# Build Docker image
docker build -t focus-app .

# Run container
docker run -d \
  --name focus-app \
  -p 5000:5000 \
  --env-file .env \
  focus-app
```

### Option 2: Direct Node.js

```bash
# Install dependencies
npm ci

# Build application
npm run build

# Start production server
npm start
```

### Option 3: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.cjs --name focus-app

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring

### Health Checks

- `GET /health` - Basic health check (database connectivity)
- `GET /metrics` - Application metrics (requires authentication in production)

### Metrics Endpoint

The `/metrics` endpoint provides:
- Request count
- Error count
- Average response time
- P95/P99 response times
- Status code distribution
- Memory usage
- Uptime

### Logging

Application logs include:
- Request/response logging with sanitized data
- Error logging with request IDs
- WebSocket connection logging

## Payment Provider Setup

### Stripe

1. Create Stripe account
2. Get API keys from dashboard
3. Set webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Configure webhook events: `checkout.session.completed`, `payment_intent.succeeded`
5. Add webhook secret to `STRIPE_WEBHOOK_SECRET`

### Razorpay

1. Create Razorpay account
2. Get Key ID and Key Secret from dashboard
3. Add to environment variables

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
4. Add credentials to environment variables

## Performance Optimization

- Database connection pooling (configured: max 20, min 2)
- Response compression (enabled)
- Rate limiting (configured per endpoint type)
- Static file caching (via reverse proxy)

## Backup Strategy

1. **Database Backups**: Set up automated PostgreSQL backups
2. **Environment Variables**: Store securely (use secrets management)
3. **Session Storage**: Uses PostgreSQL (persistent across restarts)

## Scaling Considerations

- **Horizontal Scaling**: Use load balancer with sticky sessions
- **Database**: Consider read replicas for read-heavy workloads
- **Caching**: Add Redis for session storage at scale
- **CDN**: Use CDN for static assets

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database is accessible from server
- Verify SSL settings for remote databases

### Session Issues

- Ensure `SESSION_SECRET` is set and consistent across instances
- Check database session table exists
- Verify cookie settings match your domain

### Rate Limiting

- Check rate limit headers in responses
- Adjust limits in `server/rateLimiter.ts` if needed

## Support

For issues and questions:
- Check application logs
- Review health check endpoint
- Check metrics endpoint for performance issues

