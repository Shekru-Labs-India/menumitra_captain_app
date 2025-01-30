// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable async storage and other native modules
  resolver: {
    sourceExts: ["js", "jsx", "json", "ts", "tsx"],
    assetExts: ["png", "jpg", "jpeg", "gif", "mp3", "svg"],
  },
});

module.exports = config;
