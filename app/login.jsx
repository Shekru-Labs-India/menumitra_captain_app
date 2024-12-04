import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing session on mount
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
    // Only allow digits
    const numbersOnly = text.replace(/[^0-9]/g, "");

    // If it's the first digit, check if it's between 6-9
    if (
      numbersOnly.length === 1 &&
      !["6", "7", "8", "9"].includes(numbersOnly)
    ) {
      Alert.alert(
        "Invalid Number",
        "Mobile number should start with 6, 7, 8 or 9",
        [{ text: "OK" }]
      );
      return;
    }

    setMobileNumber(numbersOnly);
  };

  const handleSendOtp = async () => {
    if (!validateMobileNumber(mobileNumber)) {
      Alert.alert(
        "Invalid Number",
        "Please enter a valid 10-digit mobile number",
        [{ text: "OK" }]
      );
      return;
    }

    setIsLoading(true);

    try {
      const allowedNumbers = ["9876543210", "8459719119"];

      if (allowedNumbers.includes(mobileNumber)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Store mobile number in AsyncStorage
        await AsyncStorage.setItem("tempMobile", mobileNumber);

        router.push({
          pathname: "/otp",
          params: { mobile: mobileNumber },
        });
      } else {
        Alert.alert("Access Denied", "This mobile number is not authorized", [
          { text: "OK" },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("../assets/images/mm-logo-bg-fill-hat.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>MenuMitra</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor="#666"
            keyboardType="numeric"
            maxLength={10}
            value={mobileNumber}
            onChangeText={handleMobileNumberChange}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleSendOtp}
          disabled={isLoading || mobileNumber.length !== 10}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? "Please wait..." : "Send OTP"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    color: "#333",
  },
  inputContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
  },
  prefix: {
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#333",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    paddingVertical: 15,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  loginButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginButtonDisabled: {
    backgroundColor: "#ccc",
  },
});
