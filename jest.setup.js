// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock MediaPipe and camera APIs for testing
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }],
    })),
  },
  geolocation: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      })
    }),
  },
}

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  writable: true,
  value: 1280,
})

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  writable: true,
  value: 720,
})

Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  writable: true,
  value: 2, // HAVE_CURRENT_DATA
})

