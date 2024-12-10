import React from "react";
import { HStack, IconButton, Heading, Box } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const Header = ({ title }) => {
  const router = useRouter();

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
        onPress={() => router.back()}
      />
      <Heading size="md" flex={1} textAlign="center">
        {title}
      </Heading>
      <Box width={10} />
    </HStack>
  );
};

export default Header;
