# Google OAuth Quick Setup Guide

## The Error You're Seeing

If you're getting a 404 or error when clicking the Google login button, it means Google OAuth is not configured yet.

## Quick Setup (5 minutes)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google Identity Services"
   - Click "Enable"
4. Go to "APIs & Services" → "Credentials"
5. Click "Create Credentials" → "OAuth client ID"
6. Configure OAuth consent screen (if prompted):
   - User Type: External
   - App name: Focus
   - Support email: your email
7. Create OAuth client:
   - Application type: **Web application**
   - Name: Focus Web Client
   - Authorized redirect URIs:
     ```
     http://localhost:5000/api/auth/google/callback
     ```
     (For production, also add: `https://yourdomain.com/api/auth/google/callback`)

### Step 2: Add to .env File

Add these lines to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
BASE_URL=http://localhost:5000
```

**Important**: 
- Replace `your_client_id_here` with the actual Client ID from Google Console
- Replace `your_client_secret_here` with the actual Client Secret
- Don't include quotes around the values

### Step 3: Restart Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test

1. Go to `http://localhost:5000/login`
2. Click the "Google" button
3. You should be redirected to Google's login page
4. After logging in, you'll be redirected back and logged in

## Troubleshooting

### Error: "Google OAuth not configured"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are in your `.env` file
- Make sure there are no extra spaces or quotes
- Restart the server after adding them

### Error: "redirect_uri_mismatch"
- Check that your redirect URI in Google Console matches exactly:
  - `http://localhost:5000/api/auth/google/callback`
- Make sure `BASE_URL` in `.env` is set to `http://localhost:5000`

### Error: "invalid_client"
- Verify your Client ID and Client Secret are correct
- Make sure you copied the entire Client ID (it ends with `.apps.googleusercontent.com`)

### Still Getting 404?
- Make sure the server is running
- Check the server console for error messages
- Verify the route exists: `GET /api/auth/google`

## Current Status

✅ **Google OAuth Route**: Implemented at `/api/auth/google`
✅ **Error Handling**: Added checks for missing configuration
✅ **User Feedback**: Shows error messages if not configured

## What Happens When You Click Google Button

1. Frontend redirects to `/api/auth/google`
2. Server checks if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
3. If not set → Redirects to login with error message
4. If set → Redirects to Google's OAuth page
5. User logs in with Google
6. Google redirects back to `/api/auth/google/callback`
7. Server creates/updates user in database
8. User is logged in and redirected to homepage

## Need Help?

If you're still having issues:
1. Check server console for error messages
2. Verify your `.env` file has the correct values
3. Make sure you restarted the server after adding credentials
4. Check that the redirect URI in Google Console matches exactly



