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
  
  handleTokens,
  formatAlphanumericToken,
  testNotification,
} from "../services/DeviceTokenService";
import { useToast } from "native-base";
import { Platform } from "react-native";
import { getBaseUrl } from "../config/api.config";
import { useAuth } from "../context/AuthContext";

export default function OtpScreen() {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(15);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const otpInputs = useRef([]);
  const params = useLocalSearchParams();
  const mobileNumber = params.mobile;
  const navigation = useNavigation();
  const { version } = useVersion();
  const [timerKey, setTimerKey] = useState(0);
  const toast = useToast();
  const { login } = useAuth();

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

  const generateFallbackToken = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 20; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleVerifyOtp = async () => {
    try {
      setError("");
      setIsLoading(true);
      setIsVerifying(true);
      setLoadingMessage("Verifying OTP...");

      await new Promise((resolve) => setTimeout(resolve, 1500));
      setLoadingMessage("Generating device tokens...");

      const tokenData = await handleTokens(false);
      const cleanPushToken = tokenData.pushToken;

      setLoadingMessage("Connecting to server...");
      const requestBody = {
        mobile: mobileNumber,
        otp: otp.join(""),
        device_sessid: tokenData.sessionToken,
        fcm_token: cleanPushToken,
      };

      const response = await fetch(
        // "https://menusmitra.xyz/captain_api/captain_verify_otp",  //production
        "https://men4u.xyz/captain_api/captain_verify_otp", //development

        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (data.st === 1) {
        setLoadingMessage("Login successful! Redirecting...");

        // Store session data
        const sessionData = {
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          userId: data.user_id,
          captainId: data.captain_id,
          outletId: data.outlet_id,
        };
        await AsyncStorage.setItem("userSession", JSON.stringify(sessionData));

        // Store the tokens and other data
        const dataToStore = [
          ["outlet_id", data.outlet_id?.toString() || ""],
          ["user_id", data.user_id?.toString() || ""],
          ["mobile", mobileNumber],
          ["captain_id", data.captain_id?.toString() || ""],
          ["captain_name", data.captain_name || ""],
          ["gst", data.gst?.toString() || "0"],
          ["service_charges", data.service_charges?.toString() || "0"],
          ["sessionToken", tokenData.sessionToken.toString()],
          ["expoPushToken", tokenData.pushToken.toString()],
          ["device_token", data.device_token?.toString() || ""],
          ["access", data.access || ""],
          ["app_settings", JSON.stringify(data.settings || {})]
        ];

        await AsyncStorage.multiSet(dataToStore);

        // Call auth context login
        await login(data);

        toast.show({
          description: "Login successful!",
          status: "success",
          duration: 2000,
        });

        router.replace("/(tabs)");
      } else {
        throw new Error(data.msg || "Invalid OTP");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setError(error.message || "Verification failed");
      toast.show({
        description: error.message || "Verification failed. Please try again.",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
      setLoadingMessage("");
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      setIsLoading(true);
      setLoadingMessage("Resending OTP...");

      const response = await fetch(`${getBaseUrl()}/user_login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobileNumber,
          role: "captain",
        }),
      });

      const data = await response.json();

      if (data && data.st === 1) {
        setOtp(["", "", "", ""]);
        setError("");
        setTimer(15);
        setCanResend(false);
        setTimerKey((prev) => prev + 1);

        toast.show({
          description: "OTP sent successfully!",
          status: "success",
          duration: 2000,
        });

        // Restart OTP listener after a short delay
        setTimeout(() => {
          resetTimer();
        }, 1000);
      } else {
        setError(data.msg || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP Error:", error);
      setError("Failed to resend OTP. Please try again.");
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
            <Text fontSize="md" color="coolGray.600" textAlign="center">to verify your account</Text>
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
                color="black"
                _focus={{
                  borderColor: "#007AFF",
                  backgroundColor: "transparent",
                }}
                _pressed={{
                  backgroundColor: "transparent",
                }}
                _hover={{
                  backgroundColor: "transparent",
                }}
                cursorColor="#007AFF"
                selectTextOnFocus={false}
                selectionColor="transparent"
                style={{
                  backgroundColor: "transparent",
                }}
                variant="unstyled"
                bgColor="transparent"
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
            isLoading={isVerifying}
            onPress={() => handleVerifyOtp()}
            _text={{
              fontSize: "md",
              fontWeight: "bold",
              color: "white",
            }}
            _disabled={{
              bg: "coolGray.300",
              _text: {
                color: "white",
              },
            }}
            _loading={{
              _text: {
                color: "white",
              },
              spinnerPlacement: "start",
            }}
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
          </Button>

          <HStack justifyContent="center" mt={0}>
            {!canResend ? (
              <Text color="coolGray.600" fontSize="sm">
                Resend OTP in{" "}
                <Text color="#007AFF" fontWeight="bold">
                  {timer}s
                </Text>
              </Text>
            ) : (
              <Button
                variant="link"
                onPress={() => {
                  setTimer(15);
                  setCanResend(false);
                  handleResendOtp();
                }}
                _text={{
                  color: "#007AFF",
                  fontSize: "sm",
                  fontWeight: "bold",
                }}
              >
                Resend OTP
              </Button>
            )}
          </HStack>
        </VStack>
      </Box>

      {/* <Box borderTopWidth={1} borderTopColor="coolGray.200" p={0}>
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
      </Box> */}
    </Box>
  );
}
