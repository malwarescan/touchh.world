# Frontend Integration - Nano Banana Proxy

## Implementation Summary

### ✅ Completed Features

1. **Frame Downscaling**
   - Created `lib/frameUtils.ts` with `downscaleFrame()` function
   - Frames are downscaled to 320x240 for mobile performance
   - JPEG compression at 85% quality for optimal balance

2. **API Integration in CANDIDATE State**
   - `GestureController` now calls `/api/nano-banana-proxy` in CANDIDATE state only
   - Strict 4 Hz throttling (250ms minimum interval between requests)
   - Uses downscaled frames from video element

3. **Zero Inference in DISPLAY State**
   - API calls are **only** made in CANDIDATE state
   - DISPLAY state has 0 Hz inference (no API calls)
   - State machine enforces this behavior

4. **Anchor Tag Label Rendering**
   - `OverlayRenderer` renders a single clickable anchor tag
   - Canvas rendering for visual label with underline
   - HTML anchor tag overlay for clickability
   - Opacity-based confidence visualization
   - Smooth fade transitions

### Architecture

```
CANDIDATE State (4 Hz max)
  ↓
  Frame downscaling (320x240)
  ↓
  POST /api/nano-banana-proxy
  ↓
  Update state machine with result
  ↓
  INTENT_LOCKED → DISPLAY (0 Hz)
  ↓
  Render anchor tag label
```

### Key Implementation Details

#### GestureController (`components/GestureController.ts`)

- **Throttling**: 250ms minimum interval (4 Hz max)
- **State Check**: Only runs inference in `CANDIDATE` state
- **Frame Processing**: Downscales to 320x240 before sending
- **Error Handling**: Fail-soft (no UI disruption on errors)
- **Overlap Prevention**: `isInferenceInProgressRef` prevents concurrent requests

```typescript
// Strict 4 Hz throttling
const INFERENCE_INTERVAL_MS = 250

// Only in CANDIDATE state
if (state === 'CANDIDATE' && now - lastInferenceTimeRef.current >= INFERENCE_INTERVAL_MS) {
  const downscaledFrame = downscaleFrame(video, 320, 240)
  // Call API...
}
```

#### OverlayRenderer (`components/OverlayRenderer.tsx`)

- **Single Label**: Renders only the first label (as specified)
- **Dual Rendering**: 
  - Canvas for visual text with underline
  - HTML anchor tag for clickability
- **Opacity**: Confidence-based opacity with smooth transitions
- **State-Based**: Only visible in DISPLAY state

#### Frame Utils (`lib/frameUtils.ts`)

- **Downscaling**: Reduces frame size for mobile performance
- **Format**: Converts to base64 JPEG
- **Quality**: 85% compression for balance between size and quality

### API Response Format

The `/api/nano-banana-proxy` endpoint returns:

```typescript
{
  fingertip: { x: number, y: number } | null,
  direction: { x: number, y: number, z: number } | null,
  confidence: number
}
```

### Label Format

Labels are rendered with:

```typescript
interface Label {
  text: string
  href?: string  // URL for anchor tag
  x: number      // Normalized 0-1
  y: number      // Normalized 0-1
  confidence: number  // 0-1
}
```

### Performance Characteristics

- **CANDIDATE State**: Max 4 Hz inference (250ms intervals)
- **DISPLAY State**: 0 Hz inference (no API calls)
- **Frame Size**: 320x240 (downscaled from camera resolution)
- **Frame Format**: Base64 JPEG (~50-100KB per frame)
- **Network**: Only active during CANDIDATE state

### Testing Checklist

- [ ] Verify API calls only occur in CANDIDATE state
- [ ] Verify no API calls in DISPLAY state
- [ ] Verify 4 Hz throttling (check network tab)
- [ ] Verify frame downscaling (check request payload size)
- [ ] Verify anchor tag is clickable
- [ ] Verify label fades in/out smoothly
- [ ] Verify confidence affects opacity

### Next Steps

1. Integrate actual Nano Banana API (replace mock in `/api/nano-banana-proxy`)
2. Connect geo-context API to get real place data for anchor tags
3. Add ROI (Region of Interest) extraction if needed
4. Optimize frame compression further if needed

