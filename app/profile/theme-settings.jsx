import React from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Heading,
  IconButton,
  Radio,
  ScrollView,
  useColorMode,
} from "native-base";
import Header from "../components/Header";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { colorMode } = useColorMode();

  return (
    <Box flex={1} bg={colorMode === "dark" ? "coolGray.900" : "white"} safeArea>
      <Header title="Theme Settings" />

      <ScrollView>
        <VStack space={4} p={4}>
          <Heading size="md">Appearance</Heading>
          
          <Radio.Group
            name="themeMode"
            value={mode}
            onChange={value => setMode(value)}
          >
            <VStack space={3}>
              <Box 
                p={4} 
                bg={colorMode === "dark" ? "coolGray.800" : "coolGray.100"} 
                rounded="md"
              >
                <Radio value="light" size="sm">
                  <HStack space={3} alignItems="center">
                    <Icon as={MaterialIcons} name="light-mode" size={5} color="yellow.500" />
                    <Text>Light Mode</Text>
                  </HStack>
                </Radio>
              </Box>
              
              <Box 
                p={4} 
                bg={colorMode === "dark" ? "coolGray.800" : "coolGray.100"} 
                rounded="md"
              >
                <Radio value="dark" size="sm">
                  <HStack space={3} alignItems="center">
                    <Icon as={MaterialIcons} name="dark-mode" size={5} color="indigo.500" />
                    <Text>Dark Mode</Text>
                  </HStack>
                </Radio>
              </Box>
              
              <Box 
                p={4} 
                bg={colorMode === "dark" ? "coolGray.800" : "coolGray.100"} 
                rounded="md"
              >
                <Radio value="system" size="sm">
                  <HStack space={3} alignItems="center">
                    <Icon as={MaterialIcons} name="settings-suggest" size={5} color="gray.500" />
                    <Text>System Default</Text>
                  </HStack>
                </Radio>
              </Box>
            </VStack>
          </Radio.Group>

          <Box 
            mt={6} 
            p={4} 
            bg={colorMode === "dark" ? "coolGray.800" : "coolGray.100"} 
            rounded="md"
          >
            <Text fontSize="sm" color="coolGray.500">
              System Default will automatically switch between Light and Dark mode based on your device settings.
            </Text>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
} 