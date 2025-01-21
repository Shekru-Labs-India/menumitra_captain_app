import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Image,
  Icon,
  Pressable,
} from "native-base";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useRef, useEffect } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Keyboard } from "react-native";
import { router } from "expo-router";
import { Linking } from "react-native";
import { useVersion } from "../context/VersionContext";
import {
  getDeviceToken,
  generateUniqueToken,
  invalidateOldSessions,
  checkTokenStatus,
  handleTokens,
} from "../services/DeviceTokenService";
import { useToast } from "native-base";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function OtpScreen() {
  const [otp, setOtp] = useState(["1", "2", "3", "4"]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const otpInputs = useRef([]);
  const params = useLocalSearchParams();
  const mobileNumber = params.mobile;
  const navigation = useNavigation();
  const { version } = useVersion();
  const [timerKey, setTimerKey] = useState(0);
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem("userSession");
      if (sessionData) {
        const { expiryDate } = JSON.parse(sessionData);
        if (new Date(expiryDate) > new Date()) {
          router.replace("/(tabs)");
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (otpInputs.current[0]) {
        otpInputs.current[0].focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerKey]);

  const resetTimer = () => {
    setTimer(30); // Reset the timer to 30 seconds
    setCanResend(false); // Disable resend until timer expires
  };

  const formatMobileNumber = (number) => {
    if (!number) return "";
    const cleaned = number.toString().replace(/\D/g, "");
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3");
  };

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value !== "") {
      if (index < 3) {
        otpInputs.current[index + 1].focus();
      } else {
        Keyboard.dismiss();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (index > 0 && otp[index] === "") {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpInputs.current[index - 1].focus();
      }
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

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

      if (data && data.st === 1) {
        setOtp(["", "", "", ""]);
        setError("");
        setTimer(30);
        setCanResend(false);
        setTimerKey((prev) => prev + 1); // Force timer reset
        otpInputs.current[0].focus();

        // Extract and store new OTP if present
        const otpMatch = data.msg.match(/\d{4}/);
        if (otpMatch) {
          await AsyncStorage.setItem("currentOtp", otpMatch[0]);
        }
      } else {
        setError(data.msg || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP Error:", error);
      setError("Failed to resend OTP. Please try again.");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setError("");
      setIsLoading(true);

      // Show loading state
      toast.show({
        description: "Verifying OTP and initializing device...",
        status: "info",
        duration: 2000,
      });

      // First verify OTP with your API
      const response = await fetch(
        "https://men4u.xyz/captain_api/captain_verify_otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobile: mobileNumber,
            otp: otp.join(""),
          }),
        }
      );

      const data = await response.json();
      console.log("OTP verification response:", data);

      if (data.st === 1) {
        // OTP is valid, now handle device tokens
        console.log("OTP verified, generating tokens...");

        // Check if this is a new installation
        const activeSession = await AsyncStorage.getItem("activeSession");
        const isNewInstall = !activeSession;

        // Generate/update tokens
        const tokens = await handleTokens(isNewInstall);
        if (!tokens) {
          throw new Error("Failed to initialize device tokens");
        }

        console.log("Tokens generated successfully:", tokens);

        // Store user data
        await AsyncStorage.multiSet([
          ["outlet_id", data.outlet_id.toString()],
          ["user_id", data.user_id.toString()],
          ["mobile", mobileNumber],
        ]);

        // Show success message
        toast.show({
          description: "Login successful!",
          status: "success",
          duration: 2000,
        });

        // Navigate to main screen
        router.replace("/(tabs)");
      } else {
        throw new Error(data.msg || "Invalid OTP");
      }
    } catch (error) {
      console.error("Login error:", error);

      // Show appropriate error message
      let errorMessage = error.message;
      if (error.message.includes("notification")) {
        errorMessage = "Please enable notifications to continue";
      }

      setError(errorMessage);
      toast.show({
        description: errorMessage,
        status: "error",
        duration: 3000,
      });

      // Clear OTP fields on error
      setOtp(["", "", "", ""]);
      if (otpInputs.current[0]) {
        otpInputs.current[0].focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <HStack
        w="100%"
        px={4}
        py={3}
        alignItems="center"
        justifyContent="space-between"
        bg="coolGray.100"
      >
        <Pressable onPress={() => navigation.goBack()}>
          <Icon
            as={MaterialIcons}
            name="arrow-back"
            size={6}
            color="gray.600"
          />
        </Pressable>
        <Text fontSize="lg" fontWeight="bold" color="#333">
          Verify OTP
        </Text>
        <Box w={6} />
      </HStack>

      <Box flex={1} px={6} justifyContent="center">
        <VStack space={6} alignItems="center" w="100%">
          <Image
            source={require("../assets/images/mm-logo-bg-fill-hat.png")}
            alt="MenuMitra Logo"
            size="xl"
            resizeMode="contain"
            mb={0}
          />

          <VStack space={1} alignItems="center" mb={2}>
            <Text fontSize="md" color="coolGray.600" textAlign="center">
              Enter OTP sent to
            </Text>
            <Text
              fontSize="md"
              fontWeight="bold"
              color="coolGray.600"
              textAlign="center"
            >
              {formatMobileNumber(mobileNumber)}
            </Text>
          </VStack>

          <HStack space={2} justifyContent="center" mb={4}>
            {[0, 1, 2, 3].map((index) => (
              <Input
                key={index}
                ref={(ref) => (otpInputs.current[index] = ref)}
                w={12}
                h={12}
                textAlign="center"
                fontSize="xl"
                keyboardType="numeric"
                maxLength={1}
                value={otp[index]}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                borderWidth={1.5}
                borderColor={otp[index] ? "#007AFF" : "#ddd"}
                bg={otp[index] ? "#F0F8FF" : "#fff"}
                _focus={{
                  borderColor: "#007AFF",
                  bg: "transparent",
                }}
                selectTextOnFocus
              />
            ))}
          </HStack>

          {error ? (
            <Text color="red.500" fontSize="xs" mb={4}>
              {error}
            </Text>
          ) : null}

          <Button
            w="80%"
            h={12}
            bg="#007AFF"
            _pressed={{ bg: "#0056b3" }}
            borderRadius="lg"
            isDisabled={otp.some((digit) => !digit)}
            onPress={handleVerifyOtp}
            _text={{
              fontSize: "md",
              fontWeight: "bold",
              color: "white",
            }}
            _disabled={{
              bg: "coolGray.300",
              _text: {
                color: "gray.500",
              },
            }}
          >
            Verify OTP
          </Button>

          <HStack justifyContent="center" mt={0}>
            {!canResend ? (
              <Text color="coolGray.600" fontSize="sm">
                Resend OTP in <Text fontWeight="bold">{timer}s</Text>
              </Text>
            ) : (
              <Button variant="link" onPress={handleResendOtp}>
                <Text color="#007AFF" fontSize="sm" fontWeight="bold">
                  Resend OTP
                </Text>
              </Button>
            )}
          </HStack>
        </VStack>
      </Box>

      <Box borderTopWidth={1} borderTopColor="coolGray.200" p={0}>
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
