# OpenAI API Setup Guide - ALGORA

## Overview
ALGORA uses OpenAI's GPT-4o-mini model for generating exam questions. This guide walks you through setting up OpenAI API access.

## Prerequisites
- OpenAI account (free tier available)
- Credit card (for paid usage)
- API access approval

## Step 1: Create OpenAI Account

1. Go to [https://platform.openai.com/](https://platform.openai.com/)
2. Click "Sign Up"
3. Verify your email address
4. Add a payment method (required for API access)

## Step 2: Generate API Key

1. Navigate to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Give your key a descriptive name (e.g., "ALGORA Production")
4. Copy the key immediately (you won't see it again!)

**Important:** Keep your API key secure. Never commit it to version control.

## Step 3: Understand Pricing

### GPT-4o-mini Pricing (as of July 2026)

| Usage | Cost |
|-------|------|
| Input | $0.15 per 1M tokens |
| Output | $0.60 per 1M tokens |

### Cost Examples for ALGORA

**Per Question Generation:**
- Average question: ~500 tokens input, ~300 tokens output
- Cost per question: ~$0.00025 (₺0.0085)

**Monthly Estimates:**
- 100 users × 20 questions/day = 2,000 questions/day
- Monthly: 60,000 questions
- Estimated cost: ~$15 (₺500) per month

**Free Tier:**
- OpenAI occasionally offers free credits for new accounts
- Check your dashboard for available credits

## Step 4: Configure ALGORA

### Option 1: Environment Variables (Recommended)

1. Copy `.env.local.example` to `.env.local`
2. Add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Option 2: Supabase Secrets (Production)

1. Go to your Supabase project
2. Navigate to Settings → Edge Functions
3. Add secret: `OPENAI_API_KEY`

## Step 5: Test Integration

### Test API Key Validity

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

Expected response: List of available models

### Test Question Generation

```bash
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "Sen Türkçe sınav soruları üreten bir AI öğretmensin."
      },
      {
        "role": "user",
        "content": "Matematik - Türev konusu için kolay bir TYT sorusu üret."
      }
    ],
    "temperature": 0.7,
    "response_format": { "type": "json_object" }
  }'
```

## Step 6: Monitor Usage

### Check Your Usage

1. Go to [https://platform.openai.com/usage](https://platform.openai.com/usage)
2. Monitor:
   - Daily token usage
   - Cost per day
   - Model usage breakdown

### Set Up Alerts (Optional)

1. Navigate to Settings → Billing
2. Set usage alerts at preferred thresholds
3. Add payment method for automatic recharging

## Best Practices

### 1. Rate Limiting
ALGORA implements rate limiting (10 requests/minute per user) to prevent abuse.

### 2. Caching
Consider caching generated questions to reduce API calls.

### 3. Error Handling
```typescript
// In lib/openai.ts
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}
```

### 4. Prompt Engineering
Optimize prompts to reduce token usage:
- Be specific and concise
- Use Turkish language for Turkish content
- Request JSON format for structured output

## Troubleshooting

### Common Issues

**1. "Invalid API Key"**
- Verify your API key is correct
- Check for extra spaces or characters
- Ensure `.env.local` is in the project root

**2. "Rate Limit Exceeded"**
- Implement exponential backoff
- Add caching layer
- Use queue system for bulk generation

**3. "Insufficient Quota"**
- Check your OpenAI dashboard
- Add payment method
- Apply for API access increase

### Test Checklist

- [ ] API key works in curl test
- [ ] Question generation returns valid JSON
- [ ] Rate limiting prevents abuse
- [ ] Error handling works correctly
- [ ] Turkish language support verified
- [ ] Cost estimates are accurate

## Security Considerations

### Never expose API keys:

✅ **DO:**
- Use environment variables
- Add `.env.local` to `.gitignore`
- Rotate keys periodically
- Use separate keys for dev/prod

❌ **DON'T:**
- Commit API keys to Git
- Share keys in public repos
- Log API keys in error messages
- Use production keys in development

## Next Steps

1. **Database Setup:** Follow database schema guide
2. **Environment Config:** Complete `.env.local` setup
3. **Testing:** Run integration tests
4. **Deployment:** Configure Vercel environment variables

## Support

- OpenAI Documentation: [https://platform.openai.com/docs](https://platform.openai.com/docs)
- OpenAI Status: [https://status.openai.com](https://status.openai.com)
- OpenAI Community: [https://community.openai.com](https://community.openai.com)

---

**Last Updated:** July 14, 2026
**Required for:** ALGORA MVP Development
