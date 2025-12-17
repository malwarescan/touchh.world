import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit'

/**
 * Nano Banana Proxy API
 * 
 * Proxies gesture detection requests to Nano Banana API
 * All Nano Banana calls MUST go through this backend endpoint
 * 
 * SECURITY: All API keys are server-only, never exposed to client
 * 
 * TODO: Implement actual Nano Banana API integration
 */

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = checkRateLimit(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      )
    }

    const body = await request.json()
    const { frame, roi } = body

    // Validate request
    if (!frame) {
      return NextResponse.json(
        { error: 'Frame data required' },
        { status: 400 }
      )
    }

    // Validate frame size (prevent abuse)
    if (typeof frame === 'string') {
      // Base64 encoded frame
      const sizeInBytes = (frame.length * 3) / 4
      const maxSizeBytes = 5 * 1024 * 1024 // 5MB max
      if (sizeInBytes > maxSizeBytes) {
        return NextResponse.json(
          { error: 'Frame too large' },
          { status: 400 }
        )
      }
    }

    // TODO: Integrate with Nano Banana API
    // When implementing, use environment variables for API keys
    // For now, return mock response with anchor tag data
    
    // Mock detection - always return a detection for testing
    // In production, this will call the real Nano Banana API
    // For now, simulate a pointing gesture in the center of the frame
    const mockResponse = {
      fingertip: {
        x: 0.5, // Center of screen
        y: 0.4, // Slightly above center (typical pointing position)
      },
      direction: {
        x: 0, // Straight forward
        y: 0,
        z: 1, // Forward direction
      },
      confidence: 0.85, // High confidence for testing
    }

    return NextResponse.json(
      mockResponse,
      {
        headers: {
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
        },
      }
    )
  } catch (error) {
    // Generic error message - never expose internal details or API keys
    if (error instanceof Error) {
      console.error('Nano Banana proxy error:', error.message)
    } else {
      console.error('Nano Banana proxy error: Unknown error')
    }
    
    return NextResponse.json(
      { error: 'Inference failed' },
      { status: 500 }
    )
  }
}

