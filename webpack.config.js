const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './tig/blobuploader/styles/prosilver/template/js/index.js',
  output: {
    filename: 'azureBlob.bundle.js',
    path: path.resolve(__dirname, './tig/blobuploader/styles/prosilver/template/js')
  },
  mode: 'development',
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser.js')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js'
    })
  ]
};
