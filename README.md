# touchh.world

A lightweight, mobile-first web application that uses the device camera and finger pointing to understand spatial intent and surface contextual, artistic place annotations in the real world.

## Core Principles

- Mobile-first performance (60fps target)
- Silence by default (no UI clutter)
- Burst-based perception (event-driven inference only)
- Graceful uncertainty (labels as interpretations)
- Fail-soft design (mouse/touch fallback)

## Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

3. Fill in `.env.local` with your actual API keys (never commit this file)

4. Start development server:
```bash
npm run dev
```

### Environment Variables

Required environment variables (see `.env.example`):
- `GOOGLE_API_KEY` - Google API key (server-only)
- `GOOGLE_PROJECT_NUMBER` - Google project number
- `GOOGLE_PROJECT_RESOURCE` - Google project resource path

**Security**: Never commit `.env.local` or expose API keys. See [SECURITY.md](./SECURITY.md) for details.

## Tech Stack

- Next.js (App Router)
- TypeScript
- HTML Canvas (2D only)
- Tailwind CSS
- Node.js/Bun backend

## Security

See [SECURITY.md](./SECURITY.md) for security guidelines and API key management.

