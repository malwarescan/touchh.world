'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import CameraFeed from '@/components/CameraFeed'
import { downscaleFrame, extractROI } from '@/lib/frameUtils'

interface ContextCard {
  title: string
  subtitle?: string
  confidence: number
  x: number // Normalized 0-1
  y: number // Normalized 0-1
}

export default function Home() {
  const [contextCard, setContextCard] = useState<ContextCard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isProcessingRef = useRef(false)

  // Get device location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => {
          // Fail soft - can still work without location
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  const handleFrame = useCallback((video: HTMLVideoElement) => {
    // Just track video for frame capture
  }, [])

  const handleTap = useCallback(async (event: React.TouchEvent | React.MouseEvent) => {
    // Prevent multiple simultaneous requests
    if (isProcessingRef.current || !videoRef.current) return

    const video = videoRef.current
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    // Get tap coordinates (normalized 0-1)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY
    
    if (!clientX || !clientY) return

    const tapX = (clientX - rect.left) / rect.width
    const tapY = (clientY - rect.top) / rect.height

    // Dismiss existing card if tapping elsewhere
    if (contextCard) {
      setContextCard(null)
      // Small delay to allow dismiss animation
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    try {
      isProcessingRef.current = true
      setIsLoading(true)

      // Extract ROI around tap point (focus on what user tapped)
      const roiImage = await extractROI(video, tapX, tapY, 0.4) // 40% of frame around tap

      // Send to backend with ROI image
      const response = await fetch('/api/tap-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: roiImage, // Send ROI, not full frame
          tapX,
          tapY,
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.title) {
        setContextCard({
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          details: data.details,
          year: data.year,
          confidence: data.confidence || 0.8,
          x: tapX,
          y: tapY,
          url: data.url,
        })
      }
    } catch (error) {
      console.error('Tap context failed:', error)
      // Fail soft - don't show error to user
    } finally {
      setIsLoading(false)
      isProcessingRef.current = false
    }
  }, [contextCard, location])

  const handleError = useCallback((error: Error) => {
    console.error('Camera error:', error)
  }, [])

  return (
    <main 
      className="relative w-full h-screen overflow-hidden bg-black"
      onTouchStart={handleTap}
      onClick={handleTap}
    >
      {/* Camera Feed */}
      <CameraFeed videoRef={videoRef} onFrame={handleFrame} onError={handleError} />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="bg-black/50 text-white px-4 py-2 rounded">
            Processing...
          </div>
        </div>
      )}

      {/* Context Card */}
      {contextCard && (
        <ContextCardDisplay
          card={contextCard}
          onDismiss={() => setContextCard(null)}
        />
      )}
    </main>
  )
}

function ContextCardDisplay({ card, onDismiss }: { card: ContextCard; onDismiss: () => void }) {
  // Convert normalized coordinates to screen pixels
  const x = card.x * window.innerWidth
  const y = card.y * window.innerHeight

  // Position card above tap, but keep it on screen
  const cardY = Math.max(20, y - 100)
  const cardX = Math.min(
    Math.max(20, x - 150), // Center 150px card
    window.innerWidth - 320 // Keep 320px card on screen
  )

  return (
    <div
      className="absolute bg-white/95 text-black p-4 rounded-lg shadow-lg z-50 max-w-[320px] pointer-events-auto"
      style={{
        left: `${cardX}px`,
        top: `${cardY}px`,
        animation: 'fadeIn 0.2s ease-out',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl leading-none z-10"
        aria-label="Dismiss"
      >
        ×
      </button>
      
      <div className="font-semibold text-lg mb-1 pr-6">{card.title}</div>
      
      {card.subtitle && (
        <div className="text-sm text-gray-600 mb-2 font-medium">{card.subtitle}</div>
      )}
      
      {card.year && (
        <div className="text-xs text-gray-500 mb-2">Built: {card.year}</div>
      )}
      
      {card.description && (
        <div className="text-sm text-gray-700 mb-2 leading-relaxed">{card.description}</div>
      )}
      
      {card.details && (
        <div className="text-xs text-gray-600 mb-3 leading-relaxed border-t border-gray-200 pt-2">
          {card.details}
        </div>
      )}
      
      {card.url && (
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 underline block mb-2 hover:text-blue-800"
        >
          View on Google Maps →
        </a>
      )}
      
      <div className="text-xs text-gray-400 mt-2">
        Confidence: {(card.confidence * 100).toFixed(0)}%
      </div>
    </div>
  )
}
