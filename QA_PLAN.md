
# touchh.world — QA PLAN (AUTHORITATIVE)

## 0. Definition of “Works Correctly”

The app is considered working correctly if and only if:
1.  A tap produces exactly one inference
2.  The inference is grounded (vision + geo + bearing)
3.  The UI shows one stable context card
4.  The card dismisses cleanly
5.  No loops, no repeats, no background inference
6.  Mobile performance remains smooth

Everything else is secondary.

---

## 1. Core Interaction QA (Must Pass 100%)

### Test 1.1 — Single Tap = Single Result

**Steps**
1.  Open app
2.  Allow camera + location
3.  Tap once on screen

**Expected**
-   Exactly ONE backend request to /api/tap-context
-   Exactly ONE context card appears
-   No additional requests until next tap

**Fail Conditions**
-   Multiple requests
-   Card flickers or re-renders
-   Card changes without a new tap

### Test 1.2 — Tap Elsewhere Replaces Context

**Steps**
1.  Tap on building A
2.  Card appears
3.  Tap on building B

**Expected**
-   Card A disappears immediately
-   Card B appears
-   No overlap
-   No lingering UI

**Fail Conditions**
-   Two cards visible
-   Old card persists
-   Multiple inference calls per tap

### Test 1.3 — Dismiss Behavior

**Steps**
1.  Tap → card appears
2.  Tap empty sky or UI dismiss area

**Expected**
-   Card disappears immediately
-   No backend call on dismiss
-   System returns to idle

---

## 2. Inference Discipline QA (Critical)

### Test 2.1 — No Background Inference

**Steps**
1.  Open app
2.  Do NOT tap
3.  Observe network panel for 30 seconds

**Expected**
-   ZERO calls to Gemini
-   ZERO calls to Places
-   ZERO calls to /api/tap-context

**Fail Conditions**
-   Any inference without a tap

### Test 2.2 — One Tap, One Gemini Call

**Steps**
1.  Open network inspector
2.  Tap once

**Expected**
-   1 Gemini Vision call
-   1 Places call (or batched equivalent)
-   No retries unless explicit error

### Test 2.3 — Error Handling

**Steps**
1.  Disable location
2.  Tap on screen

**Expected**
-   Graceful fallback
-   Either:
    -   “Location unavailable” message
    -   Or generic visual-only result
-   No crashes
-   No infinite retries

---

## 3. Vision Accuracy QA (Reality-Based)

### Test 3.1 — Obvious Landmark

**Steps**
1.  Point camera at a well-known building
2.  Tap directly on visible signage

**Expected**
-   Correct name OR correct business type
-   Nearby Places result matches visually tapped direction

**Fail Conditions**
-   Identifies something behind the user
-   Picks a random nearby business

### Test 3.2 — Ambiguous Scene

**Steps**
1.  Tap on a non-descript facade
2.  No readable signs

**Expected**
-   Generic identification
-   Area name
-   Street name
-   “Commercial building” etc.
-   Lower confidence phrasing

**Fail Conditions**
-   Hallucinated business names
-   Overconfident assertions

---

## 4. Bearing / Direction QA (Important)

### Test 4.1 — Directional Filtering

**Steps**
1.  Stand near multiple businesses
2.  Tap left vs right side of screen

**Expected**
-   Returned place shifts accordingly
-   No backward-facing results

**Fail Conditions**
-   Same place returned regardless of tap direction

---

## 5. Performance QA (Mobile-First)

### Test 5.1 — Frame Stability

**Steps**
1.  Open app
2.  Move camera continuously
3.  Tap several times

**Expected**
-   Camera feed stays smooth
-   No stutter when card appears
-   UI animation < 200ms

### Test 5.2 — Thermal / Battery

**Steps**
1.  Use app for 2–3 minutes
2.  Observe device temperature

**Expected**
-   No noticeable heating
-   No Safari throttling

**Fail Conditions**
-   Device warms quickly
-   Camera frame rate drops over time

---

## 6. Network Failure QA

### Test 6.1 — Offline / Slow Network

**Steps**
1.  Throttle network to “Slow 3G”
2.  Tap on screen

**Expected**
-   Loading indicator OR graceful delay
-   No UI freeze
-   No duplicate requests

### Test 6.2 — API Failure

**Steps**
1.  Temporarily force backend to return 500
2.  Tap on screen

**Expected**
-   Friendly failure message
-   No retries loop
-   App remains usable

---

## 7. Privacy + Consent QA (Non-Negotiable)

### Test 7.1 — Permissions

**Steps**
1.  Load app fresh
2.  Decline camera or location

**Expected**
-   Clear messaging
-   No background capture
-   App does not break

### Test 7.2 — Data Minimization

**Verify**
-   Only ONE frame per tap sent
-   No continuous streaming
-   No background logging of video

This is both ethical and defensive.

---

## 8. Regression QA (Prevent Future Breakage)

Every time you change code, re-run:
-   Test 1.1
-   Test 2.1
-   Test 5.1

If any of those fail, do not ship.

---

## Final QA Verdict Criteria

You can say “touchh.world works” when:
-   The app is boringly predictable
-   Nothing happens until the user taps
-   Every tap produces one calm, grounded response
-   The system never feels like it’s “watching”
-   Performance never degrades

That is success for this product.
