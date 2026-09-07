import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // `tsconfig.json` declares the `vitest/globals` types, so enable the
    // globals those types describe. Tests may still import from `vitest`
    // explicitly, which is what the current suite does.
    globals: true,
    // Every test file instantiates PGlite's WebAssembly build once, which
    // costs several seconds while the suite runs in parallel. That lands
    // close to Vitest's 5s test and 10s hook defaults, so both are raised
    // together: `database.test.ts` pays the cost inside its test body, while
    // the other suites pay it in `beforeEach`. The headroom absorbs a cold or
    // loaded machine and is still small enough to fail a stuck test.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
