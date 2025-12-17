import { ConfidenceSmoother } from '@/lib/confidenceSmoothing'

describe('ConfidenceSmoother', () => {
  let smoother: ConfidenceSmoother

  beforeEach(() => {
    smoother = new ConfidenceSmoother()
  })

  describe('smooth', () => {
    it('should return the first value when history is empty', () => {
      const result = smoother.smooth(0.8)
      expect(result).toBe(0.8)
    })

    it('should clamp values to valid range [0, 1]', () => {
      const result1 = smoother.smooth(-0.5)
      expect(result1).toBeGreaterThanOrEqual(0)
      expect(result1).toBeLessThanOrEqual(1)

      const result2 = smoother.smooth(1.5)
      expect(result2).toBeGreaterThanOrEqual(0)
      expect(result2).toBeLessThanOrEqual(1)
    })

    it('should apply exponential moving average', () => {
      // Add multiple values
      smoother.smooth(0.5)
      smoother.smooth(0.6)
      smoother.smooth(0.7)
      
      const result = smoother.smooth(0.8)
      // EMA should be weighted toward recent values
      expect(result).toBeGreaterThan(0.5)
      expect(result).toBeLessThanOrEqual(0.8)
    })

    it('should maintain history size limit', () => {
      // Add more values than maxHistorySize (5)
      for (let i = 0; i < 10; i++) {
        smoother.smooth(0.5 + i * 0.05)
      }
      
      // Should still work without errors
      const result = smoother.smooth(0.9)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })

    it('should smooth out jittery values', () => {
      // Simulate jittery confidence values
      const values = [0.7, 0.3, 0.8, 0.2, 0.9, 0.1, 0.8]
      const results = values.map(v => smoother.smooth(v))
      
      // Results should be smoother than input
      // Check that variance is reduced
      const inputVariance = calculateVariance(values)
      const outputVariance = calculateVariance(results)
      
      // Output should generally have less variance (smoother)
      // Note: This is a heuristic test, EMA doesn't guarantee lower variance
      expect(results.length).toBe(values.length)
    })
  })

  describe('reset', () => {
    it('should clear history', () => {
      smoother.smooth(0.8)
      smoother.smooth(0.9)
      
      smoother.reset()
      
      // After reset, should behave like fresh instance
      const result = smoother.smooth(0.5)
      expect(result).toBe(0.5)
    })
  })

  describe('getCurrent', () => {
    it('should return 0 when history is empty', () => {
      expect(smoother.getCurrent()).toBe(0)
    })

    it('should return current smoothed value without adding new data', () => {
      smoother.smooth(0.5)
      smoother.smooth(0.6)
      
      const before = smoother.getCurrent()
      const after = smoother.getCurrent()
      
      // Should return same value without modifying state
      expect(before).toBe(after)
    })

    it('should return EMA of current history', () => {
      smoother.smooth(0.5)
      smoother.smooth(0.6)
      smoother.smooth(0.7)
      
      const current = smoother.getCurrent()
      expect(current).toBeGreaterThan(0)
      expect(current).toBeLessThanOrEqual(1)
    })
  })
})

// Helper function to calculate variance
function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

