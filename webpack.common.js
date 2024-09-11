const webpack = require('webpack')
const package = require('./package.json')

module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      // Embed font Definitions
      {
        test: /\.(svg|eot|otf|ttf|woff|woff2)$/i,
        // More information here https://webpack.js.org/guides/asset-modules/
        type: "asset",
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      ESCHER_VERSION: JSON.stringify(package.version)
    })
  ]
}
