import { defineConfig, transformWithEsbuild } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import { version } from './package.json'

// Oldest syntax esbuild can emit. The webpack build compiled Escher's own code
// to ES5 but bundled dependencies (d3, preact, ...) untranspiled, so it already
// required an ES2015 browser.
const TARGET = 'es2015'

const repoRoot = fileURLToPath(new URL('.', import.meta.url))

// `npm run build` runs three library builds, selected by --mode:
//   production (default)  dist/escher.js      UMD, global `escher`, unminified
//   min                   dist/escher.min.js  UMD, minified
//   widget                py/escher/static/escher-widget.js  ES module for anywidget
// CSS is injected by the JS (as webpack's style-loader did), so script-tag
// users and the widget need no separate stylesheet. Library mode inlines fonts
// and other assets.
const LIBRARY_BUILDS = {
  production: {
    entry: 'src/main.js',
    format: 'umd',
    fileName: 'escher.js',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true
  },
  min: {
    entry: 'src/main.js',
    format: 'umd',
    fileName: 'escher.min.js',
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
    sourcemap: true
  },
  widget: {
    entry: 'src/escher-widget.js',
    format: 'es',
    fileName: 'escher-widget.js',
    outDir: 'py/escher/static',
    emptyOutDir: false,
    minify: true,
    sourcemap: false
  }
}

// Vite leaves whitespace in ES-format library output (to keep it
// tree-shakeable). The widget bundle is final and gets stored in notebook
// widget state, so minify it fully. This runs in generateBundle because Vite
// re-prints chunks after the renderChunk hooks.
const minifyEsOutput = {
  name: 'minify-es-output',
  enforce: 'post',
  async generateBundle (_, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk') continue
      const result = await transformWithEsbuild(chunk.code, chunk.fileName, {
        minify: true,
        format: 'esm',
        target: TARGET
      })
      chunk.code = result.code
    }
  }
}

export default defineConfig(({ mode }) => {
  const lib = LIBRARY_BUILDS[mode]
  return {
    // `npm start` serves the development page in dev-server/
    root: mode === 'development' ? resolve(repoRoot, 'dev-server') : repoRoot,
    define: {
      ESCHER_VERSION: JSON.stringify(version)
    },
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment'
    },
    plugins: lib
      ? [cssInjectedByJs(), ...(lib.format === 'es' ? [minifyEsOutput] : [])]
      : [],
    build: lib && {
      lib: {
        entry: resolve(repoRoot, lib.entry),
        name: 'escher',
        formats: [lib.format],
        fileName: () => lib.fileName
      },
      target: TARGET,
      outDir: resolve(repoRoot, lib.outDir),
      emptyOutDir: lib.emptyOutDir,
      minify: lib.minify,
      sourcemap: lib.sourcemap,
      rollupOptions: {
        output: { exports: 'named' }
      }
    },
    server: {
      port: 7621,
      open: true,
      fs: { allow: [repoRoot] }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/tests/*.js'],
      setupFiles: ['src/tests/helpers/setup.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'], // Output both text and lcov for Coveralls
        all: true,
        exclude: ['node_modules', 'test']
      }
    }
  }
})
