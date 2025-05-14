import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  Image,
  Input,
  Button,
  Icon,
  Spinner,
  KeyboardAvoidingView,
  Modal,
  Center,
} from "native-base";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useVersion } from "../context/VersionContext";
import { Linking, Alert, Keyboard } from "react-native";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { getBaseUrl } from "../config/api.config";
import * as Updates from "expo-updates";
import { checkForExpoUpdates, isRunningInExpoGo } from "../utils/updateChecker";

export default function LoginScreen() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const { version: appVersion } = useVersion();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [apiVersion, setApiVersion] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const mobileInputRef = useRef(null);
  const [otaUpdateAvailable, setOtaUpdateAvailable] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const [sessionData, userSession] = await AsyncStorage.multiGet([
        "userSession",
        "access",
      ]);

      if (sessionData[1] && userSession[1]) {
        const session = JSON.parse(sessionData[1]);
        if (new Date(session.expiryDate) > new Date()) {
          router.replace("/(tabs)/tables");
          return;
        } else {
          await AsyncStorage.multiRemove([
            "userSession",
            "access",
            "outlet_id",
            "user_id",
            "mobile",
            "captain_id",
            "captain_name",
            "gst",
            "service_charges",
            "sessionToken",
            "expoPushToken",
          ]);
        }
      }

      // Check for both server version requirements and OTA updates
      await Promise.all([
        checkVersion(),
        !isRunningInExpoGo() ? checkOtaUpdates() : Promise.resolve()
      ]);
    } catch (error) {
      console.error("Error during initialization:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Check for over-the-air updates
  const checkOtaUpdates = async () => {
    await checkForExpoUpdates({
      silent: true, // Don't show alerts automatically
      onUpdateAvailable: () => {
        setOtaUpdateAvailable(true);
      }
    });
  };

  // Handle OTA update
  const handleOtaUpdate = async () => {
    try {
      setIsLoading(true);
      await Updates.fetchUpdateAsync();
      Alert.alert(
        "Update Downloaded",
        "The update has been downloaded. The app will now restart to apply the changes.",
        [
          {
            text: "OK",
            onPress: async () => {
              await Updates.reloadAsync();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error downloading update:", error);
      Alert.alert(
        "Error",
        "Failed to download update. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const checkVersion = async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/check_version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_type: 'captain_app' })
      });
      
      const data = await response.json();
      if (data.st === 1) {
        setApiVersion(data.version || '');
        const apiVer = data.version ? data.version.split('.').map(Number) : [0, 0, 0];
        const appVer = appVersion.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
          if (apiVer[i] > appVer[i]) {
            setShowUpdateModal(true);
            break;
          } else if (apiVer[i] < appVer[i]) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error checking version:', error);
    }
  };

  const handleUpdatePress = () => {
    Linking.openURL('https://play.google.com/store/apps/details?id=com.menumitra.captain');
  };

  const validateMobileNumber = (number) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleMobileNumberChange = (text) => {
    const numbersOnly = text.replace(/[^0-9]/g, "");

    if (
      numbersOnly.length === 1 &&
      !["6", "7", "8", "9"].includes(numbersOnly)
    ) {
      setErrorMessage("Mobile number should start with 6, 7, 8 or 9");
      return;
    }

    if (numbersOnly.length === 0) {
      setMobileNumber("");
      setErrorMessage("");
      setApiError("");
      return;
    }

    setMobileNumber(numbersOnly);

    if (numbersOnly.length > 0 && numbersOnly.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
    } else {
      setErrorMessage("");
    }

    if (numbersOnly.length === 10) {
      Keyboard.dismiss();
    }
  };

  const handleSendOtp = async () => {
    if (!validateMobileNumber(mobileNumber)) {
      setApiError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetch(`${getBaseUrl()}/user_login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobileNumber,
        }),
      });

      const data = await response.json();

      if (data && data.st === 1) {
        if (data.role && data.role.toLowerCase() === "captain") {
          await AsyncStorage.setItem("tempMobile", mobileNumber);
          console.log("data", data);

          const otpMatch = data.msg.match(/\d{4}/);
          if (otpMatch) {
            await AsyncStorage.setItem("currentOtp", otpMatch[0]);
          }

          router.push({ pathname: "/otp", params: { mobile: mobileNumber } });
        } else {
          setApiError("Access denied for this role.");
        }
      } else if (data && data.st === 2) {
        setApiError(data.msg || "Your account is inactive. Please contact support.");
      } else {
        setApiError("Your account is inactive. Please contact support.");
      }
    } catch (error) {
      setApiError("An error occurred. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Center flex={1}>
          <VStack space={3} alignItems="center">
            <Image
              source={require("../assets/images/mm-captain-app.png")}
              alt="MenuMitra Logo"
              size="lg"
              resizeMode="contain"
            />
            <Spinner size="lg" color="blue.500" />
            <Text color="coolGray.500">Loading...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      {showUpdateModal && (
        <Modal isOpen={true} closeOnOverlayClick={false} size="lg">
          <Modal.Content>
            <Modal.Header>Update Required</Modal.Header>
            <Modal.Body>
              <VStack space={3}>
                <Text>
                  A new version of MenuMitra Captain (v{apiVersion}) is available. Your current version is v{appVersion}.
                </Text>
                <Text fontWeight="bold" color="orange.500">
                  Please update the app to continue using all features.
                </Text>
              </VStack>
            </Modal.Body>
            <Modal.Footer>
              <Button.Group space={2}>
                <Button colorScheme="orange" onPress={handleUpdatePress}>
                  Update Now
                </Button>
              </Button.Group>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      )}

      <Box flex={1} px={6} justifyContent="center">
        <VStack space={6} alignItems="center" w="100%">
          <Image
            source={require("../assets/images/mm-captain-app.png")}
            alt="MenuMitra Logo"
            size="xl"
            resizeMode="contain"
            mb={2}
          />
          <VStack alignItems="center" space={0}>
            <Text fontSize="4xl" fontWeight="semibold" color="#333">
              MenuMitra
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="#333" mb={4}>
              Captain App
            </Text>
          </VStack>

          {otaUpdateAvailable && (
            <Pressable 
              onPress={handleOtaUpdate}
              py={2} px={4} mb={4}
              bg="blue.100" rounded="md"
              borderWidth={1} borderColor="blue.300"
            >
              <HStack alignItems="center" space={2}>
                <Icon
                  as={MaterialCommunityIcons}
                  name="update"
                  size={5}
                  color="blue.600"
                />
                <Text color="blue.700" fontWeight="medium">
                  Update available! Tap to install
                </Text>
              </HStack>
            </Pressable>
          )}

          <VStack space={4} w="100%">
            <VStack space={2} w="100%">
              <Text
                fontSize="sm"
                fontWeight="medium"
                color="coolGray.700"
                pl={1}
              >
                Enter your mobile number to receive OTP
              </Text>
              <HStack
                space={2}
                alignItems="center"
                w="100%"
                borderWidth={1.5}
                borderColor={
                  errorMessage || apiError ? "red.500" : "coolGray.300"
                }
                borderRadius="xl"
                overflow="hidden"
                bg="white"
              >
                <Input
                  ref={mobileInputRef}
                  flex={1}
                  h={12}
                  px={3}
                  fontSize="md"
                  placeholder="Enter Mobile Number"
                  placeholderTextColor="coolGray.400"
                  keyboardType="numeric"
                  value={mobileNumber}
                  onChangeText={handleMobileNumberChange}
                  maxLength={10}
                  borderWidth={0}
                  _focus={{
                    bg: "transparent",
                  }}
                />
              </HStack>

              {errorMessage ? (
                <Text color="red.500" fontSize="xs" pl={2} textAlign="center" w="100%">
                  {errorMessage}
                </Text>
              ) : null}
              {apiError ? (
                <Text color="red.500" fontSize="xs" pl={2} textAlign="center" w="100%">
                  {apiError}
                </Text>
              ) : null}
            </VStack>

            <Button
              w="100%"
              h={12}
              bg="#007AFF"
              _pressed={{ bg: "#0056b3" }}
              borderRadius="xl"
              isDisabled={isLoading || mobileNumber.length !== 10}
              onPress={handleSendOtp}
              _text={{
                fontSize: "md",
                fontWeight: "semibold",
                color: "white",
              }}
              _disabled={{
                bg: "blue.300",
                _text: { color: "white" },
                opacity: 0.6,
              }}
            >
              {isLoading ? (
                <HStack space={2} alignItems="center">
                  <Spinner color="white" size="sm" />
                  <Text color="white" fontSize="md" fontWeight="semibold">
                    Please wait...
                  </Text>
                </HStack>
              ) : (
                "Send OTP"
              )}
            </Button>
          </VStack>
        </VStack>
      </Box>

      {/* <Box borderTopWidth={1} borderTopColor="coolGray.200" p={4}>
        <VStack space={3} alignItems="center">
          <HStack space={2} alignItems="center">
            <Image
              source={require("../assets/images/mm-logo.png")}
              alt="MenuMitra Logo"
              style={{
                width: 35,
                height: 35,
              }}
              resizeMode="contain"
            />
            <Text fontSize="md" fontWeight="semibold" color="coolGray.700">
              MenuMitra
            </Text>
          </HStack>

          <HStack space={8} justifyContent="center" mt={2}>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
                )
              }
            >
              <Icon
                as={MaterialCommunityIcons}
                name="facebook"
                size={7}
                color="#1877F2"
              />
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL("https://www.instagram.com/menumitra/")
              }
            >
              <Icon
                as={MaterialCommunityIcons}
                name="instagram"
                size={7}
                color="#E4405F"
              />
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL("https://www.youtube.com/@menumitra")
              }
            >
              <Icon
                as={MaterialCommunityIcons}
                name="youtube"
                size={7}
                color="#FF0000"
              />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("https://x.com/MenuMitra")}
            >
              <Icon
                as={MaterialCommunityIcons}
                name="alpha-x"
                size={7}
                color="#000000"
              />
            </Pressable>
          </HStack>

          <VStack space={1} alignItems="center" mt={2} mb={2}>
            <HStack space={1} alignItems="center">
              <Icon
                as={MaterialCommunityIcons}
                name="flash"
                size={3}
                color="gray.500"
              />
              <Text fontSize="xs" color="gray.500">
                Powered by
              </Text>
            </HStack>
            <Pressable
              onPress={() => Linking.openURL("https://www.shekruweb.com")}
            >
              <Text
                fontSize="xs"
                color="#4CAF50"
                fontWeight="medium"
                textAlign="center"
              >
                Shekru Labs India Pvt. Ltd.
              </Text>
            </Pressable>
            <Text fontSize="2xs" color="gray.500" mt={1} textAlign="center">
              version {appVersion || "1.0.0"}
            </Text>
          </VStack>
        </VStack>
      </Box> */}
    </Box>
  );
}
