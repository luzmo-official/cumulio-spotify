const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: {
    app: './src/app.js',
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'public/js'),
    library: 'SpotifyApp'
  },
};