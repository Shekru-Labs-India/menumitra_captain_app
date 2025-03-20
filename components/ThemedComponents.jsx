import React from 'react';
import { useColorMode } from 'native-base';
import { Box, Text, HStack, VStack, ScrollView, Pressable } from 'native-base';

// Themed screen container
export const ThemedContainer = ({ children, safeArea = true, ...props }) => {
  const { colorMode } = useColorMode();
  return (
    <Box 
      flex={1} 
      bg={colorMode === 'dark' ? 'coolGray.900' : 'white'} 
      safeArea={safeArea}
      {...props}
    >
      {children}
    </Box>
  );
};

// Themed header
export const ThemedHeader = ({ children, ...props }) => {
  const { colorMode } = useColorMode();
  return (
    <HStack
      px={4}
      py={3}
      alignItems="center"
      bg={colorMode === 'dark' ? 'coolGray.900' : 'white'}
      borderBottomWidth={1}
      borderBottomColor={colorMode === 'dark' ? 'coolGray.800' : 'coolGray.200'}
      {...props}
    >
      {children}
    </HStack>
  );
};

// Themed card
export const ThemedCard = ({ children, ...props }) => {
  const { colorMode } = useColorMode();
  return (
    <Box
      bg={colorMode === 'dark' ? 'coolGray.800' : 'white'}
      p={4}
      rounded="md"
      shadow={colorMode === 'dark' ? 'none' : '2'}
      borderWidth={colorMode === 'dark' ? 1 : 0}
      borderColor={colorMode === 'dark' ? 'coolGray.700' : 'transparent'}
      {...props}
    >
      {children}
    </Box>
  );
};

// Themed scroll view
export const ThemedScrollView = ({ children, ...props }) => {
  const { colorMode } = useColorMode();
  return (
    <ScrollView
      bg={colorMode === 'dark' ? 'coolGray.900' : 'white'}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

// Themed divider
export const ThemedDivider = ({ ...props }) => {
  const { colorMode } = useColorMode();
  return (
    <Box
      height="1px"
      bg={colorMode === 'dark' ? 'coolGray.700' : 'coolGray.200'}
      {...props}
    />
  );
};

// Themed text
export const ThemedText = ({ variant, children, ...props }) => {
  const { colorMode } = useColorMode();
  
  let textStyle = {
    color: colorMode === 'dark' ? 'coolGray.100' : 'coolGray.800',
  };
  
  if (variant === 'subtext') {
    textStyle.color = colorMode === 'dark' ? 'coolGray.400' : 'coolGray.600';
    textStyle.fontSize = 'sm';
  }
  
  if (variant === 'heading') {
    textStyle.color = colorMode === 'dark' ? 'white' : 'coolGray.800';
    textStyle.fontWeight = 'bold';
  }
  
  return (
    <Text {...textStyle} {...props}>
      {children}
    </Text>
  );
};

// Themed list item
export const ThemedListItem = ({ children, onPress, ...props }) => {
  const { colorMode } = useColorMode();
  return (
    <Pressable
      onPress={onPress}
      _pressed={{
        bg: colorMode === 'dark' ? 'coolGray.700' : 'coolGray.200',
      }}
      {...props}
    >
      <Box
        p={4}
        bg={colorMode === 'dark' ? 'coolGray.800' : 'white'}
        borderBottomWidth={1}
        borderBottomColor={colorMode === 'dark' ? 'coolGray.700' : 'coolGray.200'}
      >
        {children}
      </Box>
    </Pressable>
  );
}; 