import {
  distance2D,
  distance3D,
  normalize2D,
  normalize3D,
  dot3D,
  angleBetween3D,
  projectToScreen,
} from '@/lib/vectorMath'

describe('vectorMath', () => {
  describe('distance2D', () => {
    it('should calculate distance between two 2D points', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 3, y: 4 }
      expect(distance2D(a, b)).toBe(5) // 3-4-5 triangle
    })

    it('should return 0 for identical points', () => {
      const a = { x: 5, y: 5 }
      const b = { x: 5, y: 5 }
      expect(distance2D(a, b)).toBe(0)
    })

    it('should handle negative coordinates', () => {
      const a = { x: -1, y: -1 }
      const b = { x: 2, y: 2 }
      expect(distance2D(a, b)).toBeCloseTo(4.243, 2) // sqrt(18)
    })
  })

  describe('distance3D', () => {
    it('should calculate distance between two 3D points', () => {
      const a = { x: 0, y: 0, z: 0 }
      const b = { x: 3, y: 4, z: 0 }
      expect(distance3D(a, b)).toBe(5)
    })

    it('should include z-axis in calculation', () => {
      const a = { x: 0, y: 0, z: 0 }
      const b = { x: 0, y: 0, z: 5 }
      expect(distance3D(a, b)).toBe(5)
    })

    it('should return 0 for identical points', () => {
      const a = { x: 1, y: 2, z: 3 }
      const b = { x: 1, y: 2, z: 3 }
      expect(distance3D(a, b)).toBe(0)
    })
  })

  describe('normalize2D', () => {
    it('should normalize a 2D vector', () => {
      const v = { x: 3, y: 4 }
      const normalized = normalize2D(v)
      expect(normalized.x).toBeCloseTo(0.6, 2)
      expect(normalized.y).toBeCloseTo(0.8, 2)
      // Check magnitude is 1
      const magnitude = Math.sqrt(normalized.x ** 2 + normalized.y ** 2)
      expect(magnitude).toBeCloseTo(1, 5)
    })

    it('should handle zero vector', () => {
      const v = { x: 0, y: 0 }
      const normalized = normalize2D(v)
      expect(normalized.x).toBe(0)
      expect(normalized.y).toBe(0)
    })

    it('should handle negative components', () => {
      const v = { x: -3, y: -4 }
      const normalized = normalize2D(v)
      expect(normalized.x).toBeCloseTo(-0.6, 2)
      expect(normalized.y).toBeCloseTo(-0.8, 2)
    })
  })

  describe('normalize3D', () => {
    it('should normalize a 3D vector', () => {
      const v = { x: 2, y: 2, z: 2 }
      const normalized = normalize3D(v)
      const magnitude = Math.sqrt(
        normalized.x ** 2 + normalized.y ** 2 + normalized.z ** 2
      )
      expect(magnitude).toBeCloseTo(1, 5)
    })

    it('should handle zero vector', () => {
      const v = { x: 0, y: 0, z: 0 }
      const normalized = normalize3D(v)
      expect(normalized.x).toBe(0)
      expect(normalized.y).toBe(0)
      expect(normalized.z).toBe(0)
    })
  })

  describe('dot3D', () => {
    it('should calculate dot product of two 3D vectors', () => {
      const a = { x: 1, y: 2, z: 3 }
      const b = { x: 4, y: 5, z: 6 }
      expect(dot3D(a, b)).toBe(32) // 1*4 + 2*5 + 3*6
    })

    it('should return 0 for perpendicular vectors', () => {
      const a = { x: 1, y: 0, z: 0 }
      const b = { x: 0, y: 1, z: 0 }
      expect(dot3D(a, b)).toBe(0)
    })

    it('should handle negative components', () => {
      const a = { x: -1, y: -2, z: -3 }
      const b = { x: 1, y: 2, z: 3 }
      expect(dot3D(a, b)).toBe(-14)
    })
  })

  describe('angleBetween3D', () => {
    it('should calculate angle between parallel vectors', () => {
      const a = { x: 1, y: 0, z: 0 }
      const b = { x: 2, y: 0, z: 0 }
      const angle = angleBetween3D(a, b)
      expect(angle).toBeCloseTo(0, 5)
    })

    it('should calculate angle between perpendicular vectors', () => {
      const a = { x: 1, y: 0, z: 0 }
      const b = { x: 0, y: 1, z: 0 }
      const angle = angleBetween3D(a, b)
      expect(angle).toBeCloseTo(Math.PI / 2, 5)
    })

    it('should handle zero vectors', () => {
      const a = { x: 0, y: 0, z: 0 }
      const b = { x: 1, y: 0, z: 0 }
      const angle = angleBetween3D(a, b)
      expect(angle).toBe(0)
    })
  })

  describe('projectToScreen', () => {
    it('should project 3D direction to 2D screen coordinates', () => {
      const direction = { x: 0, y: 0, z: 1 }
      const screenWidth = 1920
      const screenHeight = 1080
      const projected = projectToScreen(direction, screenWidth, screenHeight, 60)
      
      // Should be centered on screen
      expect(projected.x).toBeCloseTo(screenWidth / 2, 0)
      expect(projected.y).toBeCloseTo(screenHeight / 2, 0)
    })

    it('should handle different FOV values', () => {
      const direction = { x: 0, y: 0, z: 1 }
      const screenWidth = 1920
      const screenHeight = 1080
      
      const projected90 = projectToScreen(direction, screenWidth, screenHeight, 90)
      const projected60 = projectToScreen(direction, screenWidth, screenHeight, 60)
      
      // Both should be centered, but calculations differ
      expect(projected90.x).toBeCloseTo(screenWidth / 2, 0)
      expect(projected60.x).toBeCloseTo(screenWidth / 2, 0)
    })

    it('should handle off-center directions', () => {
      const direction = { x: 0.1, y: 0.1, z: 1 }
      const screenWidth = 1920
      const screenHeight = 1080
      const projected = projectToScreen(direction, screenWidth, screenHeight, 60)
      
      // Should be offset from center
      expect(projected.x).not.toBe(screenWidth / 2)
      expect(projected.y).not.toBe(screenHeight / 2)
    })
  })
})

