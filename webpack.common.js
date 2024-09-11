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
        test: /\.svg$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 65000,
            mimetype: 'image/svg+xml',
            name: 'public/fonts/[name].[ext]'
          }
        }
      },
      {
        test: /\.woff$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 65000,
            mimetype: 'application/font-woff',
            name: 'public/fonts/[name].[ext]'
          }
        }
      },
      {
        test: /\.woff2$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 65000,
            mimetype: 'application/font-woff2',
            name: 'public/fonts/[name].[ext]'
          }
        }
      },
      {
        test: /\.[ot]tf$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 65000,
            mimetype: 'application/octet-stream',
            name: 'public/fonts/[name].[ext]'
          }
        }
      },
      {
        test: /\.eot$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 65000,
            mimetype: 'application/vnd.ms-fontobject',
            name: 'public/fonts/[name].[ext]'
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      ESCHER_VERSION: JSON.stringify(package.version)
    })
  ]
}
