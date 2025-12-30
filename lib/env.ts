/**
 * Server-Only Environment Variable Validation
 * 
 * This module MUST NOT be imported by client components.
 * All environment variables containing secrets are validated here.
 */

/**
 * Require an environment variable, throwing if missing
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Server-only configuration object
 * Never expose these values to the client
 * 
 * Validation is lazy - only happens when properties are accessed
 */
export const serverConfig = {
  get google() {
    return {
      get apiKey() {
        return requireEnv('GOOGLE_API_KEY')
      },
    }
  },
  get gemini() {
    return {
      get apiKey() {
        // Use same API key for Gemini (Google AI Studio)
        return requireEnv('GOOGLE_API_KEY')
      },
    }
  },
} as const

