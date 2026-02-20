# How to Check if Your App is Production Ready

This guide shows you **3 ways** to verify your Focus app is production ready.

## Method 1: Automated Checker (Recommended) ⚡

Run the automated production readiness checker:

```bash
npm run check:production
```

Or directly:
```bash
npx tsx scripts/check-production-ready.ts
```

**What it checks:**
- ✅ Environment variables (required and optional)
- ✅ Security configuration files
- ✅ Error handling setup
- ✅ Monitoring setup
- ✅ Database configuration
- ✅ Documentation files
- ✅ Build configuration
- ✅ Server middleware integration

**Output:**
- ✅ Green checkmarks for passed checks
- ❌ Red X for failed checks
- ⚠️ Yellow warnings for optional items

## Method 2: Manual Checklist 📋

Review the detailed checklist:

```bash
# Open the checklist
cat PRODUCTION_CHECKLIST.md
```

Or view it in your editor. The checklist includes:
- Environment configuration
- Security settings
- Database setup
- Error handling
- Monitoring
- Performance
- Build & deployment
- Documentation

## Method 3: Endpoint Testing 🧪

Test production endpoints to verify they're working:

### On Linux/Mac:
```bash
./scripts/test-production-endpoints.sh
```

### On Windows (Git Bash):
```bash
bash scripts/test-production-endpoints.sh
```

### Or test manually:

#### 1. Health Check
```bash
curl http://localhost:5000/health
```
**Expected:** `{"status":"healthy","database":"connected"}`

#### 2. Metrics Endpoint
```bash
curl http://localhost:5000/metrics
```
**Expected:** JSON with metrics data

#### 3. Security Headers
```bash
curl -I http://localhost:5000
```
**Check for:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `X-Request-ID: <uuid>`

#### 4. Error Handling
```bash
curl http://localhost:5000/api/nonexistent
```
**Expected:** Error response with `requestId` field

## Quick Verification Steps

### Step 1: Run Automated Check
```bash
npm run check:production
```

### Step 2: Verify Environment
```bash
# Check if .env exists
ls -la .env

# Verify critical variables (don't show values)
grep -E "^(DATABASE_URL|SESSION_SECRET|NODE_ENV)" .env
```

### Step 3: Test Health Endpoint
```bash
# Start server first
npm run dev

# In another terminal
curl http://localhost:5000/health
```

### Step 4: Check Security Headers
```bash
curl -I http://localhost:5000 | grep -i "x-"
```

## What to Look For

### ✅ Production Ready Signs:
- All automated checks pass
- Health endpoint returns `healthy`
- Security headers are present
- Error responses include `requestId`
- No critical errors in logs

### ❌ Not Production Ready Signs:
- Missing environment variables
- Health check fails
- Security headers missing
- Errors expose stack traces
- Database connection fails

## Common Issues & Fixes

### Issue: "Environment file not found"
**Fix:** Copy `.env.example` to `.env` and fill in values

### Issue: "SESSION_SECRET too short"
**Fix:** Generate a new secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: "Health check fails"
**Fix:** 
1. Check `DATABASE_URL` is correct
2. Verify database is running
3. Test connection manually

### Issue: "Security headers missing"
**Fix:** Ensure `server/index.ts` includes:
```typescript
import { securityHeaders } from "./middleware/security";
app.use(securityHeaders);
```

## Production Readiness Score

After running checks, calculate your score:

- **Critical items** (must pass): 20 points each
- **Recommended items**: 5 points each  
- **Optional items**: 1 point each

**Minimum for production:** 80% of critical items must pass

## Next Steps

1. ✅ Run `npm run check:production`
2. ✅ Review any failed checks
3. ✅ Fix critical issues
4. ✅ Run endpoint tests
5. ✅ Review `PRODUCTION_CHECKLIST.md`
6. ✅ Deploy to staging first
7. ✅ Test in staging
8. ✅ Deploy to production

## Files Reference

- **Automated Checker**: `scripts/check-production-ready.ts`
- **Checklist**: `PRODUCTION_CHECKLIST.md`
- **Endpoint Tester**: `scripts/test-production-endpoints.sh`
- **Deployment Guide**: `PRODUCTION_README.md`
- **Features List**: `PRODUCTION_FEATURES.md`

## Need Help?

1. Check application logs
2. Review health check endpoint
3. Check metrics endpoint
4. Verify environment variables
5. Review error responses (check request IDs)

---

**Quick Command Reference:**
```bash
# Automated check
npm run check:production

# Health check
curl http://localhost:5000/health

# Metrics
curl http://localhost:5000/metrics

# Security headers
curl -I http://localhost:5000
```

