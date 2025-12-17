# Testing Guide for touchh.world

This document outlines how to verify that touchh.world works correctly across different scenarios and devices.

## Testing Strategy

### 1. Automated Tests

Run automated tests to verify core functionality:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

#### What Gets Tested Automatically

- **Utility Functions**: Vector math, confidence smoothing
- **State Machine**: Gesture state transitions and logic
- **API Routes**: Backend endpoints return expected responses
- **Component Logic**: React component behavior (where testable without camera)

### 2. Manual Testing Checklist

#### Desktop Browser Testing (Localhost)

**Prerequisites:**
- Start dev server: `npm run dev`
- Open `http://localhost:3000` in Chrome/Firefox/Safari
- Grant camera permissions when prompted

**Camera & Video Feed**
- [ ] Camera permission prompt appears
- [ ] Video feed displays correctly
- [ ] Video fills screen (no black bars)
- [ ] Video is smooth (check FPS in browser dev tools)
- [ ] Video resolution is appropriate (not too high/low)

**Gesture Detection**
- [ ] Point finger at camera - hand is detected
- [ ] Console shows "Hand detected" logs
- [ ] Gesture state transitions visible in console:
  - `IDLE` → `CANDIDATE` → `INTENT_LOCKED` → `DISPLAY`
- [ ] State machine respects stability threshold (300ms)
- [ ] No excessive API calls (max 4 Hz in CANDIDATE state)

**Label Display**
- [ ] Labels appear when gesture is locked
- [ ] Labels fade in smoothly
- [ ] Labels positioned correctly (center of screen)
- [ ] Labels fade out when gesture ends
- [ ] Labels are clickable (if href provided)

**Error Handling**
- [ ] Camera permission denied - app doesn't crash
- [ ] Camera unavailable - graceful error message
- [ ] Network errors - no UI disruption
- [ ] Location denied - app still works (fail-soft)

**Performance**
- [ ] No console errors or warnings
- [ ] Memory usage stable (check Chrome DevTools)
- [ ] CPU usage reasonable (not maxing out)
- [ ] Smooth 60fps camera feed (or at least 30fps)

#### Mobile Device Testing

**Prerequisites:**
- Use HTTPS tunnel (ngrok or Cloudflare Tunnel)
- Or test on localhost if device is on same network
- See [MOBILE_TESTING.md](./MOBILE_TESTING.md) for setup

**Mobile-Specific Checks**
- [ ] Camera works on mobile browser (iOS Safari, Chrome Android)
- [ ] Touch fallback works (if gesture detection fails)
- [ ] App is responsive (no horizontal scrolling)
- [ ] Labels are readable on small screens
- [ ] Performance is acceptable on mid-range device
- [ ] Battery usage is reasonable
- [ ] App works in portrait and landscape

**Gesture Detection on Mobile**
- [ ] Hand detection works with mobile camera
- [ ] Finger pointing is accurate
- [ ] State transitions work correctly
- [ ] Labels appear at correct positions
- [ ] Gesture detection doesn't drain battery excessively

#### API Testing

**Test Backend Routes:**

```bash
# Test geo-context API
curl -X POST http://localhost:3000/api/geo-context \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "direction": {"x": 0, "y": 0, "z": 1},
    "fov": 60
  }'

# Test nano-banana-proxy API
curl -X POST http://localhost:3000/api/nano-banana-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image_data"
  }'
```

**API Checks:**
- [ ] Routes return 200 status codes
- [ ] Responses have correct JSON structure
- [ ] Error handling works (400, 500 responses)
- [ ] API keys are not exposed in responses
- [ ] Rate limiting works (if implemented)

### 3. State Machine Testing

**Manual State Transition Verification:**

1. **IDLE → CANDIDATE**
   - Point finger at camera
   - Should see state change to `CANDIDATE` within 250ms
   - Console log: "State machine state changed to: CANDIDATE"

2. **CANDIDATE → INTENT_LOCKED**
   - Keep finger pointing steadily for 300ms
   - Confidence must be > 0.5
   - Should transition to `INTENT_LOCKED`
   - Console log: "Triggering inference request..."

3. **INTENT_LOCKED → DISPLAY**
   - Should immediately transition to `DISPLAY`
   - Label should appear on screen

4. **DISPLAY → RELEASE**
   - Remove finger or lower confidence
   - After 2 seconds of no detection, should transition to `RELEASE`
   - Label should start fading out

5. **RELEASE → IDLE**
   - After 200ms fade period, should return to `IDLE`
   - Labels should be cleared

**Edge Cases:**
- [ ] Rapid finger movements don't cause state jitter
- [ ] Brief detection loss doesn't reset state immediately
- [ ] Direction changes reset stability timer correctly
- [ ] State machine resets properly on errors

### 4. Performance Testing

**Target Metrics:**
- Camera feed: 30-60 FPS
- Gesture detection: Max 4 Hz (250ms intervals)
- Memory: Stable (no leaks)
- CPU: < 50% on mid-range device

**How to Measure:**

1. **FPS Check:**
   - Open Chrome DevTools → Performance tab
   - Record while using app
   - Check frame rate in timeline

2. **Memory Check:**
   - Chrome DevTools → Memory tab
   - Take heap snapshot before/after use
   - Verify no memory leaks

3. **Network Check:**
   - Chrome DevTools → Network tab
   - Verify API calls are throttled (max 4 per second)
   - Check request sizes are reasonable

### 5. Browser Compatibility

Test on:
- [ ] Chrome (desktop & mobile)
- [ ] Safari (desktop & iOS)
- [ ] Firefox (desktop)
- [ ] Edge (desktop)

**Check:**
- Camera access works
- MediaPipe hands detection works
- Canvas rendering works
- Geolocation API works
- No console errors

### 6. Security Testing

- [ ] API keys are not exposed in client code
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in console logs
- [ ] HTTPS required for production
- [ ] CORS headers are correct (if needed)

### 7. Accessibility Testing

- [ ] App works without camera (fail-soft)
- [ ] Touch/mouse fallback works
- [ ] Labels are readable
- [ ] No keyboard traps
- [ ] Screen reader compatible (if applicable)

## Quick Smoke Test

For a quick verification that everything works:

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Grant camera permission
4. Point finger at camera
5. Hold steady for 1 second
6. Verify label appears
7. Remove finger
8. Verify label fades out

If all steps pass, core functionality is working.

## Continuous Testing

### Pre-Commit Checks

Before committing code:
- [ ] Run `npm test` (all tests pass)
- [ ] Run `npm run lint` (no linting errors)
- [ ] Manual smoke test (quick verification)

### Pre-Deployment Checks

Before deploying to production:
- [ ] All automated tests pass
- [ ] Manual testing on desktop browser
- [ ] Manual testing on mobile device (via HTTPS)
- [ ] Performance metrics within targets
- [ ] Security audit (no exposed keys)
- [ ] Build succeeds: `npm run build`

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Verify HTTPS (required on mobile)
- Check browser console for errors
- Try different browser

### Gesture Detection Not Working
- Check console for "Hand detected" logs
- Verify MediaPipe is loading correctly
- Check camera feed is active
- Ensure good lighting

### Labels Not Appearing
- Check console for API errors
- Verify geo-context API is working
- Check gesture state transitions
- Verify location permissions granted

### Performance Issues
- Check FPS in browser dev tools
- Verify inference throttling (4 Hz max)
- Check for memory leaks
- Profile with Chrome DevTools

## Test Data

For testing without real camera:

- Use mock data in development
- API routes return mock responses
- State machine can be tested with simulated inputs

See test files in `/__tests__` directory for examples.

