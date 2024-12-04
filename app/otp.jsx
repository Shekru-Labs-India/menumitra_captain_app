import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OtpScreen() {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const otpInputs = useRef([]);
  const params = useLocalSearchParams();
  const mobileNumber = params.mobile;

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
  }, []);

  const resetTimer = () => {
    setTimer(30);
    setCanResend(false);
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

    if (value && index < 3) {
      otpInputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1].focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    setOtp(["", "", "", ""]);
    resetTimer();
    setError("");
    otpInputs.current[0].focus();
    // Add your resend OTP logic here
  };

  const handleVerifyOtp = async () => {
    if (otp.some((digit) => !digit)) {
      setError("Please enter complete OTP");
      return;
    }

    const enteredOtp = otp.join("");
    if (enteredOtp === "1234") {
      try {
        // Create session with 30-day expiry
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const sessionData = {
          mobile: mobileNumber,
          expiryDate: thirtyDaysFromNow.toISOString(),
        };

        await AsyncStorage.setItem("userSession", JSON.stringify(sessionData));
        router.replace("/(tabs)");
      } catch (error) {
        console.error("Error saving session:", error);
        setError("Failed to save session. Please try again.");
      }
    } else {
      setError("Invalid OTP. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.content,
          Platform.OS === "android" && { marginTop: StatusBar.currentHeight },
        ]}
      >
        <Image
          source={require("../assets/images/mm-logo-bg-fill-hat.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Verify OTP</Text>

        <Text style={styles.otpText}>
          Enter OTP sent to{"\n"}
          <Text style={styles.mobileText}>
            {formatMobileNumber(mobileNumber)}
          </Text>
        </Text>

        <View style={styles.otpContainer}>
          {[0, 1, 2, 3].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => (otpInputs.current[index] = ref)}
              style={[
                styles.otpInput,
                otp[index] && styles.otpInputFilled,
                error && styles.otpInputError,
              ]}
              keyboardType="numeric"
              maxLength={1}
              value={otp[index]}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectionColor="#007AFF"
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.verifyButton,
            otp.some((digit) => !digit) && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerifyOtp}
          disabled={otp.some((digit) => !digit)}
        >
          <Text style={styles.verifyButtonText}>Verify OTP</Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          {!canResend ? (
            <Text style={styles.resendText}>
              Resend OTP in <Text style={styles.timerText}>{timer}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResendOtp}>
              <Text style={styles.resendButton}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  otpText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 24,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  otpInputFilled: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  otpInputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  verifyButton: {
    width: "80%",
    height: 48,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    alignSelf: "center",
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: "#A2A2A2",
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    justifyContent: "center",
  },
  resendText: {
    color: "#666",
    fontSize: 14,
  },
  resendButton: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  mobileText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 17,
  },
  timerText: {
    fontWeight: "600",
    color: "#007AFF",
  },
});
