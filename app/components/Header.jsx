import React from "react";
import { HStack, IconButton, Heading } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const Header = ({ title }) => {
  const router = useRouter();

  return (
    <HStack
      alignItems="center"
      justifyContent="space-between"
      px={4}
      py={2}
      borderBottomWidth={1}
      borderBottomColor="coolGray.200"
      bg="white"
    >
      <IconButton
        icon={
          <MaterialIcons name="arrow-back" size={24} color="gray" /> // Changed color to gray
        }
        onPress={() => router.back()}
        variant="ghost"
        _pressed={{ bg: "gray.100" }}
        position="absolute"
        left={0}
        zIndex={1}
      />
      <Heading size="md" flex={1} textAlign="center">
        {title}
      </Heading>
    </HStack>
  );
};

export default Header;
