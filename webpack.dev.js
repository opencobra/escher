const {merge} = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'development',
  entry: './dev-server/index.js',
  output: {
    filename: 'bundle.js'
  },
  devServer: {
    static: './dev-server',
    open: true,
    port: 7621
  }
})
