// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Add SVG support
const { transformer, resolver } = config;

config.resolver = {
  ...resolver,
  assetExts: [...resolver.assetExts, 'svg'],
};

module.exports = config;
