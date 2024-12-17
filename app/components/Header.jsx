import React from "react";
import { HStack, IconButton, Heading, Box } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useNavigation } from "expo-router";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const Header = ({ title, onBackPress, rightComponent }) => {
  const router = useRouter();
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return true;
    } else if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    } else {
      router.back();
      return true;
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      BackHandler.addEventListener("hardwareBackPress", handleBack);

      return () => {
        BackHandler.removeEventListener("hardwareBackPress", handleBack);
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
      />
      <Heading size="md" flex={1} textAlign="center">
        {title}
      </Heading>
      {rightComponent || <Box width={10} />}
    </HStack>
  );
};

export default Header;
