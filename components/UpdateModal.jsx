import React from 'react';
import {
  Modal,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Box,
  Divider,
  Pressable,
  Center,
  Circle,
} from "native-base";
import { BackHandler, Linking } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

/**
 * Reusable modal component for version update notifications
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isOpen Whether the modal is open
 * @param {Function} props.onClose Function to close the modal (optional for forced updates)
 * @param {string} props.currentVersion Current app version
 * @param {string} props.newVersion New version available
 * @param {string} props.appName App name to display (default: "MenuMitra Captain")
 * @param {string} props.storeUrl App store URL
 * @param {boolean} props.forceUpdate Whether the update is mandatory (no dismiss option)
 * @param {boolean} props.isOtaUpdate Whether this is an OTA update via Expo
 * @param {Function} props.onApplyOtaUpdate Function to apply OTA update (required if isOtaUpdate is true)
 * @param {string} props.supportPhone Support phone number
 * @param {string} props.supportEmail Support email
 */
export default function UpdateModal({
  isOpen,
  onClose,
  currentVersion,
  newVersion,
  appName = "MenuMitra Captain",
  storeUrl = "https://play.google.com/store/apps/details?id=com.menumitra.captain",
  forceUpdate = false,
  isOtaUpdate = false,
  onApplyOtaUpdate,
  supportPhone = "+91 9527279639",
  supportEmail = "menumitra.info@gmail.com",
}) {
  const handleUpdatePress = () => {
    if (isOtaUpdate && onApplyOtaUpdate) {
      onApplyOtaUpdate();
    } else {
      Linking.openURL(storeUrl);
    }
  };

  const handleExitPress = () => {
    BackHandler.exitApp();
  };

  // OTA Update has a simplified UI
  if (isOtaUpdate) {
    return (
      <Modal isOpen={isOpen} closeOnOverlayClick={!forceUpdate} size="lg">
        <Modal.Content borderRadius="xl">
          <Modal.Body p={6}>
            <VStack space={5} alignItems="center">
              <Circle size={16} bg="blue.100">
                <Icon
                  as={MaterialCommunityIcons}
                  name="update"
                  size={8}
                  color="blue.600"
                />
              </Circle>
              
              <Text fontSize="xl" fontWeight="bold" textAlign="center">
                Update Available
              </Text>
              
              <Text fontSize="md" textAlign="center" color="gray.600">
                A new update is ready to install. This update includes bug fixes and performance improvements.
              </Text>
              
              <Button.Group width="100%" space={3} mt={2}>
                {!forceUpdate && onClose && (
                  <Button 
                    flex={1} 
                    variant="outline" 
                    colorScheme="blue" 
                    onPress={onClose}
                    borderRadius="full"
                    height={12}
                  >
                    Later
                  </Button>
                )}
                <Button 
                  flex={1} 
                  colorScheme="blue" 
                  onPress={handleUpdatePress}
                  borderRadius="full"
                  height={12}
                >
                  Install Now
                </Button>
              </Button.Group>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
  }

  // Store Update has a richer UI
  return (
    <Modal isOpen={isOpen} closeOnOverlayClick={false} size="lg">
      <Modal.Content borderRadius="xl" maxW="400px">
        <Box p={6}>
          <VStack space={5} alignItems="center">
            {/* Header */}
            <VStack alignItems="center" space={3}>
              <Icon
                as={MaterialCommunityIcons}
                name="refresh"
                size={12}
                color="#FF9A6C"
              />
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                Update Required
              </Text>
            </VStack>

            {/* Version Info */}
            <Box 
              bg="gray.50" 
              width="100%" 
              p={5} 
              borderRadius="xl"
            >
              {/* Current Version */}
              <HStack justifyContent="space-between" alignItems="center" mb={2}>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="smartphone"
                    size={5}
                    color="gray.600"
                  />
                  <Text fontSize="md" color="gray.600">Current Version</Text>
                </HStack>
                <Text fontSize="md" fontWeight="bold">
                  {currentVersion}
                </Text>
              </HStack>
              
              <Divider my={2} />
              
              {/* Available Version */}
              <HStack justifyContent="space-between" alignItems="center" mt={2}>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="arrow-upward"
                    size={5}
                    color="#FF9A6C"
                  />
                  <Text fontSize="md" color="gray.600">Available Version</Text>
                </HStack>
                <Text fontSize="md" fontWeight="bold" color="#FF9A6C">
                  {newVersion}
                </Text>
              </HStack>
            </Box>

            {/* Update Message */}
            <Text fontSize="md" textAlign="center" color="gray.600">
              A new version is available in the store. You must update the app to continue using it.
            </Text>

            {/* Support Info */}
            <Box 
              bg="gray.50" 
              width="100%" 
              p={4} 
              borderRadius="xl"
            >
              <Text fontSize="sm" color="gray.600" mb={3} textAlign="center">
                Need help? Contact support:
              </Text>
              
              <Pressable 
                bg="white"
                borderRadius="lg"
                p={3}
                mb={2}
                shadow={1}
                onPress={() => Linking.openURL(`tel:${supportPhone}`)}
              >
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="phone"
                    size={4}
                    color="gray.600"
                  />
                  <Text fontSize="sm" color="gray.600">{supportPhone}</Text>
                </HStack>
              </Pressable>
              
              <Pressable 
                bg="white"
                borderRadius="lg"
                p={3}
                shadow={1}
                onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
              >
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="mail"
                    size={4}
                    color="gray.600"
                  />
                  <Text fontSize="sm" color="gray.600">{supportEmail}</Text>
                </HStack>
              </Pressable>
            </Box>

            {/* Buttons */}
            <VStack width="100%" space={3}>
              <Button
                height={12}
                borderRadius="full"
                _text={{ fontWeight: "bold" }}
                leftIcon={<Icon as={MaterialIcons} name="play-arrow" size={5} color="white" />}
                bg="#FF9A6C"
                _pressed={{ bg: "#E08C61" }}
                onPress={handleUpdatePress}
              >
                Update Now
              </Button>
              
              {forceUpdate && (
                <Button
                  height={12}
                  borderRadius="full"
                  _text={{ fontWeight: "bold" }}
                  leftIcon={<Icon as={MaterialIcons} name="close" size={5} color="white" />}
                  colorScheme="red"
                  onPress={handleExitPress}
                >
                  Exit App
                </Button>
              )}
            </VStack>
          </VStack>
        </Box>
      </Modal.Content>
    </Modal>
  );
} 