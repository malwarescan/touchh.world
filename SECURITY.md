# Security Guidelines

## API Key Management

### Critical Rules

1. **Never commit secrets to the repository**
   - No API keys in source files, README, examples, tests, or logs
   - No `NEXT_PUBLIC_*` environment variables for secrets
   - All secrets must be in `.env.local` (local) or Railway environment variables (production)

2. **Server-only key usage**
   - API keys may only be used in:
     - Next.js Route Handlers under `app/api/*`
     - Server-only modules (never imported by client components)
   - The `lib/env.ts` module validates and provides server-only access

3. **Key rotation**
   - If a key is exposed, rotate it immediately in the provider console
   - Update the rotated key in Railway environment variables
   - Never reuse exposed keys

4. **Key restrictions**
   - Restrict API keys in provider console:
     - Application restriction: server-side only or domain/IP restrictions
     - API restriction: allow only the exact APIs needed
   - Use least privilege principle

## Environment Variables

### Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in actual values (never commit `.env.local`)
3. `.env.local` is already in `.gitignore`

### Production (Railway)

1. Add environment variables in Railway dashboard
2. Use the same variable names as in `.env.example`
3. Never expose keys in Railway logs or build output

## Current Environment Variables

- `GOOGLE_API_KEY` - Google API key (server-only)
- `GOOGLE_PROJECT_NUMBER` - Google project number
- `GOOGLE_PROJECT_RESOURCE` - Google project resource path

## Security Checklist

Before committing code:

- [ ] `grep -R "AIza" .` returns nothing
- [ ] No secrets in repository history
- [ ] No secrets in README or documentation
- [ ] `.env.example` contains no real values
- [ ] All secrets only in `.env.local` (local) or Railway (prod)
- [ ] API proxy routes work with env vars set
- [ ] Client never receives secrets
- [ ] Error messages are generic (no internal details)

## Rate Limiting

All API routes implement in-memory rate limiting:
- 60 requests per minute per IP address
- Rate limit headers included in responses
- For production, consider Redis-based rate limiting

## Error Handling

- Never log full error objects that might contain secrets
- Return generic error messages to clients
- Log detailed errors server-side only (not sent to client)

