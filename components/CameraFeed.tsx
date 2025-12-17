'use client'

import { useEffect, useRef, useState } from 'react'

interface CameraFeedProps {
  videoRef?: React.RefObject<HTMLVideoElement>
  onFrame?: (video: HTMLVideoElement) => void
  onError?: (error: Error) => void
}

/**
 * CameraFeed Component
 * 
 * Manages camera access and provides video stream to canvas
 * Optimized for mobile performance with 60fps target
 */
export default function CameraFeed({ videoRef: externalVideoRef, onFrame, onError }: CameraFeedProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    let stream: MediaStream | null = null
    let isMounted = true

    const startCamera = async () => {
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const isSecureContext = window.isSecureContext
          const protocol = window.location.protocol
          
          let errorMessage = 'Camera access not available.'
          if (!isSecureContext || protocol !== 'https:') {
            errorMessage += ' Camera requires HTTPS (or localhost). Please use https:// or test on localhost.'
          } else {
            errorMessage += ' Your browser may not support camera access.'
          }
          
          throw new Error(errorMessage)
        }

        // Request camera with constraints optimized for mobile
        // Use adaptive constraints that work well on both mobile and desktop
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { 
              ideal: 1280,
              max: 1920, // Cap at 1080p for mobile performance
            },
            height: { 
              ideal: 720,
              max: 1080,
            },
            frameRate: { 
              ideal: 30,
              max: 30, // Cap at 30fps for mobile battery/performance
            },
            // Mobile-specific optimizations
            aspectRatio: { ideal: 16 / 9 },
          },
          audio: false,
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints)
        
        if (!isMounted || !videoRef.current) {
          // Component unmounted or video ref not available
          stream.getTracks().forEach(track => track.stop())
          return
        }

        videoRef.current.srcObject = stream
        
        try {
          await videoRef.current.play()
        } catch (playError) {
          // Handle AbortError gracefully (common with Fast Refresh)
          if (playError instanceof Error && playError.name === 'AbortError') {
            // This is expected during Fast Refresh, not a real error
            return
          }
          throw playError
        }

        if (isMounted) {
          setIsStreaming(true)
          setError(null)
        }
      } catch (err) {
        // Only report real errors, not AbortErrors from Fast Refresh
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        
        if (isMounted) {
          const error = err instanceof Error ? err : new Error('Camera access failed')
          setError(error.message)
          onError?.(error)
          setIsStreaming(false)
        }
      }
    }

    startCamera()

    return () => {
      isMounted = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, []) // Empty deps - only run once on mount

  // Separate effect for frame loop that depends on isStreaming
  useEffect(() => {
    if (!isStreaming || !onFrame) return

    const frameLoop = () => {
      if (videoRef.current && isStreaming && onFrame) {
        onFrame(videoRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(frameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(frameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isStreaming, onFrame])

  return (
    <div className="absolute inset-0 w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <div className="text-center max-w-md">
            <p className="text-white text-sm mb-2">{error}</p>
            {error.includes('HTTPS') && (
              <p className="text-white/70 text-xs">
                For mobile testing, use HTTPS or test on localhost. 
                Try: <code className="bg-black/50 px-1 rounded">https://localhost:3000</code> or use a tunneling service.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

