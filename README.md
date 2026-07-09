# NEW-APP
# ─── Backend Setup ─────────────────────────────────────────────
cd backend
npm install
npm run dev

# ─── Mobile Setup ──────────────────────────────────────────────
cd mobile
npm install
npx expo start

# ─── For Android ───────────────────────────────────────────────
npx expo start --android

# ─── For iOS ───────────────────────────────────────────────────
npx expo start --ios
✅ Passwords NEVER stored — only RSA encrypted before sending
✅ Sessions stored server-side (in-memory with timeout)
✅ SecureStore used for session tokens on device
✅ Rate limiting on login endpoint (10 req / 15 min)
✅ Helmet.js for HTTP security headers
✅ Payments ONLY via official WebView redirect
✅ Session auto-expires after 30 minutes of inactivity
✅ CORS restricted to known origins
✅ No captcha bypass — user always inputs manually
✅ Auto-cleanup of expired sessions every 5 minutes
