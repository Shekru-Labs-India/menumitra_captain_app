import React from 'react';
import {
  Modal,
  VStack,
  Text,
  Button,
  HStack,
  Icon,
} from "native-base";
import { Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
}) {
  const handleUpdatePress = () => {
    if (isOtaUpdate && onApplyOtaUpdate) {
      onApplyOtaUpdate();
    } else {
      Linking.openURL(storeUrl);
    }
  };

  return (
    <Modal isOpen={isOpen} closeOnOverlayClick={!forceUpdate} size="lg">
      <Modal.Content>
        <Modal.Header>
          {isOtaUpdate ? "Update Available" : "Update Required"}
        </Modal.Header>
        <Modal.Body>
          <VStack space={3}>
            {isOtaUpdate ? (
              <HStack space={2} alignItems="center">
                <Icon
                  as={MaterialCommunityIcons}
                  name="update"
                  size={6}
                  color="blue.600"
                />
                <Text fontSize="md">
                  A new update is ready to install.
                </Text>
              </HStack>
            ) : (
              <Text>
                A new version of {appName} (v{newVersion}) is available. Your current version is v{currentVersion}.
              </Text>
            )}
            <Text fontWeight="bold" color={isOtaUpdate ? "blue.600" : "orange.500"}>
              {isOtaUpdate 
                ? "This update includes bug fixes and performance improvements." 
                : "Please update the app to continue using all features."}
            </Text>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button.Group space={2}>
            {!forceUpdate && onClose && (
              <Button variant="ghost" onPress={onClose}>
                Later
              </Button>
            )}
            <Button 
              colorScheme={isOtaUpdate ? "blue" : "orange"} 
              onPress={handleUpdatePress}
            >
              {isOtaUpdate ? "Install Now" : "Update Now"}
            </Button>
          </Button.Group>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
} 