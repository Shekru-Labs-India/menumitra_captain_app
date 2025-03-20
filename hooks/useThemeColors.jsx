import { useColorMode } from 'native-base';

export default function useThemeColors() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  return {
    // Background colors
    background: isDark ? 'coolGray.900' : 'white',
    cardBackground: isDark ? 'coolGray.800' : 'white',
    headerBackground: isDark ? 'coolGray.900' : 'white',
    inputBackground: isDark ? 'coolGray.800' : 'white',
    
    // Text colors
    text: isDark ? 'coolGray.100' : 'coolGray.800',
    heading: isDark ? 'white' : 'coolGray.800',
    subText: isDark ? 'coolGray.400' : 'coolGray.600',
    
    // Border colors
    border: isDark ? 'coolGray.700' : 'coolGray.200',
    inputBorder: isDark ? 'coolGray.700' : 'coolGray.300',
    divider: isDark ? 'coolGray.700' : 'coolGray.200',
    
    // State colors
    pressed: isDark ? 'coolGray.700' : 'coolGray.200',
    
    // Icon colors
    icon: isDark ? 'coolGray.400' : 'coolGray.500',
    
    // Badge backgrounds
    subtleBadge: (colorScheme = 'coolGray') => 
      isDark ? `${colorScheme}.900` : `${colorScheme}.100`,
    
    // Badge text
    subtleBadgeText: (colorScheme = 'coolGray') => 
      isDark ? `${colorScheme}.200` : `${colorScheme}.800`,
    
    // Helper function to get color for a component
    get: (component, state = 'default') => {
      const colors = {
        box: {
          default: isDark ? 'coolGray.900' : 'white',
          card: isDark ? 'coolGray.800' : 'white',
        },
        text: {
          default: isDark ? 'coolGray.100' : 'coolGray.800',
          heading: isDark ? 'white' : 'coolGray.800',
          subtext: isDark ? 'coolGray.400' : 'coolGray.600',
        },
        // Add more components as needed
      };
      
      return colors[component]?.[state] || colors[component]?.default;
    },
    
    // Status-based colors that maintain their meaning in both themes
    status: {
      success: isDark ? 'green.600' : 'green.500',
      error: isDark ? 'red.600' : 'red.500',
      warning: isDark ? 'orange.600' : 'orange.500',
      info: isDark ? 'blue.600' : 'blue.500',
    }
  };
} 