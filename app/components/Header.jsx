import React from "react";
import { HStack, IconButton, Heading, Box } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useNavigation, usePathname } from "expo-router";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const Header = ({ title, onBackPress, rightComponent }) => {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();

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
      router.push("/(tabs)/home");
      return true;
    } catch (error) {
      console.error("Back navigation error:", error);
      // Final fallback - go to home screen
      router.push("/(tabs)/home");
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
    <HStack
      px={4}
      py={3}
      justifyContent="space-between"
      alignItems="center"
      bg="white"
      shadow={2}
    >
      <IconButton
        icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
        onPress={handleBack}
        _pressed={{
          bg: "coolGray.100",
        }}
      />
      <Heading size="md" flex={1} textAlign="center">
        {title}
      </Heading>
      {rightComponent || <Box width={10} />}
    </HStack>
  );
};

export default Header;
