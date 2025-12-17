# Three-Tier Perception Architecture

## Overview

MediaPipe has been **completely removed** and replaced with a three-tier perception system optimized for mobile performance and reliability.

## Architecture

### Tier 1: Client-Side Intent Detection (NO ML)

**Purpose**: Detect "possible pointing intent" cheaply and reliably.

**Implementation**: `lib/intentDetector.ts`

**Signals**:
- **Touch drag** (primary for mobile): Detects finger drag gestures
  - Minimum 30px drag distance
  - 100ms-1000ms duration
  - Strength calculated from distance and duration
- **Screen-center ray** (fallback): Always available baseline signal
  - Low strength (0.3)
  - Straight forward direction
  - Center of screen position

**Rules**:
- NO machine learning
- NO MediaPipe
- NO WASM
- NO tfjs
- Deterministic and fast

**Output**: Intent signal with strength (0-1), direction vector, and fingertip position

### Tier 2: Server-Side Vision Confirmation

**Purpose**: Confirm pointing and compute direction + confidence via Nano Banana API.

**Implementation**: `components/GestureController.ts` → `/api/nano-banana-proxy`

**Rules**:
- Triggered ONLY from CANDIDATE state
- One downscaled frame per inference burst (640x480)
- Max 4 Hz (250ms minimum interval)
- Backend-only ML (Nano Banana API)
- Never interpret vision results directly on client

**Flow**:
1. Capture frame from video element
2. Downscale to 640x480
3. Convert to base64 JPEG
4. POST to `/api/nano-banana-proxy`
5. Receive: `{ fingertip, direction, confidence }`
6. Update state machine

### Tier 3: Human-in-the-Loop Confirmation

**Purpose**: Let UX resolve ambiguity instead of over-engineering ML.

**Implementation**: `components/OverlayRenderer.tsx`

**Rules**:
- UI response is soft and reversible
- Opacity tied to confidence
- Immediate fade-out on release
- Never "lock" user into wrong interpretation
- Adaptive, not authoritative

## State Machine Enforcement

The state machine enforces strict inference rules:

### IDLE
- Camera only
- Tier 1 signal detection
- NO inference
- If Tier 1 strength ≥ 0.4 → CANDIDATE

### CANDIDATE
- Tier 1 signals (continuous)
- Tier 2 API calls (max 4 Hz)
- Stability tracking
- If stable + confident → INTENT_LOCKED

### INTENT_LOCKED
- Tier 2 confirmation achieved
- Auto-transitions to DISPLAY
- Triggers geo-context lookup

### DISPLAY
- **NO inference** (0 Hz)
- UI only
- Tier 1 signal check to detect release
- If Tier 1 weak → RELEASE

### RELEASE
- Cleanup
- Fade out
- Return to IDLE

## Files Changed

### Removed
- `lib/handDetection.ts` (MediaPipe-based, deleted)
- MediaPipe dependencies from `package.json`

### Added
- `lib/intentDetector.ts` (Tier 1: NO ML intent detection)

### Modified
- `components/GestureController.ts` (Three-tier integration)
- `lib/frameUtils.ts` (Async frame downscaling)
- `app/page.tsx` (Debug overlay updates)

## Mobile Optimizations

1. **No WASM/WebGL**: Pure JavaScript touch detection
2. **No MediaPipe**: Removed unstable mobile dependencies
3. **Burst-based**: Inference only when needed (CANDIDATE state)
4. **Touch-first**: Primary interaction via touch drag
5. **Fail-soft**: Errors don't break UI

## Testing

### Tier 1 Testing
- Drag finger on screen → should enter CANDIDATE state
- Debug overlay shows state transitions
- Console logs show Tier 1 signal strength

### Tier 2 Testing
- In CANDIDATE state, check network tab
- Should see POST requests to `/api/nano-banana-proxy`
- Max 4 requests per second (250ms intervals)
- No requests in DISPLAY state

### State Machine Testing
- IDLE → CANDIDATE (on touch drag)
- CANDIDATE → INTENT_LOCKED → DISPLAY (on stable pointing)
- DISPLAY → RELEASE → IDLE (on release)

## Success Criteria

✅ State transitions occur reliably on mobile
✅ UI responds smoothly to pointing proxy
✅ No ML runs in browser
✅ Nano Banana called ONLY via backend
✅ App maintains 60fps camera feed
✅ No MediaPipe dependencies
✅ Touch drag detection works

## Next Steps

1. Integrate real Nano Banana API (currently mocked)
2. Fine-tune Tier 1 signal thresholds
3. Add device orientation support (optional)
4. Remove debug overlay before public demo

