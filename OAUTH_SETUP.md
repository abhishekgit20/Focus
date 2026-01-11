# OAuth Setup Guide - Google & Apple Login

This guide explains how to set up Google and Apple OAuth authentication for the Focus platform.

## ✅ Implementation Status

- ✅ **Google OAuth**: Fully implemented and ready to use
- ⚠️ **Apple OAuth**: Partially implemented (requires Apple Developer account setup)

## 🔧 Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API** (or **Google Identity Services**)
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure OAuth consent screen:
   - User Type: External (for public use)
   - App name: Focus
   - Support email: your email
   - Authorized domains: your domain (e.g., `yourdomain.com`)
6. Create OAuth client:
   - Application type: **Web application**
   - Name: Focus Web Client
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (for development)
     - `https://yourdomain.com/api/auth/google/callback` (for production)

### Step 2: Add Environment Variables

Add these to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
BASE_URL=http://localhost:5000  # or your production URL
```

### Step 3: Test Google Login

1. Start your server: `npm run dev`
2. Navigate to `/login`
3. Click the **Google** button
4. You'll be redirected to Google's login page
5. After authentication, you'll be redirected back and logged in

## 🍎 Apple OAuth Setup (Sign in with Apple)

### Prerequisites

- Apple Developer Account ($99/year)
- App ID configured in Apple Developer Portal
- Service ID for web authentication

### Step 1: Configure Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a **Service ID**:
   - Identifier: `com.yourcompany.focus.web`
   - Enable "Sign in with Apple"
   - Configure domains and redirect URLs:
     - Domains: `yourdomain.com`
     - Return URLs: `https://yourdomain.com/api/auth/apple/callback`

### Step 2: Create a Key

1. Go to **Keys** section
2. Create a new key:
   - Key Name: Focus Sign in with Apple
   - Enable "Sign in with Apple"
   - Download the key file (`.p8` file) - **Save this securely!**

### Step 3: Add Environment Variables

Add these to your `.env` file:

```env
# Apple OAuth
APPLE_CLIENT_ID=com.yourcompany.focus.web
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY_PATH=path/to/AuthKey_XXXXXXXXXX.p8
# OR use APPLE_PRIVATE_KEY with the key content directly
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Step 4: Add Apple Sign In Script to Frontend

Add this to your `index.html` or main HTML file:

```html
<script 
  type="text/javascript" 
  src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
></script>
```

### Step 5: Update Apple Button Handler

The Apple button in `Login.tsx` already has the handler, but you need to initialize Apple Sign In:

```javascript
// Add this to Login.tsx useEffect
useEffect(() => {
  if (typeof window !== 'undefined' && (window as any).AppleID) {
    (window as any).AppleID.auth.init({
      clientId: 'com.yourcompany.focus.web',
      scope: 'name email',
      redirectURI: `${window.location.origin}/api/auth/apple/callback`,
      usePopup: true,
    });
  }
}, []);
```

### Step 6: Implement JWT Verification (Backend)

The current implementation has a placeholder. You'll need to:

1. Install JWT verification library: `npm install jsonwebtoken jwks-rsa`
2. Verify the Apple JWT token using Apple's public keys
3. Extract user information from the token
4. Create or update user in database

**Note**: Full Apple OAuth implementation requires additional backend work to verify JWT tokens.

## 🔐 Security Notes

1. **Never commit** `.env` files or OAuth credentials to version control
2. Use different OAuth credentials for development and production
3. Keep your OAuth secrets secure and rotate them periodically
4. For production, always use HTTPS
5. Configure proper CORS settings

## 🧪 Testing

### Test Google OAuth:
```bash
# 1. Set environment variables
export GOOGLE_CLIENT_ID="your_client_id"
export GOOGLE_CLIENT_SECRET="your_client_secret"
export BASE_URL="http://localhost:5000"

# 2. Start server
npm run dev

# 3. Visit http://localhost:5000/login
# 4. Click "Google" button
```

### Test Apple OAuth:
```bash
# 1. Set environment variables (see above)
# 2. Ensure Apple Sign In script is loaded
# 3. Click "Apple" button
# 4. Complete Apple authentication flow
```

## 📝 Current Implementation Details

### Google OAuth Flow:
1. User clicks "Google" button → redirects to `/api/auth/google`
2. Google authentication page → user logs in
3. Google redirects to `/api/auth/google/callback` with code
4. Backend exchanges code for user info
5. User is created/updated in database
6. Session is established
7. User is redirected to homepage → auto-logged in

### Apple OAuth Flow (Partial):
1. User clicks "Apple" button → triggers Apple Sign In popup
2. User authenticates with Apple
3. Frontend receives `id_token`
4. Frontend redirects to `/api/auth/apple` with token
5. **TODO**: Backend verifies JWT token
6. **TODO**: Extract user info and create/update user
7. **TODO**: Establish session and redirect

## 🚀 Production Deployment

### For Railway/Render:

1. Add environment variables in your platform dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `BASE_URL` (your production URL)
   - `APPLE_CLIENT_ID` (if using Apple)
   - `APPLE_TEAM_ID` (if using Apple)
   - `APPLE_KEY_ID` (if using Apple)
   - `APPLE_PRIVATE_KEY` (if using Apple)

2. Update OAuth redirect URIs in Google/Apple consoles:
   - Google: `https://yourdomain.com/api/auth/google/callback`
   - Apple: `https://yourdomain.com/api/auth/apple/callback`

3. Ensure your domain is verified in both platforms

## 🐛 Troubleshooting

### Google OAuth Issues:

**Error: "redirect_uri_mismatch"**
- Check that your redirect URI in Google Console matches exactly: `http://localhost:5000/api/auth/google/callback`
- Ensure `BASE_URL` environment variable is set correctly

**Error: "invalid_client"**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that credentials are for the correct project

### Apple OAuth Issues:

**Error: "Apple Sign In not available"**
- Ensure Apple Sign In script is loaded in your HTML
- Check that `APPLE_CLIENT_ID` matches your Service ID
- Verify domain is registered in Apple Developer Portal

**Error: "JWT verification failed"**
- Ensure `APPLE_PRIVATE_KEY` is correctly formatted
- Check that key ID and team ID are correct
- Verify the key has "Sign in with Apple" enabled

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)

## ✅ Summary

- **Google OAuth**: ✅ Ready to use - just add credentials
- **Apple OAuth**: ⚠️ Requires Apple Developer setup and JWT verification implementation
- **Register Page**: ✅ Fully functional at `/register`

The Register page is already created and working. Google OAuth is fully implemented and ready once you add the credentials. Apple OAuth needs additional setup and JWT verification implementation.



