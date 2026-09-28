const path = require('path')
const common = require('./webpack.common.js')

// Bundle for the anywidget-based Jupyter widget (py/escher/plots.py).
// anywidget loads a single ES module, so everything (CSS, fonts) must be
// inlined rather than emitted as separate files.
module.exports = {
  ...common,
  mode: 'production',
  devtool: false,
  entry: './src/escher-widget.js',
  experiments: { outputModule: true },
  output: {
    path: path.resolve(__dirname, 'py/escher/static'),
    filename: 'escher-widget.js',
    library: { type: 'module' }
  },
  module: {
    rules: common.module.rules.map(rule =>
      rule.type === 'asset' ? { ...rule, type: 'asset/inline' } : rule
    )
  }
}
