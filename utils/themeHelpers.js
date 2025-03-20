import { useColorMode } from 'native-base';

export function useThemeColor(lightValue, darkValue) {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? darkValue : lightValue;
}

// Usage in components:
// const backgroundColor = useThemeColor('white', 'coolGray.900'); 