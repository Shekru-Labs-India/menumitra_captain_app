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
} from "native-base";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useVersion } from "../context/VersionContext";
import { Linking, Alert, Keyboard } from "react-native";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function LoginScreen() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const { version } = useVersion();
  const mobileInputRef = useRef(null);

  useEffect(() => {
    checkExistingSession();
    if (mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem("userSession");
      if (sessionData) {
        const { expiryDate } = JSON.parse(sessionData);
        if (new Date(expiryDate) > new Date()) {
          router.replace("/(tabs)");
        } else {
          await AsyncStorage.removeItem("userSession");
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  const validateMobileNumber = (number) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleMobileNumberChange = (text) => {
    const numbersOnly = text.replace(/[^0-9]/g, ""); // Allow only numeric input

    // Reject input if the first digit is between 0 and 5
    if (
      numbersOnly.length === 1 &&
      !["6", "7", "8", "9"].includes(numbersOnly)
    ) {
      setErrorMessage("Mobile number should start with 6, 7, 8 or 9");
      return; // Do not update the input field
    }

    // Clear error messages when input is empty
    if (numbersOnly.length === 0) {
      setMobileNumber(""); // Clear the input field
      setErrorMessage("");
      setApiError("");
      return;
    }

    setMobileNumber(numbersOnly); // Update the state

    // Validate length
    if (numbersOnly.length > 0 && numbersOnly.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
    } else {
      setErrorMessage("");
    }

    // Automatically dismiss the keyboard when the number reaches 10 digits
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
      const response = await fetch(`${API_BASE_URL}/captain_login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobileNumber,
        }),
      });

      const data = await response.json();
      console.log("Complete API Response:", data);

      // Check if st (status) is 1 which indicates success
      if (data && data.st === 1) {
        console.log("Success condition met, proceeding to OTP screen");
        await AsyncStorage.setItem("tempMobile", mobileNumber);

        // Extract OTP from message if present
        const otpMatch = data.msg.match(/\d{4}/);
        if (otpMatch) {
          await AsyncStorage.setItem("currentOtp", otpMatch[0]);
        }

        router.push({ pathname: "/otp", params: { mobile: mobileNumber } });
      } else {
        console.log("Success condition not met, showing error");
        setApiError(data.msg || "This mobile number is not authorized");
      }
    } catch (error) {
      console.error("API Error:", error);
      setApiError(
        "Something went wrong. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <Box flex={1} px={6} justifyContent="center">
        <VStack space={6} alignItems="center" w="100%">
          <Image
            source={require("../assets/images/mm-logo-bg-fill-hat.png")}
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

          <VStack space={4} w="100%">
            <VStack space={2} w="100%">
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
                <Box
                  px={4}
                  py={3}
                  borderRightWidth={1.5}
                  borderRightColor="coolGray.300"
                >
                  <Text fontSize="md" fontWeight="medium" color="coolGray.600">
                    +91
                  </Text>
                </Box>
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
                <Text color="red.500" fontSize="xs" pl={2}>
                  {errorMessage}
                </Text>
              ) : null}
              {apiError ? (
                <Text color="red.500" fontSize="xs" pl={2}>
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
                bg: "coolGray.300",
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

      <Box borderTopWidth={1} borderTopColor="coolGray.200" p={4}>
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
                name="twitter"
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
              version {version || "1.0.0"}
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
