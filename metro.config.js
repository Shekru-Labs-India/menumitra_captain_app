// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add SVG support
const { transformer, resolver } = config;

config.resolver = {
  ...resolver,
  assetExts: [...resolver.assetExts, "svg"],
  sourceExts: [...resolver.sourceExts, "jsx", "js"],
};

module.exports = config;
