/**
 * Vector Math Utilities
 * 
 * Simple vector operations for gesture direction calculations
 */

export interface Vector2D {
  x: number
  y: number
}

export interface Vector3D {
  x: number
  y: number
  z: number
}

/**
 * Calculate distance between two 2D points
 */
export function distance2D(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate distance between two 3D points
 */
export function distance3D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Normalize a 2D vector
 */
export function normalize2D(v: Vector2D): Vector2D {
  const length = Math.sqrt(v.x * v.x + v.y * v.y)
  if (length === 0) return { x: 0, y: 0 }
  return { x: v.x / length, y: v.y / length }
}

/**
 * Normalize a 3D vector
 */
export function normalize3D(v: Vector3D): Vector3D {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (length === 0) return { x: 0, y: 0, z: 0 }
  return { x: v.x / length, y: v.y / length, z: v.z / length }
}

/**
 * Dot product of two 3D vectors
 */
export function dot3D(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/**
 * Calculate angle between two 3D vectors (in radians)
 */
export function angleBetween3D(a: Vector3D, b: Vector3D): number {
  const dot = dot3D(a, b)
  const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
  const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z)
  if (magA === 0 || magB === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB))))
}

/**
 * Project 3D direction vector onto 2D screen space
 * Assumes camera FOV and screen dimensions
 */
export function projectToScreen(
  direction: Vector3D,
  screenWidth: number,
  screenHeight: number,
  fov: number = 60
): Vector2D {
  // Simple perspective projection
  // In a real implementation, this would use proper camera intrinsics
  const f = screenHeight / (2 * Math.tan((fov * Math.PI) / 360))
  
  const x = (direction.x / direction.z) * f + screenWidth / 2
  const y = (direction.y / direction.z) * f + screenHeight / 2
  
  return { x, y }
}

