# Mobile Setup Guide

This guide explains how to run touchh.world on mobile devices.

## Requirements

### HTTPS Requirement
Mobile browsers require **HTTPS** (or localhost) for camera access. You cannot access the app via HTTP on mobile devices.

## Quick Start Options

### Option 1: Localhost Testing (Desktop Only)
For quick testing on your development machine:
```bash
npm run dev
```
Then open `http://localhost:3000` in your browser.

### Option 2: Network Access with HTTPS Tunnel (Mobile Testing)

#### Using ngrok (Recommended)
1. Install ngrok if you haven't already:
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com/
   ```

2. Start your Next.js server on network interface:
   ```bash
   npm run dev:network
   ```

3. In another terminal, create HTTPS tunnel:
   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)

5. Open that URL on your mobile device's browser

#### Using Cloudflare Tunnel
1. Install cloudflared:
   ```bash
   brew install cloudflared  # macOS
   ```

2. Start your Next.js server:
   ```bash
   npm run dev:network
   ```

3. Create tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. Use the provided HTTPS URL on your mobile device

## Mobile Optimizations

The app has been optimized for mobile with:

1. **Camera Constraints**: Adaptive resolution (max 1080p) and 30fps cap for better performance
2. **MediaPipe Optimization**: Uses Lite model (complexity 0) on mobile devices for faster processing
3. **Touch Handling**: Prevents zoom, scroll, and unwanted interactions
4. **PWA Support**: Can be installed as a standalone app
5. **Viewport Settings**: Optimized for mobile screens with no scaling

## Troubleshooting

### Camera Not Working
- Ensure you're using HTTPS (not HTTP)
- Check that you've granted camera permissions in your browser
- Try refreshing the page
- On iOS Safari, ensure you're not in private browsing mode (camera access is restricted)

### Performance Issues
- The app automatically uses a lighter MediaPipe model on mobile
- Camera resolution is capped at 1080p for better performance
- Frame rate is limited to 30fps to save battery

### Installation as PWA
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" option
3. The app will work as a standalone app without browser UI

## Testing Checklist

- [ ] Camera access works on mobile
- [ ] Hand detection is responsive
- [ ] Gesture recognition works smoothly
- [ ] No unwanted zoom/scroll behavior
- [ ] App can be installed as PWA
- [ ] Performance is acceptable (30fps)

## Notes

- The app uses the back camera by default on mobile devices
- Portrait orientation is recommended
- Requires a device with camera and modern browser support


