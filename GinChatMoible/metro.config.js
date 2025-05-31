// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add any custom configurations here
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];

// Configure server to bind to all interfaces
config.server = {
  ...config.server,
  host: '0.0.0.0',
  port: 8081,
};

module.exports = config;
