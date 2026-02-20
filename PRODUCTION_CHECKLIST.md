# Production Readiness Checklist

Use this checklist to verify your Focus app is ready for production deployment.

## Quick Check

Run the automated checker:
```bash
npx tsx scripts/check-production-ready.ts
```

## Manual Checklist

### ✅ Environment Configuration

- [ ] `.env` file exists (copy from `.env.example`)
- [ ] `NODE_ENV=production` is set
- [ ] `DATABASE_URL` is configured with valid PostgreSQL connection string
- [ ] `SESSION_SECRET` is set and at least 32 characters long
- [ ] `BASE_URL` is set to your production domain (e.g., `https://yourdomain.com`)
- [ ] `FRONTEND_URL` matches `BASE_URL` (for same-origin setup)
- [ ] `PORT` is set (default: 5000)

### ✅ Security

- [ ] Security headers middleware is integrated (`server/middleware/security.ts`)
- [ ] Rate limiting is configured (`server/rateLimiter.ts`)
- [ ] Input sanitization is enabled
- [ ] Request ID tracking is enabled
- [ ] CORS is configured to only allow your frontend domain
- [ ] Session cookies are secure (`httpOnly`, `secure`, `sameSite`)
- [ ] `SESSION_SECRET` is randomly generated (not default value)
- [ ] All API keys are stored in environment variables (not in code)

### ✅ Database

- [ ] Database connection string is valid
- [ ] Database is accessible from your server
- [ ] Connection pooling is configured (max: 20, min: 2)
- [ ] SSL is enabled for remote databases (Supabase, AWS RDS)
- [ ] Database migrations have been run (`npm run db:push`)
- [ ] Database backups are configured

### ✅ Error Handling

- [ ] Enhanced error handler is integrated (`server/middleware/errorHandler.ts`)
- [ ] Error responses don't expose stack traces in production
- [ ] Request IDs are included in error responses
- [ ] Custom error classes are used appropriately

### ✅ Monitoring & Observability

- [ ] Health check endpoint works (`GET /health`)
- [ ] Metrics endpoint is accessible (`GET /metrics`)
- [ ] Request/response logging is enabled
- [ ] Error logging includes request IDs
- [ ] Logs are sanitized (no passwords, tokens, secrets)

### ✅ Performance

- [ ] Response compression is enabled
- [ ] Database connection pooling is configured
- [ ] Request size limits are set (10MB)
- [ ] Static files are served efficiently

### ✅ Build & Deployment

- [ ] Application builds successfully (`npm run build`)
- [ ] Production start script works (`npm start`)
- [ ] Dockerfile exists (if using Docker)
- [ ] Docker image builds successfully (if using Docker)
- [ ] Graceful shutdown is configured

### ✅ Documentation

- [ ] `PRODUCTION_README.md` is reviewed
- [ ] `.env.example` is up to date
- [ ] Deployment instructions are documented
- [ ] Environment variables are documented

### ✅ Optional but Recommended

- [ ] Stripe is configured (for payments)
  - [ ] `STRIPE_SECRET_KEY` is set
  - [ ] `STRIPE_PUBLISHABLE_KEY` is set
  - [ ] `STRIPE_WEBHOOK_SECRET` is set
  - [ ] Webhook endpoint is configured in Stripe dashboard

- [ ] Razorpay is configured (for UPI payments)
  - [ ] `RAZORPAY_KEY_ID` is set
  - [ ] `RAZORPAY_KEY_SECRET` is set

- [ ] Google OAuth is configured (for social login)
  - [ ] `GOOGLE_CLIENT_ID` is set
  - [ ] `GOOGLE_CLIENT_SECRET` is set
  - [ ] OAuth redirect URI is configured in Google Console

- [ ] AI services are configured
  - [ ] `OPENAI_API_KEY` is set (for AI chat)
  - [ ] `GEMINI_API_KEY` is set (alternative AI service)

### ✅ Infrastructure

- [ ] HTTPS is enabled (SSL certificate configured)
- [ ] Reverse proxy is configured (Nginx, Caddy, etc.)
- [ ] Domain name is configured
- [ ] DNS records are set up correctly
- [ ] Firewall rules are configured
- [ ] Process manager is set up (PM2, systemd, etc.)

### ✅ Testing

- [ ] Health check endpoint responds correctly
- [ ] Database connection works
- [ ] Authentication flow works
- [ ] API endpoints respond correctly
- [ ] Error handling works as expected
- [ ] Rate limiting works as expected

## Pre-Deployment Tests

Run these tests before deploying:

### 1. Health Check Test
```bash
curl https://yourdomain.com/health
```
Expected: `{"status":"healthy","database":"connected"}`

### 2. Metrics Test
```bash
curl https://yourdomain.com/metrics
```
Expected: JSON with metrics data (may require auth in production)

### 3. Security Headers Test
```bash
curl -I https://yourdomain.com
```
Check for:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### 4. Rate Limiting Test
```bash
# Try multiple requests quickly
for i in {1..10}; do curl https://yourdomain.com/api/auth/login; done
```
Expected: Rate limit error after threshold

### 5. Error Handling Test
```bash
curl https://yourdomain.com/api/nonexistent
```
Expected: Structured error response with request ID

## Common Issues

### Issue: Health check fails
**Solution**: Check `DATABASE_URL` and ensure database is accessible

### Issue: Metrics endpoint returns 401
**Solution**: Add authentication header or disable auth check in production

### Issue: Security headers missing
**Solution**: Ensure `securityHeaders` middleware is added before routes

### Issue: Rate limiting too strict
**Solution**: Adjust limits in `server/rateLimiter.ts`

### Issue: Environment variables not loading
**Solution**: Ensure `.env` file exists and `dotenv/config` is imported

## Production Readiness Score

Calculate your score:
- **Critical items** (must pass): 20 points each
- **Recommended items**: 5 points each
- **Optional items**: 1 point each

**Minimum for production**: 80% of critical items must pass

## Next Steps After Checklist

1. ✅ All critical items checked
2. ✅ Run automated checker: `npx tsx scripts/check-production-ready.ts`
3. ✅ Run pre-deployment tests
4. ✅ Review `PRODUCTION_README.md` for deployment steps
5. ✅ Deploy to staging environment first
6. ✅ Test in staging environment
7. ✅ Deploy to production
8. ✅ Monitor health check and metrics after deployment

## Support

If you encounter issues:
1. Check application logs
2. Review health check endpoint
3. Check metrics endpoint
4. Review error responses (check request IDs)
5. Verify environment variables

