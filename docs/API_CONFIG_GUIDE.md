# API Configuration Guide - ALGORA

## Overview
Complete guide to configure all external APIs for ALGORA application.

## Required APIs

### 1. Supabase (Database + Auth)
### 2. OpenAI (Question Generation)

---

## Part 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended)
4. Click "New Project"

### Step 2: Configure Project

**Organization Settings:**
- Name: `ALGORA`
- Database Password: (generate strong password, save it!)
- Region: Choose nearest to your users (EU Central for Turkey)

**Project Settings:**
- Name: `algora-production`
- Database Password: `your-generated-password`

### Step 3: Get Credentials

1. Go to Project Settings → API
2. Copy these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Run Database Schema

1. Go to SQL Editor in Supabase dashboard
2. Copy the contents of `database/schema.sql`
3. Paste and click "Run"

**Verify:**
- Tables created: `user_profiles`, `questions`, `answers`, `study_sessions`
- Views created: `user_stats`, `subject_breakdown`
- RLS enabled on all tables

### Step 5: Configure Authentication

**Email Provider (Already enabled):**
1. Go to Authentication → Providers
2. Ensure "Email" provider is enabled

**Google OAuth (Optional):**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

7. In Supabase, go to Authentication → Providers → Google
8. Enable Google provider
9. Add your credentials:
   - Client ID
   - Client Secret

### Step 6: Test Database Connection

```typescript
// In your browser console, test:
const { createClient } = await import('@supabase/supabase-js');

const supabase = createClient(
  'https://xxxxx.supabase.co',
  'your-anon-key'
);

// Test connection
const { data, error } = await supabase
  .from('questions')
  .select('count');

console.log('Database connected:', !error);
```

---

## Part 2: OpenAI Setup

### Step 1: Create OpenAI Account

See `docs/OPENAI_SETUP.md` for detailed instructions.

### Step 2: Get API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key

```env
OPENAI_API_KEY=sk-...
```

### Step 3: Test API

See `docs/OPENAI_SETUP.md` for testing instructions.

---

## Part 3: Environment Configuration

### Development (.env.local)

Create `.env.local` in project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# OpenAI
OPENAI_API_KEY=sk-...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...client-id...
GOOGLE_CLIENT_SECRET=...client-secret...
```

### Production (Vercel)

1. Go to your Vercel project
2. Navigate to Settings → Environment Variables
3. Add all variables from `.env.local`

**Critical:** Never commit `.env.local` to Git!

---

## Part 4: Verification Checklist

### Supabase Verification

- [ ] Project created successfully
- [ ] Database schema applied
- [ ] All tables created (4 tables)
- [ ] All views created (2 views)
- [ ] RLS enabled on all tables
- [ ] API credentials copied
- [ ] Authentication enabled (Email)
- [ ] Google OAuth configured (optional)
- [ ] Test connection successful

### OpenAI Verification

- [ ] Account created
- [ ] API key generated
- [ ] API key added to `.env.local`
- [ ] Test curl request successful
- [ ] Question generation tested
- [ ] Usage monitoring set up
- [ ] Billing configured

### Integration Verification

- [ ] `.env.local` file created
- [ ] All required variables present
- [ ] No syntax errors in `.env.local`
- [ ] Dev server runs without errors
- [ ] API calls work in browser
- [ ] No console errors
- [ ] Database operations work

---

## Part 5: Troubleshooting

### Supabase Issues

**"Connection refused"**
- Check Supabase URL format
- Verify project is active
- Check network connectivity

**"Row level security policy violation"**
- Ensure RLS policies are created
- Check user is authenticated
- Verify policy conditions

**"Authentication failed"**
- Verify email provider enabled
- Check email configuration
- Test with real email address

### OpenAI Issues

**"Invalid API key"**
- Verify API key format
- Check for extra spaces
- Regenerate key if needed

**"Rate limit exceeded"**
- Implement rate limiting
- Add caching layer
- Use queue system

**"Insufficient quota"**
- Check OpenAI dashboard
- Add payment method
- Monitor usage

---

## Part 6: Security Best Practices

### Environment Variables

✅ **DO:**
- Use `.env.local.example` as template
- Add `.env.local` to `.gitignore`
- Use different keys for dev/prod
- Rotate keys periodically

❌ **DON'T:**
- Commit actual `.env.local` to Git
- Share API keys in public repos
- Use production keys in development
- Log sensitive data

### API Keys

✅ **DO:**
- Store in environment variables
- Use Supabase secrets for production
- Implement key rotation
- Monitor usage regularly

❌ **DON'T:**
- Hardcode keys in source
- Commit keys to version control
- Share keys in chat/email
- Use same key across projects

---

## Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.local.example .env.local

# 3. Edit .env.local with your credentials
# (Use your preferred text editor)

# 4. Run database schema (in Supabase dashboard)
# Copy contents from database/schema.sql

# 5. Start development server
npm run dev

# 6. Open browser
# Navigate to http://localhost:3000
```

---

## Support Resources

- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **OpenAI Docs:** [https://platform.openai.com/docs](https://platform.openai.com/docs)
- **Next.js Docs:** [https://nextjs.org/docs](https://nextjs.org/docs)
- **ALGORA Repo:** Check project README.md

---

**Last Updated:** July 14, 2026
**Status:** Active Development
**Next Step:** Complete setup and begin testing
