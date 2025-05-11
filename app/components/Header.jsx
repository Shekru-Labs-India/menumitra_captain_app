import React from "react";
import { HStack, IconButton, Heading, Box, useColorMode } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useNavigation, usePathname } from "expo-router";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const Header = ({ title, onBackPress, rightComponent }) => {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const { colorMode } = useColorMode();

  const handleBack = () => {
    try {
      // If custom back handler is provided, use it
      if (onBackPress) {
        onBackPress();
        return true;
      }

      // Try navigation.goBack() first for previous screen
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }

      // If can't go back, navigate to home screen
      router.push("/(tabs)/");
      return true;
    } catch (error) {
      console.error("Back navigation error:", error);
      // Final fallback - go to home screen
      router.push("/(tabs)/");
      return true;
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBack
      );

      return () => {
        backHandler.remove();
      };
    }, [handleBack])
  );

  return (
    <Box 
      bg={colorMode === 'dark' ? 'coolGray.900' : 'white'} 
      pb={2}
      pt={2}
      px={0}
      shadow={2}
      borderBottomWidth={1}
      borderBottomColor={colorMode === 'dark' ? 'coolGray.800' : 'coolGray.200'}
    >
      <HStack
        justifyContent="space-between"
        alignItems="center"
      >
        <IconButton
          icon={
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color={colorMode === 'dark' ? "#E0E0E0" : "gray"} 
            />
          }
          onPress={handleBack}
          _pressed={{
            bg: colorMode === 'dark' ? 'coolGray.800' : 'coolGray.100',
          }}
        />
        <Heading 
          size="md" 
          flex={1} 
          textAlign="center"
          color={colorMode === 'dark' ? 'white' : 'coolGray.800'}
        >
          {title}
        </Heading>
        {rightComponent || <Box width={10} />}
      </HStack>
    </Box>
  );
};

export default Header;
