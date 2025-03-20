import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { extendTheme, useColorModeValue, useColorMode } from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhance the customTheme with more component styles
const customTheme = extendTheme({
  config: {
    // This tells NativeBase to use the colorMode directly
    useSystemColorMode: false,
    initialColorMode: 'light',
  },
  // Add these global styles for all components
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'coolGray.900' : 'white',
        color: props.colorMode === 'dark' ? 'coolGray.100' : 'coolGray.800',
      },
      // This applies to all text elements
      text: {
        color: props.colorMode === 'dark' ? 'coolGray.100' : 'coolGray.800',
      },
      // This applies to all box elements
      box: {
        bg: props.colorMode === 'dark' ? 'coolGray.900' : 'white',
      },
    }),
  },
  colors: {
    // Keep your existing colors and add more
    primary: {
      50: '#e6f2ff',
      100: '#b8daff',
      200: '#8ac2ff',
      300: '#5caaff',
      400: '#2e92ff',
      500: '#0891b2', // Your app's primary color
      600: '#0070e0',
      700: '#0052a3',
      800: '#003566',
      900: '#001a33',
    },
    // Theme-specific colors
    background: {
      light: '#FFFFFF',
      dark: '#121212',
    },
    card: {
      light: '#F5F5F5',
      dark: '#1E1E1E',
    },
    cardBorder: {
      light: '#E5E5E5',
      dark: '#2C2C2C',
    },
    text: {
      light: '#000000',
      dark: '#FFFFFF',
    },
    subtext: {
      light: '#666666',
      dark: '#A0A0A0',
    },
    headerBg: {
      light: '#FFFFFF',
      dark: '#1A1A1A',
    },
    divider: {
      light: '#E5E5E5',
      dark: '#2C2C2C',
    },
  },
  components: {
    // Base components that appear everywhere
    Box: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.900' : 'white',
      }),
      variants: {
        card: (props) => ({
          bg: props.colorMode === 'dark' ? 'coolGray.800' : 'white',
          borderColor: props.colorMode === 'dark' ? 'coolGray.700' : 'coolGray.200',
          borderWidth: 1,
          rounded: 'md',
          shadow: props.colorMode === 'dark' ? '0' : '2',
        }),
        header: (props) => ({
          bg: props.colorMode === 'dark' ? 'coolGray.900' : 'white',
          borderBottomWidth: 1,
          borderBottomColor: props.colorMode === 'dark' ? 'coolGray.800' : 'coolGray.200',
        }),
      },
    },
    ScrollView: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.900' : 'white',
      }),
    },
    Text: {
      baseStyle: (props) => ({
        color: props.colorMode === 'dark' ? 'coolGray.100' : 'coolGray.800',
      }),
      variants: {
        heading: (props) => ({
          color: props.colorMode === 'dark' ? 'white' : 'coolGray.800',
          fontWeight: 'bold',
        }),
        subtext: (props) => ({
          color: props.colorMode === 'dark' ? 'coolGray.400' : 'coolGray.600',
          fontSize: 'sm',
        }),
      },
    },
    Heading: {
      baseStyle: (props) => ({
        color: props.colorMode === 'dark' ? 'white' : 'coolGray.800',
      }),
    },
    Input: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.800' : 'white',
        borderColor: props.colorMode === 'dark' ? 'coolGray.700' : 'coolGray.300',
        color: props.colorMode === 'dark' ? 'white' : 'coolGray.800',
        placeholderTextColor: props.colorMode === 'dark' ? 'coolGray.500' : 'coolGray.400',
        _focus: {
          borderColor: 'primary.500',
          bg: props.colorMode === 'dark' ? 'coolGray.700' : 'white',
        },
      }),
    },
    TextArea: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.800' : 'white',
        borderColor: props.colorMode === 'dark' ? 'coolGray.700' : 'coolGray.300',
        color: props.colorMode === 'dark' ? 'white' : 'coolGray.800',
        _focus: {
          borderColor: 'primary.500',
          bg: props.colorMode === 'dark' ? 'coolGray.700' : 'white',
        },
      }),
    },
    Button: {
      baseStyle: {
        rounded: 'md',
      },
      defaultProps: {
        colorScheme: 'primary',
      },
    },
    IconButton: {
      baseStyle: (props) => ({
        _icon: {
          color: props.colorMode === 'dark' ? 'coolGray.400' : 'coolGray.500',
        },
        _pressed: {
          bg: props.colorMode === 'dark' ? 'coolGray.800' : 'coolGray.100',
        },
      }),
    },
    Pressable: {
      baseStyle: (props) => ({
        _pressed: {
          bg: props.colorMode === 'dark' ? 'coolGray.800' : 'coolGray.100',
        },
      }),
    },
    HStack: {
      baseStyle: (props) => ({
        // Most HStacks don't need background, only set if variant is specified
      }),
      variants: {
        header: (props) => ({
          bg: props.colorMode === 'dark' ? 'coolGray.900' : 'white',
          borderBottomWidth: 1,
          borderBottomColor: props.colorMode === 'dark' ? 'coolGray.800' : 'coolGray.200',
        }),
      },
    },
    VStack: {
      baseStyle: (props) => ({
        // Most VStacks don't need background, only set if variant is specified
      }),
      variants: {
        card: (props) => ({
          bg: props.colorMode === 'dark' ? 'coolGray.800' : 'white',
          p: 4,
          rounded: 'md',
          shadow: props.colorMode === 'dark' ? 'none' : '2',
          borderWidth: props.colorMode === 'dark' ? 1 : 0,
          borderColor: props.colorMode === 'dark' ? 'coolGray.700' : 'transparent',
        }),
      },
    },
    Modal: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.800' : 'white',
        _backdrop: {
          bg: 'coolGray.900:alpha.70',
        },
      }),
    },
    Divider: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.700' : 'coolGray.200',
      }),
    },
    Badge: {
      baseStyle: (props) => ({
        _text: {
          color: props.colorMode === 'dark' ? 'coolGray.100' : 'coolGray.800',
        },
      }),
      variants: {
        subtle: (props) => ({
          bg: props.colorMode === 'dark' ? `${props.colorScheme || 'coolGray'}.900` : `${props.colorScheme || 'coolGray'}.100`,
          _text: {
            color: props.colorMode === 'dark' ? `${props.colorScheme || 'coolGray'}.200` : `${props.colorScheme || 'coolGray'}.800`,
          },
        }),
      },
    },
    FormControl: {
      baseStyle: (props) => ({
        _text: {
          color: props.colorMode === 'dark' ? 'coolGray.300' : 'coolGray.700',
        },
      }),
    },
    // Common UI patterns in your app
    Card: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.800' : 'white',
        p: 4,
        rounded: 'md',
        shadow: props.colorMode === 'dark' ? 'none' : '2',
        borderWidth: props.colorMode === 'dark' ? 1 : 0,
        borderColor: props.colorMode === 'dark' ? 'coolGray.700' : 'transparent',
      }),
    },
    ListItem: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'coolGray.800' : 'white',
        borderColor: props.colorMode === 'dark' ? 'coolGray.700' : 'coolGray.200',
        _pressed: {
          bg: props.colorMode === 'dark' ? 'coolGray.700' : 'coolGray.100',
        },
      }),
    },
    // Add more component theme overrides as needed
  },
});

// Create context
export const ThemeContext = createContext({
  mode: 'system',
  setMode: () => {},
  toggleColorMode: () => {},
});

// Theme provider component
export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState('system'); // 'light', 'dark', or 'system'
  const { setColorMode } = useColorMode();

  // Load saved theme preference
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('themeMode');
        if (savedMode) {
          setMode(savedMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadSavedTheme();
  }, []);

  // Save theme preference when it changes
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem('themeMode', mode);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    };
    
    saveTheme();
  }, [mode]);

  // Get effective color mode based on selection
  const effectiveColorMode = mode === 'system' ? systemColorScheme : mode;

  // Toggle between light/dark (not system)
  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  // Sync with NativeBase's color mode system
  useEffect(() => {
    setColorMode(effectiveColorMode);
  }, [effectiveColorMode, setColorMode]);

  const contextValue = {
    mode,
    setMode,
    toggleColorMode,
    effectiveColorMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to access theme context
export const useTheme = () => useContext(ThemeContext);

// Helper hook to easily get color based on current theme
export const useThemeColor = (lightColor, darkColor) => {
  const { effectiveColorMode } = useTheme();
  return effectiveColorMode === 'dark' ? darkColor : lightColor;
};

export default customTheme; 