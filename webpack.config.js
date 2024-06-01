import path from 'path';
import { fileURLToPath } from 'url';

import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    options: './src/options/options.js',
    popup: './src/popup/popup.js',
    content: './src/content.js',
    background: './src/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/_locales', to: '_locales' },
        { from: 'src/assets', to: 'assets' },
        { from: 'src/icons', to: 'icons' },
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/options/options.html', to: 'options.html' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  resolve: {
    extensions: ['.js', '.json']
  }
};
