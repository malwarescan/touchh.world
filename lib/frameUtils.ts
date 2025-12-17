/**
 * Frame Utilities
 * 
 * Utilities for processing video frames for inference
 * Optimized for mobile performance
 */

/**
 * Downscale a video frame to a smaller size for inference
 * Reduces data transfer and processing time
 * Returns Promise to handle async canvas operations
 */
export async function downscaleFrame(
  video: HTMLVideoElement,
  targetWidth: number = 640,
  targetHeight: number = 480
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create offscreen canvas for downscaling
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    // Draw video frame to canvas at target size
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
    
    // Convert to base64 JPEG (compressed)
    // Use toBlob for better performance, then convert to base64
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'))
          return
        }
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          resolve(base64)
        }
        reader.onerror = () => reject(new Error('Failed to read blob'))
        reader.readAsDataURL(blob)
      },
      'image/jpeg',
      0.85 // 85% quality for balance
    )
  })
}

/**
 * Extract ROI (Region of Interest) from frame around tap coordinates
 * Crops a region centered on the tap point
 */
export async function extractROI(
  video: HTMLVideoElement,
  tapX: number, // Normalized 0-1
  tapY: number, // Normalized 0-1
  roiSize: number = 0.3 // Size of ROI as fraction of frame (30% of frame)
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    // Calculate ROI dimensions
    const frameWidth = video.videoWidth
    const frameHeight = video.videoHeight
    const roiWidth = frameWidth * roiSize
    const roiHeight = frameHeight * roiSize
    
    // Calculate crop coordinates (center on tap point)
    const cropX = Math.max(0, Math.min(frameWidth - roiWidth, (tapX * frameWidth) - roiWidth / 2))
    const cropY = Math.max(0, Math.min(frameHeight - roiHeight, (tapY * frameHeight) - roiHeight / 2))
    
    // Set canvas to ROI size
    canvas.width = roiWidth
    canvas.height = roiHeight
    
    // Draw the ROI region from video
    ctx.drawImage(
      video,
      cropX, cropY, roiWidth, roiHeight, // Source rectangle
      0, 0, roiWidth, roiHeight // Destination rectangle
    )
    
    // Convert to base64 JPEG
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'))
          return
        }
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          resolve(base64)
        }
        reader.onerror = () => reject(new Error('Failed to read blob'))
        reader.readAsDataURL(blob)
      },
      'image/jpeg',
      0.9 // Higher quality for better recognition
    )
  })
}

