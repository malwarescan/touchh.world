/**
 * Confidence Smoothing
 * 
 * Provides temporal smoothing for confidence scores to prevent jitter
 */

export class ConfidenceSmoother {
  private history: number[] = []
  private readonly maxHistorySize = 5
  private readonly minConfidence = 0.0
  private readonly maxConfidence = 1.0

  /**
   * Add a new confidence value and return smoothed result
   */
  smooth(confidence: number): number {
    // Clamp to valid range
    const clamped = Math.max(
      this.minConfidence,
      Math.min(this.maxConfidence, confidence)
    )

    // Add to history
    this.history.push(clamped)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }

    // Return exponential moving average
    return this.exponentialMovingAverage()
  }

  /**
   * Calculate exponential moving average
   * More recent values have higher weight
   */
  private exponentialMovingAverage(): number {
    if (this.history.length === 0) return 0
    if (this.history.length === 1) return this.history[0]

    const alpha = 0.5 // Smoothing factor
    let ema = this.history[0]

    for (let i = 1; i < this.history.length; i++) {
      ema = alpha * this.history[i] + (1 - alpha) * ema
    }

    return ema
  }

  /**
   * Reset smoothing history
   */
  reset() {
    this.history = []
  }

  /**
   * Get current smoothed value without adding new data
   */
  getCurrent(): number {
    if (this.history.length === 0) return 0
    return this.exponentialMovingAverage()
  }
}

