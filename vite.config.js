import { defineConfig } from 'vite';
import rawPlugin from 'vite-plugin-raw';
import { version } from './package.json'; // Import version from package.json

export default defineConfig({
  define: {
    ESCHER_VERSION: JSON.stringify(version), // Inject version from package.json
  },
  plugins: [
    rawPlugin({
      match: /\.(css)$/, // You can specify more extensions if needed
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/tests/*.js'], // Include your test file pattern
    exclude: ['webpack.test.js'], // Add this to exclude the file
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Output both text and lcov for Coveralls
      all: true, // Include all files in the coverage report
      exclude: ['node_modules', 'test'], // Exclude folders from coverage
    },
  },
});