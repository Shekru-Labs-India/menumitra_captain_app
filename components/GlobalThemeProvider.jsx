import React from 'react';
import { useColorMode } from 'native-base';
import { StatusBar } from 'expo-status-bar';

export default function GlobalThemeProvider({ children }) {
  const { colorMode } = useColorMode();
  
  return (
    <>
      <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
} 