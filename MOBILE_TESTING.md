# Mobile Testing Guide

## The Problem

Mobile browsers require **HTTPS** (or localhost) for camera access via `getUserMedia`. Accessing via IP address over HTTP (like `http://192.168.1.168:3000`) will not work.

## Solutions

### Option 1: Use a Tunneling Service (Easiest)

Use a service like **ngrok** or **Cloudflare Tunnel** to create an HTTPS tunnel:

#### Using ngrok:
```bash
# Install ngrok (if not installed)
# brew install ngrok

# Start your Next.js server
npm run dev:network

# In another terminal, create HTTPS tunnel
ngrok http 3000
```

Then use the HTTPS URL provided by ngrok on your phone.

#### Using Cloudflare Tunnel:
```bash
# Install cloudflared
# brew install cloudflared

# Create tunnel
cloudflared tunnel --url http://localhost:3000
```

### Option 2: Test on Desktop Localhost

For quick testing, use `http://localhost:3000` on your desktop browser. This works because localhost is considered a secure context.

### Option 3: Set Up Local HTTPS (Advanced)

You can configure Next.js to serve over HTTPS with a self-signed certificate, but this requires additional setup and you'll need to accept the certificate warning on your phone.

## Current Error

If you see: `Cannot read properties of undefined (reading 'getUserMedia')`

This means:
- You're accessing via HTTP (not HTTPS)
- Mobile browsers block camera access on insecure contexts
- Solution: Use one of the options above

## Quick Test

The easiest way to test right now:
1. Use `http://localhost:3000` on your **desktop** browser
2. Or set up ngrok for mobile testing with HTTPS

