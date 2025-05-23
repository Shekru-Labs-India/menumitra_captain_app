import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import axios from "axios";
import newstyles from "../newstyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native"; // Import CommonActions for navigation reset

import { getUserId } from "../utils/getOwnerData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RemixIcon from "react-native-remix-icon";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomTabBar from "../CustomTabBar";
import DateTimePickerAndroid from "@react-native-community/datetimepicker";
import CustomHeader from "../../components/CustomHeader";
import DateTimePicker from "@react-native-community/datetimepicker";
import axiosInstance from "../../utils/axiosConfig";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function MyProfile({ navigation }) {
  const [profileData, setProfileData] = useState({
    name: "",
    dob: "",
    email: "",
    mobile_number: "",
    aadhar_number: "",
    created_on: "",
    updated_on: "",
  });

  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mobileError, setMobileError] = useState("");

  const [selectedDate, setSelectedDate] = useState(null);

  const [errors, setErrors] = useState({
    name: "",
    mobile_number: "",
    email: "",
    aadhar_number: "",
  });

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";

    let date;
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      // First check if the date is already in "DD MMM YYYY" format
      const dateFormatRegex =
        /^\d{2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}$/;
      if (dateFormatRegex.test(dateString)) {
        const [day, month, year] = dateString.split(" ");
        const monthIndex = months.findIndex((m) => m === month);
        if (monthIndex !== -1) {
          date = new Date(year, monthIndex, parseInt(day));
        } else {
          return "";
        }
      } else {
        date = new Date(dateString);
      }
    }

    if (isNaN(date.getTime())) {
      return "";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  };

  const formatAPIDate = (displayDate) => {
    if (!displayDate) return "";
    
    // Parse the display date (DD MMM YYYY)
    const [day, monthStr, year] = displayDate.split(" ");
    
    // Convert month name to month number (1-12)
    const monthIndex = months.indexOf(monthStr) + 1;
    const monthFormatted = monthIndex.toString().padStart(2, '0');
    
    // Format as YYYY-MM-DD
    return `${year}-${monthFormatted}-${day}`;
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(Platform.OS === "ios");

    if ((Platform.OS === 'android' && event.type === 'set') || Platform.OS === 'ios') {
      if (selected) {
        setSelectedDate(selected);
        const day = String(selected.getDate()).padStart(2, "0");
        const month = months[selected.getMonth()];
        const year = selected.getFullYear();
        const formattedDate = `${day} ${month} ${year}`;

        setProfileData((prev) => ({
          ...prev,
          dob: formattedDate,
        }));
      }
    }

    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userId, accessToken] = await Promise.all([
          getUserId(),
          AsyncStorage.getItem("access_token"),
        ]);

        const response = await axiosInstance.post(
          onGetProductionUrl() + "view_profile_detail",
          { user_id: userId },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Profile Response:", response.data);

        if (response.data.st === 1 && response.data.Data?.user_details) {
          const userData = response.data.Data.user_details;
          
          // Set the initial date from API response
          if (userData.dob) {
            // Parse the date whether it's YYYY-MM-DD or DD MMM YYYY
            let initialDate;
            if (userData.dob.includes('-')) {
              const [year, month, day] = userData.dob.split('-');
              initialDate = new Date(year, parseInt(month) - 1, parseInt(day));
            } else {
              const [day, month, year] = userData.dob.split(' ');
              const monthIndex = months.indexOf(month);
              initialDate = new Date(year, monthIndex, parseInt(day));
            }
            if (!isNaN(initialDate.getTime())) {
              setSelectedDate(initialDate);
            }
          }

          setProfileData({
            name: userData.name || "",
            dob: userData.dob || "",
            email: userData.email || "",
            mobile_number: userData.mobile_number || "",
            aadhar_number: userData.aadhar_number || "",
            created_on: userData.created_on || "",
            updated_on: userData.updated_on || "",
          });
        } else {
          Alert.alert(
            "Error",
            response.data.msg || "Failed to fetch profile details."
          );
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        Alert.alert("Error", "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    // Validate all required fields
    let isValid = true;
    const newErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    }

    if (!profileData.mobile_number.trim()) {
      newErrors.mobile_number = "Mobile number is required";
      isValid = false;
    } else if (!validateMobileNumber(profileData.mobile_number)) {
      newErrors.mobile_number = "Please enter a valid 10-digit mobile number";
      isValid = false;
    }

    if (!profileData.aadhar_number.trim()) {
      newErrors.aadhar_number = "Aadhar number is required";
      isValid = false;
    } else if (!validateAadhar(profileData.aadhar_number)) {
      newErrors.aadhar_number = "Please enter a valid 12-digit Aadhar number";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      return;
    }

    try {
      const [userId, accessToken] = await Promise.all([
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_profile_detail",
        {
          ...profileData,
          user_id: userId,
          update_user_id: userId,
          dob: profileData.dob || "",  // Send the date as is since it's already in correct format
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        await AsyncStorage.setItem("owner_name", profileData.name);
        Alert.alert("Success", "Profile updated successfully.", [
          {
            text: "OK",
            onPress: () => {
              // First navigate to MainScreen
              setTimeout(() => {
                navigation.navigate("MyProfileView"); // Then navigate to MyProfile
              }, 100);
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleInputChange = (key, value) => {
    setProfileData({ ...profileData, [key]: value });
  };

  const validateName = (text) => {
    return /^[a-zA-Z\s]{3,50}$/.test(text);
  };

  const validateMobile = (number) => {
    return /^[6-9]\d{9}$/.test(number);
  };

  const validateEmail = (email) => {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const validateAadhar = (number) => {
    return /^\d{12}$/.test(number);
  };

  const validateMobileNumber = (number) => {
    return /^[6-9]\d{9}$/.test(number);
  };

  return (
    <>
      <CustomHeader title="Edit Profile" />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#0dcaf0" />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <RemixIcon name="user-3-line" size={24} color="#0dcaf0" />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>

              <View style={styles.formContainer}>
                <TextInput
                  label="Name *"
                  value={profileData.name}
                  onChangeText={(text) => {
                    // Only allow letters and spaces
                    const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
                    handleInputChange("name", formattedText);

                    if (!formattedText.trim()) {
                      setErrors((prev) => ({
                        ...prev,
                        name: "Name is required",
                      }));
                    } else if (formattedText.length < 3) {
                      setErrors((prev) => ({
                        ...prev,
                        name: "Name must be at least 3 characters",
                      }));
                    } else if (!validateName(formattedText)) {
                      setErrors((prev) => ({
                        ...prev,
                        name: "Only letters and spaces allowed",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, name: "" }));
                    }
                  }}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors.name}
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}

                <TextInput
                  label="Date Of Birth"
                  value={profileData.dob}
                  mode="outlined"
                  style={styles.input}
                  onPressIn={showDatePickerModal}
                  showSoftInputOnFocus={false}
                  right={
                    <TextInput.Icon
                      icon="calendar"
                      onPress={showDatePickerModal}
                    />
                  }
                  editable={true}
                />

                <TextInput
                  label="Email"
                  value={profileData.email}
                  onChangeText={(text) => {
                    handleInputChange("email", text);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Aadhar Number *"
                  value={profileData.aadhar_number}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    handleInputChange("aadhar_number", numericValue);

                    if (!numericValue) {
                      setErrors((prev) => ({
                        ...prev,
                        aadhar_number: "Aadhar number is required",
                      }));
                    } else if (!validateAadhar(numericValue)) {
                      setErrors((prev) => ({
                        ...prev,
                        aadhar_number: "Enter valid 12-digit Aadhar number",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, aadhar_number: "" }));
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={12}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors.aadhar_number}
                />
                {errors.aadhar_number && (
                  <Text style={styles.errorText}>{errors.aadhar_number}</Text>
                )}

                <Button
                  mode="contained"
                  onPress={handleUpdateProfile}
                  style={styles.updateButton}
                >
                  Update Profile
                </Button>
              </View>
            </View>
          </ScrollView>
        )}

        <CustomTabBar />

        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={selectedDate || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            style={Platform.OS === "ios" ? styles.iosDatePicker : undefined}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  formContainer: {
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  required: {
    color: "red",
    marginRight: 2,
  },
  label: {
    fontSize: 14,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 8,
  },
  updateButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#0dcaf0",
  },
  iosDatePicker: {
    width: "100%",
    backgroundColor: "white",
  },
});
