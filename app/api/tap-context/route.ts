import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit'

/**
 * Tap Context API
 * 
 * Receives a tap location and camera frame, returns contextual information
 * about what the user tapped on.
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
      image, // Base64 encoded frame
      tapX, // Normalized 0-1
      tapY, // Normalized 0-1
      latitude,
      longitude,
    } = body

    // Validate request
    if (!image || typeof tapX !== 'number' || typeof tapY !== 'number') {
      return NextResponse.json(
        { error: 'Image and tap coordinates required' },
        { status: 400 }
      )
    }

    // Validate frame size (prevent abuse)
    if (typeof image === 'string') {
      const sizeInBytes = (image.length * 3) / 4
      const maxSizeBytes = 5 * 1024 * 1024 // 5MB max
      if (sizeInBytes > maxSizeBytes) {
        return NextResponse.json(
          { error: 'Frame too large' },
          { status: 400 }
        )
      }
    }

    // Step 1: Use Gemini Vision API to analyze the ROI image and identify the specific building
    let visionResult: { 
      name?: string | null; 
      description?: string; 
      type?: string;
      details?: string;
      year?: string | null;
      architecturalStyle?: string | null;
      significance?: string | null;
    } | null = null
    
    try {
      const { serverConfig } = await import('@/lib/env')
      const geminiApiKey = serverConfig.gemini.apiKey
      
      console.log('Tap-context: Calling Gemini Vision API...')
      
      // Convert base64 image to format Gemini expects
      // Remove data URL prefix if present
      const base64Image = image.includes(',') ? image.split(',')[1] : image
      
      if (!base64Image || base64Image.length < 100) {
        console.error('Tap-context: Invalid image data')
      } else {
        console.log('Tap-context: Image data length:', base64Image.length)
      }
      
      // Call Gemini Vision API using Google AI Studio format
      // Use gemini-2.0-flash which supports vision and is available
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`
      
      console.log('Tap-context: Calling Gemini endpoint:', endpoint.split('?')[0])
      
      const geminiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
                {
                  text: `You are analyzing a cropped region from a mobile camera where the user tapped on a specific building. Your job is to identify THIS EXACT building.

CRITICAL INSTRUCTIONS:
1. Look for ANY text, signs, numbers, or names on the building - street numbers, building names, business signs, ANYTHING
2. Look for distinctive architectural features, colors, materials, or design elements
3. If you see ANY identifying information (even partial), extract it
4. DO NOT just say "apartment building" or "residential building" - try to identify the SPECIFIC building

EXAMPLES:
- If you see "123 Main St" or any address numbers → use that
- If you see a business sign → use that business name
- If you see distinctive architecture → describe it specifically
- If you see a building name or complex name → use that

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "name": "SPECIFIC building name, address number, business name, or distinctive identifier. Examples: 'Empire State Building', '123 Main Street', 'The Plaza Hotel', 'Blue Glass Office Tower'. If you see ANY identifying text/numbers, use them. NEVER just 'apartment building' or 'residential building' - be specific!",
  "type": "specific type: temple/church/mosque/restaurant/hotel/office_building/residential_building/monument/landmark/etc",
  "description": "2-3 sentence description focusing on identifying features you can see: colors, materials, distinctive design, visible text/signs, architectural style",
  "details": "Detailed information: specific architectural features visible, materials used, design elements, any visible text or signs, estimated age/era, notable characteristics (4-5 sentences)",
  "year": "construction year or era if deducible from architecture, or null",
  "architecturalStyle": "specific architectural style if identifiable (Gothic, Modern, Art Deco, Brutalist, etc), or null",
  "significance": "why this building might be notable (historical, cultural, architectural), or null"
}

REMEMBER: Extract ANY identifying information you see. Even "Red brick building with '123' on door" is better than "apartment building".`
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }]
        }),
      })
      
      console.log('Tap-context: Gemini response status:', geminiResponse.status)
      
      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json()
        console.log('Tap-context: Gemini raw response:', JSON.stringify(geminiData).substring(0, 500))
        
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        
        if (text) {
          console.log('Tap-context: Gemini text response:', text.substring(0, 300))
          
          // Try to parse JSON from response
          try {
            // Remove markdown code blocks if present
            let jsonText = text.trim()
            if (jsonText.startsWith('```')) {
              jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            }
            
            // Extract JSON object
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              visionResult = JSON.parse(jsonMatch[0])
              console.log('Tap-context: Parsed Gemini result:', visionResult)
            } else {
              console.log('Tap-context: No JSON found in response')
            }
          } catch (parseError) {
            console.error('Tap-context: Could not parse Gemini response as JSON:', parseError)
            console.log('Tap-context: Full response text:', text)
            
            // Fallback: extract name and type from text
            const nameMatch = text.match(/name["\s:]+"([^"]+)"/i) || text.match(/name["\s:]+([^\n,}]+)/i)
            const typeMatch = text.match(/type["\s:]+"([^"]+)"/i) || text.match(/type["\s:]+([^\n,}]+)/i)
            const descMatch = text.match(/description["\s:]+"([^"]+)"/i) || text.match(/description["\s:]+([^\n,}]+)/i)
            
            visionResult = {
              name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : null,
              type: typeMatch ? typeMatch[1].trim().replace(/^["']|["']$/g, '') : null,
              description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : undefined,
            }
            console.log('Tap-context: Extracted fallback result:', visionResult)
          }
        } else {
          console.error('Tap-context: No text in Gemini response')
        }
      } else {
        const errorText = await geminiResponse.text()
        console.error('Tap-context: Gemini API error:', geminiResponse.status, errorText.substring(0, 500))
      }
    } catch (visionError) {
      console.error('Tap-context: Gemini Vision API failed:', visionError)
      if (visionError instanceof Error) {
        console.error('Tap-context: Error details:', visionError.message, visionError.stack)
      }
      // Continue without vision result
    }
    
    console.log('Tap-context: Final vision result:', visionResult)
    
    // Step 2: Calculate direction vector from tap coordinates
    // Convert tap position (0-1) to direction vector pointing from camera
    // Assuming camera FOV of 60 degrees
    const fov = 60
    const fovRad = (fov * Math.PI) / 180
    
    // Convert normalized tap coordinates to angles
    // Center of screen (0.5, 0.5) = straight ahead
    const offsetX = (tapX - 0.5) * 2 // -1 to 1
    const offsetY = (tapY - 0.5) * 2 // -1 to 1
    
    // Calculate direction vector (simplified - assumes flat projection)
    const direction = {
      x: Math.sin(offsetX * fovRad / 2) * 0.1, // Small horizontal component
      y: -Math.sin(offsetY * fovRad / 2) * 0.1, // Small vertical component (negative because screen Y is inverted)
      z: 0.95, // Mostly forward
    }
    
    // Step 3: Use vision result + location to find the specific building and get detailed info
    // This is the KEY integration: combine what Gemini sees with Google Places location data
    if (latitude && longitude) {
      try {
        const { serverConfig } = await import('@/lib/env')
        const placesApiKey = serverConfig.google.apiKey
        
        let placeDetails: any = null
        let placeId: string | null = null
        
        // Strategy 1: If Gemini identified a building name, search for it specifically by name + location
        if (visionResult?.name) {
          console.log('Tap-context: [VISION+LOCATION] Searching for specific building:', visionResult.name, 'at', latitude, longitude)
          
          // Try multiple search strategies
          const searchQueries = [
            `${visionResult.name}`, // Just the name
            `${visionResult.name} near ${latitude},${longitude}`, // Name + location
            `${visionResult.name} ${visionResult.type || ''}`, // Name + type
          ]
          
          for (const searchQuery of searchQueries) {
            const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${latitude},${longitude}&radius=2000&key=${placesApiKey}`
            
            console.log('Tap-context: [VISION+LOCATION] Trying search:', searchQuery)
            
            const textSearchResponse = await fetch(textSearchUrl)
            if (textSearchResponse.ok) {
              const textSearchData = await textSearchResponse.json()
              console.log('Tap-context: [VISION+LOCATION] Search response:', {
                status: textSearchData.status,
                resultsCount: textSearchData.results?.length || 0,
                query: searchQuery
              })
              
              // If Text Search is denied, skip to next strategy
              if (textSearchData.status === 'REQUEST_DENIED' || textSearchData.status === 'ZERO_RESULTS') {
                console.log('Tap-context: [VISION+LOCATION] Text Search not available or no results, trying nearby search')
                break // Skip to nearby search strategy
              }
              
              if (textSearchData.results && textSearchData.results.length > 0) {
                // Find the best match (closest to user location AND name similarity)
                const userLat = latitude
                const userLng = longitude
                
                const matches = textSearchData.results
                  .map((place: any) => {
                    const placeLat = place.geometry?.location?.lat
                    const placeLng = place.geometry?.location?.lng
                    if (!placeLat || !placeLng) return null
                    
                    // Calculate distance
                    const R = 6371000 // Earth radius in meters
                    const dLat = (placeLat - userLat) * Math.PI / 180
                    const dLng = (placeLng - userLng) * Math.PI / 180
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                              Math.cos(userLat * Math.PI / 180) * Math.cos(placeLat * Math.PI / 180) *
                              Math.sin(dLng/2) * Math.sin(dLng/2)
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                    const distance = R * c
                    
                    // Calculate name similarity
                    const nameLower = place.name.toLowerCase()
                    const visionNameLower = visionResult.name?.toLowerCase() || ''
                    let nameScore = 0
                    if (visionNameLower && nameLower === visionNameLower) nameScore = 1.0
                    else if (visionNameLower && (nameLower.includes(visionNameLower) || visionNameLower.includes(nameLower))) nameScore = 0.7
                    else if (visionNameLower) {
                      // Simple word overlap
                      const visionWords = visionNameLower.split(/\s+/)
                      const placeWords = nameLower.split(/\s+/)
                      const overlap = visionWords.filter(w => placeWords.includes(w)).length
                      nameScore = overlap / Math.max(visionWords.length, placeWords.length)
                    }
                    
                    // Combined score (prioritize name match, then distance)
                    const score = nameScore * 0.7 + (1 - Math.min(distance / 2000, 1)) * 0.3
                    
                    return { place, distance, nameScore, score }
                  })
                  .filter((item: any) => item !== null)
                  .sort((a: any, b: any) => b.score - a.score)
                
                if (matches.length > 0 && matches[0].distance < 2000) { // Within 2km
                  placeDetails = matches[0].place
                  placeId = matches[0].place.place_id
                  console.log('Tap-context: [VISION+LOCATION] Found building match:', {
                    name: placeDetails.name,
                    distance: matches[0].distance.toFixed(0) + 'm',
                    nameScore: matches[0].nameScore.toFixed(2),
                    score: matches[0].score.toFixed(2)
                  })
                  break // Found a good match, stop searching
                }
              }
            }
          }
        }
        
        // Strategy 2: Always try nearby places search - this works even if Text Search is denied
        if (!placeId && latitude && longitude) {
          console.log('Tap-context: [VISION+LOCATION] Searching nearby places (all types)')
          
          // Use nearby search - this API is more commonly enabled
          // Optimize: Use single search with broader radius (150m) and let our scoring algorithms
          // filter for the best match. This reduces latency (1 call vs up to 3) and API costs.
          // Test 2.2: "One Tap, One Gemini Call, 1 Places Call"
          
          const searchRadius = 150
          const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${searchRadius}&key=${placesApiKey}`
          
          console.log('Tap-context: [VISION+LOCATION] Trying nearby search with radius:', searchRadius)
          
          const nearbyResponse = await fetch(nearbyUrl)
          if (nearbyResponse.ok) {
            const nearbyData = await nearbyResponse.json()
            console.log('Tap-context: [VISION+LOCATION] Nearby search response:', {
              status: nearbyData.status,
              resultsCount: nearbyData.results?.length || 0,
              radius: searchRadius
            })
            
            if (nearbyData.status === 'REQUEST_DENIED') {
              console.error('Tap-context: [VISION+LOCATION] Nearby Search API denied - check API key permissions')
            } else if (nearbyData.results && nearbyData.results.length > 0) {
              // Calculate which place is most likely in the tap direction
              const userLat = latitude
              const userLng = longitude
              
              // Calculate bearing to each place and compare with tap direction
              const placesWithScores = nearbyData.results
              .map((place: any) => {
                const placeLat = place.geometry?.location?.lat
                const placeLng = place.geometry?.location?.lng
                if (!placeLat || !placeLng) return null
                
                // Calculate bearing from user to place
                const dLng = (placeLng - userLng) * Math.PI / 180
                const y = Math.sin(dLng) * Math.cos(placeLat * Math.PI / 180)
                const x = Math.cos(userLat * Math.PI / 180) * Math.sin(placeLat * Math.PI / 180) -
                         Math.sin(userLat * Math.PI / 180) * Math.cos(placeLat * Math.PI / 180) * Math.cos(dLng)
                const bearing = Math.atan2(y, x) * 180 / Math.PI
                
                // Calculate distance
                const R = 6371000
                const dLat = (placeLat - userLat) * Math.PI / 180
                const dLng2 = (placeLng - userLng) * Math.PI / 180
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(userLat * Math.PI / 180) * Math.cos(placeLat * Math.PI / 180) *
                         Math.sin(dLng2/2) * Math.sin(dLng2/2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                const distance = R * c
                
                // Calculate tap direction bearing (simplified - assumes camera pointing north)
                const tapBearing = Math.atan2(direction.x, direction.z) * 180 / Math.PI
                
                // Score: closer distance + better direction match + type match if available
                let score = 1 / (1 + distance / 50) // Distance score
                
                // Direction match (within 45 degrees)
                const bearingDiff = Math.abs(bearing - tapBearing)
                const directionScore = bearingDiff < 45 ? 1 - (bearingDiff / 45) : 0
                score += directionScore * 0.5
                
                // Type match bonus
                if (visionResult?.type && place.types) {
                  const typeMatch = place.types.some((t: string) => 
                    t.toLowerCase().includes(visionResult!.type!.toLowerCase()) ||
                    visionResult!.type!.toLowerCase().includes(t.toLowerCase())
                  )
                  if (typeMatch) score += 0.3
                }
                
                return { place, distance, bearing, score }
              })
              .filter((item: any) => item !== null)
              .sort((a: any, b: any) => b.score - a.score)
              
              if (placesWithScores.length > 0) {
                 const bestMatch = placesWithScores[0]
                 // Reasonable threshold: score > 0.2 means vaguely in the right direction
                 if (bestMatch.distance < searchRadius && bestMatch.score > 0.2) {
                   placeDetails = bestMatch.place
                   placeId = placeDetails.place_id
                   console.log('Tap-context: [VISION+LOCATION] Found by direction:', {
                     name: placeDetails.name,
                     distance: bestMatch.distance.toFixed(0) + 'm',
                     score: bestMatch.score.toFixed(2),
                     types: placeDetails.types
                   })
                 }
              }
            }
          }
        }
        
        // Strategy 3: Get detailed information for the found place
        if (placeId) {
          console.log('Tap-context: [VISION+LOCATION] Fetching detailed info for place_id:', placeId)
          
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,url,rating,user_ratings_total,types,geometry,editorial_summary,reviews,opening_hours,photos,international_phone_number,price_level&key=${placesApiKey}`
          
          console.log('Tap-context: [VISION+LOCATION] Fetching details from:', detailsUrl.split('&key=')[0])
          
          const detailsResponse = await fetch(detailsUrl)
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json()
            console.log('Tap-context: [VISION+LOCATION] Details API response status:', detailsData.status)
            
            if (detailsData.result) {
              const detailedPlace = detailsData.result
              
              console.log('Tap-context: [VISION+LOCATION] Got detailed place info:', {
                name: detailedPlace.name,
                hasEditorialSummary: !!detailedPlace.editorial_summary,
                editorialSummaryLength: detailedPlace.editorial_summary?.overview?.length || 0,
                hasReviews: !!detailedPlace.reviews,
                reviewCount: detailedPlace.reviews?.length || 0,
                types: detailedPlace.types,
                rating: detailedPlace.rating,
                address: detailedPlace.formatted_address
              })
              
              // Build rich description - prioritize Places editorial summary if available
              let combinedDescription = ''
              if (detailedPlace.editorial_summary?.overview) {
                combinedDescription = detailedPlace.editorial_summary.overview
                if (visionResult?.description) {
                  combinedDescription += ` ${visionResult.description}`
                }
              } else if (visionResult?.description) {
                combinedDescription = visionResult.description
              } else {
                combinedDescription = `${detailedPlace.name} is a ${detailedPlace.types?.[0]?.replace(/_/g, ' ') || 'location'} located at ${detailedPlace.formatted_address || 'this location'}.`
              }
              
              // Build rich details combining both sources
              const detailsParts = []
              
              // From Google Places (prioritize this - it's more accurate)
              if (detailedPlace.editorial_summary?.overview) {
                detailsParts.push(detailedPlace.editorial_summary.overview)
              }
              
              // From Gemini vision (add if different/unique)
              if (visionResult?.details && visionResult.details !== detailedPlace.editorial_summary?.overview) {
                detailsParts.push(visionResult.details)
              }
              if (visionResult?.significance) {
                detailsParts.push(`Significance: ${visionResult.significance}`)
              }
              if (visionResult?.architecturalStyle) {
                detailsParts.push(`Architectural Style: ${visionResult.architecturalStyle}`)
              }
              if (visionResult?.year) {
                detailsParts.push(`Built: ${visionResult.year}`)
              }
              
              // Additional Places data
              if (detailedPlace.formatted_address) {
                detailsParts.push(`📍 Address: ${detailedPlace.formatted_address}`)
              }
              if (detailedPlace.rating) {
                detailsParts.push(`⭐ Rating: ${detailedPlace.rating}/5 (${detailedPlace.user_ratings_total || 0} reviews)`)
              }
              if (detailedPlace.formatted_phone_number) {
                detailsParts.push(`📞 Phone: ${detailedPlace.formatted_phone_number}`)
              }
              if (detailedPlace.opening_hours?.weekday_text) {
                detailsParts.push(`🕐 Hours: ${detailedPlace.opening_hours.weekday_text[0]}`)
              }
              
              // Add review snippets if available
              if (detailedPlace.reviews && detailedPlace.reviews.length > 0) {
                const topReview = detailedPlace.reviews[0]
                if (topReview.text && topReview.text.length > 0) {
                  detailsParts.push(`💬 Review: "${topReview.text.substring(0, 200)}${topReview.text.length > 200 ? '...' : ''}"`)
                }
              }
              
              const combinedDetails = detailsParts.join('\n\n')
              
              const formattedType = (visionResult?.type || detailedPlace.types?.[0] || 'Location')
                .replace(/_/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
              
              console.log('Tap-context: [VISION+LOCATION] Returning combined result:', {
                title: visionResult?.name || detailedPlace.name,
                hasVisionDetails: !!(visionResult?.details || visionResult?.significance),
                hasPlacesDetails: !!detailedPlace.editorial_summary,
                detailsLength: combinedDetails.length
              })
              
              return NextResponse.json(
                {
                  title: visionResult?.name || detailedPlace.name || 'Building',
                  subtitle: formattedType,
                  description: combinedDescription,
                  details: combinedDetails,
                  year: visionResult?.year || null,
                  confidence: 0.9,
                  url: detailedPlace.url || detailedPlace.website,
                },
                {
                  headers: {
                    'X-RateLimit-Limit': '60',
                    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                    'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
                  },
                }
              )
            }
          } else {
            const errorText = await detailsResponse.text()
            console.error('Tap-context: [VISION+LOCATION] Places Details API error:', detailsResponse.status, errorText)
          }
        }
        
        // Fallback: If we have vision result but no place found, still use vision details
        if (visionResult && !placeId) {
          console.log('Tap-context: [VISION ONLY] No matching place found, using vision result only')
          const formattedType = visionResult.type
            ? visionResult.type
                .replace(/_/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            : 'Location'
          
          const combinedDetails = [
            visionResult.details,
            visionResult.significance,
            visionResult.architecturalStyle ? `Architectural style: ${visionResult.architecturalStyle}` : null
          ].filter(Boolean).join('\n\n')
          
          return NextResponse.json(
            {
              title: visionResult.name || 'Building',
              subtitle: formattedType,
              description: visionResult.description || '',
              details: combinedDetails,
              year: visionResult.year || null,
              confidence: 0.7,
            },
            {
              headers: {
                'X-RateLimit-Limit': '60',
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
              },
            }
          )
        }
      } catch (placeError) {
        console.error('Tap-context: [VISION+LOCATION] Place lookup failed:', placeError)
      }
    }
    
    // Fallback: Try nearby places search if vision didn't work
    if (latitude && longitude) {
      try {
        // Call geo-context API directly (server-side import)
        const { POST: geoContextHandler } = await import('../geo-context/route')
        
        const geoRequest = new NextRequest(new URL('/api/geo-context', request.url), {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({
            latitude,
            longitude,
            direction,
            fov: 60,
          }),
        })
        
        console.log('Tap-context: Fallback to nearby places search')
        
        const geoContextResponse = await geoContextHandler(geoRequest)
        
        if (geoContextResponse.ok) {
          const geoData = await geoContextResponse.json()
          
          if (geoData.places && geoData.places.length > 0) {
            // Use first nearby place, enhanced with vision if available
            const bestPlace = geoData.places[0]
            
            // Prioritize vision result details, but use place data for URL/links
            const finalName = visionResult?.name || bestPlace.name || 'Unknown Place'
            const finalType = visionResult?.type || bestPlace.type || 'Location'
            
            // Combine vision details with place data
            const description = visionResult?.description || `A ${finalType.toLowerCase()} located nearby.`
            const details = visionResult?.details || 
              (visionResult?.significance ? `Significance: ${visionResult.significance}` : '')
            
            console.log('Tap-context: Returning place info', {
              name: finalName,
              type: finalType,
              hasVisionDetails: !!(visionResult?.details || visionResult?.significance),
              confidence: bestPlace.confidence || 0.8,
              url: bestPlace.url,
            })
            
            // Format type nicely (remove underscores, capitalize)
            const formattedType = finalType
              .replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            return NextResponse.json(
              {
                title: finalName,
                subtitle: formattedType,
                description: description,
                details: details || visionResult?.significance || '',
                year: visionResult?.year || null,
                confidence: bestPlace.confidence || 0.8,
                url: bestPlace.url || bestPlace.website,
              },
              {
                headers: {
                  'X-RateLimit-Limit': '60',
                  'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                  'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
                },
              }
            )
          } else if (visionResult) {
            // If no places found but we have vision result, use that
            console.log('No places found in Google Places, using vision result only:', visionResult)
            const formattedType = visionResult.type
              ? visionResult.type
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
              : 'Location'
            
            // Combine details and significance
            const combinedDetails = [
              visionResult.details,
              visionResult.significance,
              visionResult.architecturalStyle ? `Architectural style: ${visionResult.architecturalStyle}` : null
            ].filter(Boolean).join(' ')
            
            return NextResponse.json(
              {
                title: visionResult.name || 'Building',
                subtitle: formattedType,
                description: visionResult.description || '',
                details: combinedDetails || '',
                year: visionResult.year || null,
                confidence: 0.7,
              },
              {
                headers: {
                  'X-RateLimit-Limit': '60',
                  'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                  'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
                },
              }
            )
          } else {
            console.log('Tap-context: No places found in geo-context response and no vision result')
          }
        } else {
          const errorText = await geoContextResponse.text()
          console.error('Tap-context: Geo-context API error', {
            status: geoContextResponse.status,
            error: errorText,
          })
        }
      } catch (geoError) {
        console.error('Tap-context: Geo-context lookup failed:', geoError)
        // Fall through to mock response
      }
    } else {
      console.log('Tap-context: No location provided', { latitude, longitude })
    }
    
    // Fallback: Use vision result if available, otherwise show helpful message
    if (visionResult) {
      console.log('Tap-context: Using vision result as fallback:', visionResult)
      const formattedType = visionResult.type
        ? visionResult.type
            .replace(/_/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : 'Location'
      
      return NextResponse.json(
        {
          title: visionResult.name || 'Building',
          subtitle: formattedType,
          description: visionResult.description || '',
          details: visionResult.details || '',
          year: visionResult.year || null,
          confidence: 0.7,
        },
        {
          headers: {
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      )
    }
    
    // Final fallback: Return helpful message
    console.log('Tap-context: Using final fallback response')
    
    let title = 'Contextual Information'
    let subtitle = ''
    
    if (!latitude || !longitude) {
      title = 'Location Required'
      subtitle = 'Please enable location permissions to get real information about places you tap on.'
    } else {
      // Check if Google API key might be missing
      const hasApiKey = process.env.GOOGLE_API_KEY
      if (!hasApiKey) {
        title = 'API Key Not Configured'
        subtitle = 'Google Places API key is required. Add GOOGLE_API_KEY to your .env file.'
      } else {
        title = 'No Information Found'
        subtitle = `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Try tapping on a visible building or landmark.`
      }
    }
    
    const mockResponse = {
      title,
      subtitle: subtitle || `Tapped at (${(tapX * 100).toFixed(0)}%, ${(tapY * 100).toFixed(0)}%)`,
      confidence: 0.3,
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
    // Generic error message - never expose internal details
    if (error instanceof Error) {
      console.error('Tap context error:', error.message)
    } else {
      console.error('Tap context error: Unknown error')
    }
    
    return NextResponse.json(
      { error: 'Context lookup failed' },
      { status: 500 }
    )
  }
}

