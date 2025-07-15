# Deployment Guide for Sheets

## Prerequisites

1. **OpenRouter API Key**
   - Sign up at https://openrouter.ai
   - Create an API key
   - Make sure you have credits/subscription for moonshotai/kimi-k2

2. **Cloudflare Account**
   - Already configured ✓
   - KV namespace created: `sheets-context-kv` (ID: 6981fea7f7334ae2a6016efe3d06265a)

## Quick Deploy

### 1. Update Configuration

Edit `wrangler.toml` and replace the OpenRouter API key:
```toml
[vars]
OPENROUTER_API_KEY = "your-actual-api-key-here"
```

### 2. Install Dependencies

```bash
cd ~/Developer/apps/sheets-cf
npm install
```

### 3. Deploy Worker

```bash
npm run deploy-worker
```

This will deploy the backend API to Cloudflare Workers.

### 4. Deploy Frontend

```bash
npm run deploy-pages
```

This will deploy the static frontend to Cloudflare Pages.

### 5. Configure Custom Domain (Optional)

1. Go to Cloudflare dashboard > Pages
2. Select your sheets-cf project
3. Go to Custom domains
4. Add your domain (e.g., sheets.yourdomain.com)

### 6. Test Your Deployment

1. Visit your Pages URL or custom domain
2. Go to `/rules` and upload a test file
3. Return to home and test a prompt like:
   ```
   Analyze https://github.com/cloudflare/workers-sdk and suggest improvements
   ```

## Local Development

To run locally:

```bash
npm run dev
```

Visit http://localhost:8787

## Troubleshooting

### Worker Not Responding
- Check worker logs in Cloudflare dashboard
- Verify OpenRouter API key is correct
- Ensure KV namespace binding matches

### Files Not Uploading
- Check KV namespace permissions
- Verify CORS headers in worker
- Check browser console for errors

### AI Not Responding
- Verify OpenRouter API key has credits
- Check OpenRouter dashboard for rate limits
- Ensure moonshotai/kimi-k2 model is available

## Environment Variables

For production deployment, consider using:
```bash
wrangler secret put OPENROUTER_API_KEY
```

This keeps your API key secure and out of the codebase.
