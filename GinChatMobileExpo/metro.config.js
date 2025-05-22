// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Add support for @ path alias
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

// Optimize Metro Bundler
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.resolver.assetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'mp4', 'wav', 'ttf'];

// Prevent infinite loops in the bundler
config.watcher.additionalExts = ['mjs', 'cjs'];
config.maxWorkers = 4; // Limit the number of workers to prevent excessive CPU usage

// CRITICAL FIX: Exclude node_modules from file watching
// This prevents the bundler from getting stuck in a loop
config.watchFolders = [
  path.resolve(__dirname),
];

// Explicitly exclude node_modules from being watched
config.resolver.blockList = [
  /node_modules[\/\\]expo-router[\/\\]node[\/\\]render\.js$/,
  /node_modules[\/\\]expo-router[\/\\]entry\.js$/,
  /node_modules[\/\\]react-native[\/\\]Libraries[\/\\]NewAppScreen/,
];

// Optimize caching
config.cacheVersion = '1.0';
config.transformer.minifierPath = 'metro-minify-terser';
config.transformer.minifierConfig = {
  compress: {
    drop_console: false,
  },
};

// Prevent symlink issues
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle specific problematic modules
  if (moduleName.includes('expo-router')) {
    const defaultResolve = context.resolveRequest;
    return defaultResolve(context, moduleName, platform);
  }
  return null;
};

module.exports = config;