import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  handlePress,
  onGetOwnerUrl,
  onGetProductionUrl,
} from "./utils/ConstantFunctions";
import PinInput from "./PinInput";
import globalStyles from "../styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getOwnerId, getValueFromStorage } from "./utils/getOwnerData";
import newstyles from "./newstyles";
import RemixIcon from "react-native-remix-icon";
import WebService from "./utils/WebService";
import * as SMS from "expo-sms";
import {
  getDeviceToken,
  setupNotifications,
} from "../Screens/utils/notificationUtils";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { handleTokens } from "../services/deviceToken";
import * as Device from "expo-device";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { storeRestaurantConfig } from "./utils/RestaurantConfig";
import { sendTestNotification } from "../services/deviceToken";
import { useToast } from "native-base";
import { saveDeviceSessionId } from "../utils/sessionManager";

const generateRandomToken = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 20;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function VerifyOTPScreen({ navigation, route }) {
  const isWeb = Platform.OS === "web";
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isResendEnabled, setIsResendEnabled] = useState(false);
  const pinInputRef = useRef(null);
  const mobileNumber = route.params.mobile;
  const inputRefs = useRef([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [hasError, setHasError] = useState(false);
  const toast = useToast();

  useEffect(() => {
    console.log("VerifyOTPScreen mounted with route params:", route.params);
  }, []);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleOtpChange = (value, index) => {
    console.log(`OTP digit changed at index ${index}:`, value);

    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      console.log("Invalid input (non-numeric):", value);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    console.log("New OTP array:", newOtp);
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== "" && index < 3) {
      console.log("Moving focus to next input");
      inputRefs.current[index + 1].focus();
    }

    // Check if OTP is complete
    if (index === 3 && value !== "") {
      const completeOtp = newOtp.join("");
      console.log("OTP complete:", completeOtp);
      if (completeOtp.length === 4) {
        handleVerifyOtp(completeOtp);
      }
    }
  };

  const getPushToken = async () => {
    if (!Device.isDevice) {
      console.log("Not a physical device, returning empty token");
      return "";
    }

    try {
      console.log("Starting notification setup...");

      // Initialize notifications first
      await setupNotifications();
      console.log("Notifications setup completed");

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      console.log("Current notification permission status:", existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        console.log("Requesting notification permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("New permission status:", finalStatus);
      }

      if (finalStatus !== "granted") {
        console.warn("Failed to get push notification permission");
        return "";
      }

      console.log("Getting push token...");
      // Use the token handling from deviceToken.js
      const { pushToken } = await handleTokens();
      console.log("Generated push token:", pushToken);

      // Verify token format
      if (!pushToken || typeof pushToken !== "string") {
        console.error("Invalid push token format:", pushToken);
        return "";
      }

      return pushToken;
    } catch (error) {
      console.error("Detailed error getting push token:", error);
      return "";
    }
  };

  const generateDeviceSessionId = () => {
    // Convert platform and model name to alphanumeric only
    const platform = Platform.OS.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const modelName = Device.modelName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase(); // Convert timestamp to base36

    return `${platform}${modelName}${timestamp}`;
  };

  const getOrCreateDeviceId = async () => {
    try {
      // Get the actual hardware device ID that persists across app reinstalls/storage clearing
      let deviceId;
      
      if (Platform.OS === 'android') {
        // On Android, get the Android ID (persists until factory reset)
        deviceId = await Application.androidId;
      } else if (Platform.OS === 'ios') {
        // On iOS, get the identifier for vendor (persists until app is uninstalled)
        deviceId = await Application.getIosIdForVendorAsync();
      } else {
        // Web or other platforms - fall back to a combination of device info
        const deviceName = Device.deviceName || 'unknown';
        const modelName = Device.modelName || 'unknown';
        const osVersion = Device.osVersion || 'unknown';
        deviceId = `${deviceName}-${modelName}-${osVersion}`;
      }
      
      // If we couldn't get a device ID through the platform-specific methods
      if (!deviceId) {
        // Try to get previously stored UUID as fallback
        const storedDeviceId = await AsyncStorage.getItem("device_uuid");
        
        if (storedDeviceId) {
          console.log("Using stored device UUID as fallback:", storedDeviceId);
          return storedDeviceId;
        }
        
        // Last resort - generate a new UUID
        deviceId = uuidv4();
        console.log("Generated new device UUID as last resort:", deviceId);
        await AsyncStorage.setItem("device_uuid", deviceId);
      } else {
        console.log("Using hardware device ID:", deviceId);
        // Store the hardware ID for reference
        await AsyncStorage.setItem("device_uuid", deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error("Error getting hardware device ID:", error);
      // Emergency fallback
      try {
        const fallbackId = `${Device.deviceName || 'device'}-${Date.now()}`;
        console.log("Using emergency fallback device ID:", fallbackId);
        return fallbackId;
      } catch (e) {
        // If all else fails, return a timestamp-based ID
        return `unknown-${Date.now()}`;
      }
    }
  };

  const handleVerifyOtp = async (completeOtp) => {
    if (loading) {
      console.log("Verification already in progress");
      return;
    }

    console.log("Starting verification for OTP:", completeOtp);
    setLoading(true);
    setIsVerifying(true);
    
    // Reset error state
    setHasError(false);
    setOtpError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let pushToken = await getPushToken();
      console.log("Obtained push token for verification:", pushToken);

      const deviceId = await getOrCreateDeviceId();
      const deviceModelName = Device.modelName;
      
      const requestBody = {
        mobile: mobileNumber,
        otp: completeOtp,
        device_id: deviceId,
        device_model: deviceModelName,
        fcm_token: pushToken,
      };

      console.log("Sending verify OTP request:", {
        url: onGetOwnerUrl() + "captain_verify_otp",
        body: requestBody,
      });

      const response = await fetch(onGetOwnerUrl() + "captain_verify_otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const json = await response.json();
      console.log("Full Verification API response:", json);

      if (json.st === 1) {
        console.log("OTP verification successful");
        
        try {
          // 1. Store auth tokens
          await AsyncStorage.setItem("access_token", json.access);
          await AsyncStorage.setItem("refresh_token", json.refresh);
          await AsyncStorage.setItem("device_token", json.device_token);

          // 2. Handle User IDs - Ensuring both backward and forward compatibility
          const userId = json.user_id?.toString();
          const captainId = json.captain_id?.toString();
          
          // Validate IDs
          if (!userId && !captainId) {
            throw new Error("No valid user identification in response");
          }

          // Store primary ID (user_id is primary, captain_id is fallback)
          const primaryUserId = userId || captainId;
          await AsyncStorage.setItem("user_id", primaryUserId);
          
          // Store captain-specific ID if available
          if (captainId) {
            await AsyncStorage.setItem("captain_id", captainId);
          }

          // 3. Store structured data for forward compatibility
          const userIdentification = {
            primary_id: primaryUserId,
            user_id: userId,
            role: json.role || "captain",
            mobile: json.mobile,
            captain_details: captainId ? {
              captain_id: captainId,
              captain_name: json.captain_name || ""
            } : null,
            created_at: new Date().toISOString() // For version tracking
          };
          await AsyncStorage.setItem("user_data", JSON.stringify(userIdentification));

          // Log stored IDs for debugging
          console.log("Stored user identification:", {
            primary_id: primaryUserId,
            user_id: userId,
            captain_id: captainId
          });

          // Store outlet data in both formats
          const outletData = {
            outlet_id: json.outlet_id,
            outlet_name: json.outlet_name || "",
            outlet_mobile: json.mobile,
            outlet_address: json.address,
            config: {
              gst: json.gst,
              service_charges: json.service_charges,
              is_open: json.is_open,
              outlet_status: json.outlet_status,
              order_number_sequence: json.order_number_sequence,
              outlet_address: json.address,
              upi_id: json.upi_id || "",
            },
            metrics: {
              today_sale: json.today_sale || 0,
              today_revenue: json.today_revenue || 0
            }
          };
          
          // Store structured format
          await AsyncStorage.setItem("outlet_data", JSON.stringify(outletData));
          
          // Store current format
          await AsyncStorage.setItem("outlet_id", json.outlet_id?.toString());
          await AsyncStorage.setItem("outlet_name", json.outlet_name || "");
          await AsyncStorage.setItem("outlet_address", json.address || "");
          await AsyncStorage.setItem("outlet_config", JSON.stringify(outletData.config));
          await AsyncStorage.setItem("sales_data", JSON.stringify(outletData.metrics));
          
          // Store UPI ID separately for direct access
          if (json.upi_id) {
            await AsyncStorage.setItem("upi_id", json.upi_id);
            console.log("Stored UPI ID:", json.upi_id);
          }

          // Store settings
          if (json.settings) {
            await AsyncStorage.setItem("app_settings", JSON.stringify(json.settings));
          }

          // Also store mobile separately for easy access if needed
          await AsyncStorage.setItem("outlet_mobile", json.mobile);

          console.log("All data stored successfully in both formats");
        } catch (error) {
          console.error("Error storing user data:", error);
          throw error;
        }

        toast.show({
          title: "Verification Successful",
          description: json.msg || "Logged in successfully",
          status: "success",
          duration: 3000,
        });

        navigation.navigate("RestaurantTables");
      } else {
        console.error("Server returned error:", json.msg);
        setHasError(true);
        setOtpError(json.msg || "Verification failed");
        toast.show({
          title: "Verification Failed",
          description: json.msg || "Please check your OTP and try again",
          status: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setHasError(true);
      setOtpError("Failed to verify OTP. Please try again.");
      toast.show({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!isResendEnabled) return;

    setIsResendEnabled(false);
    setCountdown(15);
    
    // Reset error state on resend
    setHasError(false);
    setOtpError("");

    try {
      const response = await fetch(onGetProductionUrl() + "user_login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobileNumber,
          role: "captain",
        }),
      });

      const json = await response.json();
      if (json.st === 1) {
        // Replace Alert with toast
        toast.show({
          title: "OTP Sent",
          description: "OTP has been sent successfully",
          status: "success",
          duration: 3000,
        });
      } else {
        // Replace Alert with toast
        toast.show({
          title: "Error",
          description: json.msg || "Failed to send OTP",
          status: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      // Replace Alert with toast
      toast.show({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        status: "error",
        duration: 3000,
      });
    }
  };

  const isOtpComplete = () => {
    return otp.every((digit) => digit !== "");
  };

  const getButtonText = () => {
    if (isLoading) return "Reading OTP...";
    if (isVerifying) return "Verifying OTP...";
    return "Verify OTP";
  };

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount <= 1) {
            setIsResendEnabled(true);
            return 0;
          }
          return prevCount - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdown]);

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && !otp[index]) {
      // Move to previous input when backspace is pressed on empty input
      inputRefs.current[index - 1].focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.inner}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </Pressable>
          <Image
            source={require("../assets/icon.png")}
            style={isWeb ? styles.logoWeb : styles.logo}
          />
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.instructions}>
            Enter the OTP sent to your mobile number to verify your account.
          </Text>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={[
                  styles.otpInput,
                  hasError && { borderColor: "#ff0000" }
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                keyboardType="numeric"
                maxLength={1}
                ref={(ref) => (inputRefs.current[index] = ref)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                mode="outlined"
                outlineColor="#ddd"
                activeOutlineColor="#6200ee"
                selectionColor="#6200ee"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                editable={!isVerifying}
                render={(props) => (
                  <TextInput.Icon
                    {...props}
                    style={[
                      props.style,
                      {
                        fontFamily: "monospace",
                        fontSize: 24,
                        textAlign: "center",
                      },
                    ]}
                  />
                )}
              />
            ))}
          </View>
          {hasError && otpError ? (
            <Text style={styles.errorText}>{otpError}</Text>
          ) : null}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!isOtpComplete() || isLoading || isVerifying) &&
                styles.disabledButton,
            ]}
            onPress={() => handleVerifyOtp(otp.join(""))}
            disabled={!isOtpComplete() || isLoading || isVerifying}
          >
            <View style={styles.buttonContent}>
              {(isLoading || isVerifying) && (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.loader}
                />
              )}
              <Text style={styles.buttonText}>{getButtonText()}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.resendContainer}>
            {countdown > 0 ? (
              <Text style={styles.countdown}>
                Resend OTP in {countdown} seconds
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={!isResendEnabled}
                style={styles.resendButton}
              >
                <Text
                  style={[
                    styles.resendText,
                    !isResendEnabled && styles.disabledText,
                  ]}
                >
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
      
      {/* Footer */}
      <View style={styles.footerContainer}>
        <View style={styles.logoRow}>
          <Image
            source={require("../assets/MenuMitraLOGO.png")}
            style={styles.footerLogo}
          />
          <Text style={styles.footerTitle}>MenuMitra</Text>
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() =>
              Linking.openURL(
                "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
              )
            }
          >
            <MaterialCommunityIcons
              name="facebook"
              size={28}
              color="#1877F2"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() =>
              Linking.openURL("https://www.instagram.com/menumitra/")
            }
          >
            <MaterialCommunityIcons
              name="instagram"
              size={28}
              color="#E4405F"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() =>
              Linking.openURL("https://www.youtube.com/@menumitra")
            }
          >
            <MaterialCommunityIcons
              name="youtube"
              size={28}
              color="#FF0000"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => Linking.openURL("https://x.com/MenuMitra")}
          >
            <MaterialCommunityIcons
              name="twitter"
              size={28}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.footerTextContainer}>
          <View style={styles.poweredByContainer}>
            <MaterialCommunityIcons name="flash" size={14} color="#666" />
            <Text style={styles.poweredByText}>Powered by</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://www.shekruweb.com")}
          >
            <Text style={styles.companyText}>
              Shekru Labs India Pvt. Ltd.
            </Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>version 1.3</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 16,
    padding: 8,
    zIndex: 1,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 32,
    resizeMode: "contain",
  },
  logoWeb: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  instructions: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    marginHorizontal: 16,
  },
  pinInput: {
    borderColor: "#020202",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  countdown: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  resendButton: {
    padding: 8,
  },
  resendText: {
    color: "#0dcaf0",
    fontSize: 14,
    fontWeight: "500",
  },
  disabledText: {
    color: "#97E3F3",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 24,
    color: "#000",
    marginHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  verifyButton: {
    backgroundColor: "#0dcaf0",
    padding: 12,
    borderRadius: 25,
    marginTop: 20,
    alignItems: "center",
    width: "70%",
    alignSelf: "center",
    elevation: 3,
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#97E3F3",
    elevation: 0,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  loader: {
    marginRight: 8,
  },
  errorText: {
    color: "#ff0000",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
    textAlign: "center",
  },
  footerContainer: {
    alignItems: "center",
    paddingVertical: 20,
    borderTopColor: "#e0e0e0",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    marginTop: 20,
    width: '100%',
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  footerLogo: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    marginBottom: 5,
  },
  socialIcon: {
    padding: 4,
    marginHorizontal: 8,
  },
  footerTextContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  poweredByContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: "#666666",
  },
  companyText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    textAlign: "center",
  },
  versionText: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
    textAlign: "center",
    paddingBottom: 4,
  },
});
