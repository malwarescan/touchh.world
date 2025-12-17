/**
 * Simple In-Memory Rate Limiter (MVP)
 * 
 * Prevents API abuse with basic rate limiting.
 * For production, consider using Redis or a dedicated service.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

/**
 * Check if a request should be rate limited
 * Returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now >= entry.resetAt) {
    // Create new entry or reset expired entry
    const resetAt = now + RATE_LIMIT_WINDOW_MS
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    })

    // Cleanup old entries periodically
    if (rateLimitStore.size > 1000) {
      cleanupExpiredEntries(now)
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
    }
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Use IP address or a combination of headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  return ip
}

