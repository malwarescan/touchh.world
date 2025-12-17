import { NextRequest, NextResponse } from 'next/server'
import { serverConfig } from '@/lib/env'
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit'

/**
 * Geo Context API
 * 
 * Looks up nearby places/POIs based on:
 * - Device location (GPS)
 * - Camera direction vector
 * - Camera FOV
 * 
 * Returns ranked list of likely places user is pointing at
 * 
 * SECURITY: All API keys are server-only, never exposed to client
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
    const { 
      latitude, 
      longitude, 
      direction, // { x, y, z } normalized vector
      fov = 60, // Field of view in degrees
      bearing, // Optional: compass bearing
      queryHint, // Optional: text hint for search
    } = body

    // Validate request
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !direction
    ) {
      return NextResponse.json(
        { error: 'Location and direction required' },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Integrate with Google Places API
    try {
      // Check if API key is available
      let apiKey: string
      try {
        apiKey = serverConfig.google.apiKey
      } catch (envError) {
        // Environment variable not set - return empty results gracefully
        console.error('Google API key not configured:', envError instanceof Error ? envError.message : 'Unknown error')
        return NextResponse.json(
          { places: [] },
          {
            status: 200,
            headers: {
              'X-RateLimit-Limit': '60',
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
            },
          }
        )
      }
      
      // Calculate search radius (roughly 500m)
      const radius = 500
      
      // Use Google Places Nearby Search API
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&key=${apiKey}`
      
      const placesResponse = await fetch(placesUrl)
      
      if (!placesResponse.ok) {
        throw new Error(`Places API error: ${placesResponse.status}`)
      }
      
      const placesData = await placesResponse.json()
      
      if (placesData.status !== 'OK' || !placesData.results || placesData.results.length === 0) {
        // No places found, return empty
        return NextResponse.json(
          { places: [] },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              'X-RateLimit-Limit': '60',
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
            },
          }
        )
      }

      // Process and rank places
      const places = placesData.results
        .slice(0, 10) // Get more results to filter by direction
        .map((place: any) => {
          // Calculate distance in meters
          const placeLat = place.geometry?.location?.lat
          const placeLng = place.geometry?.location?.lng
          
          if (!placeLat || !placeLng) {
            return null
          }
          
          // Calculate distance using Haversine formula (more accurate)
          const R = 6371000 // Earth radius in meters
          const dLat = (placeLat - latitude) * Math.PI / 180
          const dLng = (placeLng - longitude) * Math.PI / 180
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(latitude * Math.PI / 180) * Math.cos(placeLat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          const distance = R * c
          
          // Calculate bearing (direction from user to place)
          const y = Math.sin(dLng) * Math.cos(placeLat * Math.PI / 180)
          const x = Math.cos(latitude * Math.PI / 180) * Math.sin(placeLat * Math.PI / 180) -
                    Math.sin(latitude * Math.PI / 180) * Math.cos(placeLat * Math.PI / 180) * Math.cos(dLng)
          const bearing = Math.atan2(y, x) * 180 / Math.PI
          
          // Convert direction vector to bearing (simplified)
          // Direction z is forward, x is right, y is up
          const directionBearing = Math.atan2(direction.x, direction.z) * 180 / Math.PI
          
          // Calculate how well the place matches the tap direction
          const bearingDiff = Math.abs(bearing - directionBearing)
          const directionMatch = 1 - Math.min(bearingDiff / 90, 1) // 0-1, 1 = perfect match
          
          // Confidence based on distance, rating, and direction match
          const distanceScore = Math.max(0.3, 1 - distance / 1000) // Closer = better
          const ratingScore = place.rating ? place.rating / 5 : 0.7
          const confidence = (distanceScore * 0.4 + ratingScore * 0.3 + directionMatch * 0.3)
          
          return {
            name: place.name,
            latitude: placeLat,
            longitude: placeLng,
            confidence,
            type: place.types?.[0] || 'establishment',
            url: place.url,
            website: place.website,
            placeId: place.place_id,
            distance,
            bearing,
          }
        })
        .filter((p: any) => p !== null) // Remove null entries
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .slice(0, 5) // Return top 5

      // Return sanitized response (never include API keys or raw upstream data)
      return NextResponse.json(
        { places },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      )
    } catch (apiError) {
      // If Google Places API fails, fall back to empty results
      console.error('Google Places API error:', apiError instanceof Error ? apiError.message : 'Unknown error')
      return NextResponse.json(
        { places: [] },
        {
          status: 200,
          headers: {
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      )
    }
  } catch (error) {
    // Generic error message - never expose internal details or API keys
    // Log server-side only (not sent to client)
    if (error instanceof Error) {
      // Only log error type, not full details that might contain secrets
      console.error('Geo context error:', error.message)
    } else {
      console.error('Geo context error: Unknown error')
    }
    
    return NextResponse.json(
      { error: 'Geo lookup failed' },
      { status: 500 }
    )
  }
}

