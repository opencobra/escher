import { afterAll } from 'vitest'

// The intersection-observer polyfill (imported by tests that draw maps)
// checks for intersections on a throttled timer after DOM changes. Wait for
// any pending check before the test environment is torn down; otherwise it
// runs without a window and fails the test run.
afterAll(async () => {
  const throttle = globalThis.IntersectionObserver?.prototype?.THROTTLE_TIMEOUT
  if (throttle) await new Promise(resolve => setTimeout(resolve, throttle + 50))
})
