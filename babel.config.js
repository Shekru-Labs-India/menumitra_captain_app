module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json'],
          alias: {
            '@': './app',
            '@/components': './components',
            '@/constants': './constants',
            '@/hooks': './hooks',
            '@/assets': './assets',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
