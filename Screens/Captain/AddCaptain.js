import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { TextInput, Button, Text, Switch } from "react-native-paper";
import axios from "axios";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetProductionUrl, onGetOwnerUrl } from "../utils/ConstantFunctions";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import { IconButton } from "react-native-paper";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import DateTimePicker from "@react-native-community/datetimepicker";

const AddCaptain = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
    aadhar_number: "",
    dob: "",
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Add date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());

  // Add date picker handlers
  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
      setFormData({ ...formData, dob: formattedDate });
      setDatePickerDate(selectedDate);
    }
  };

  const handleShowDatePicker = () => {
    setDatePickerDate(new Date());
    setShowDatePicker(true);
  };

  const validate = () => {
    const newErrors = {};

    // Updated name validation with length checks
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    } else if (formData.name.trim().length > 20) {
      newErrors.name = "Name cannot exceed 20 characters";
    } else if (!/^[A-Za-z\s]+$/.test(formData.name)) {
      newErrors.name = "Name can only contain letters and spaces";
    }

    // Mobile validation - exactly 10 digits
    if (!formData.mobile) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile number must be exactly 10 digits";
    }

    // Aadhar validation - exactly 12 digits
    if (!formData.aadhar_number) {
      newErrors.aadhar_number = "Aadhar number is required";
    } else if (!/^\d{12}$/.test(formData.aadhar_number)) {
      newErrors.aadhar_number = "Aadhar number must be exactly 12 digits";
    }

    // Add email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const [restaurantId,getUserid, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}captain_create`,
        {
          ...formData,
          outlet_id: restaurantId,
          user_id: getUserid,
          dob: formData.dob || "",
          email: formData.email || "",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Captain added successfully", [
          {
            text: "OK",
            onPress: () => {
              // Navigate back and trigger refresh
              navigation.navigate("CaptainList", { refresh: true });
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to add captain");
      }
    } catch (error) {
      console.error("Error adding captain:", error);
      Alert.alert("Error", "Failed to add captain");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (text) => {
    // Only allow letters and spaces, convert to title case
    const formattedText = text
      .replace(/[^A-Za-z\s]/g, "")
      .replace(/\s+/g, " ") // Remove extra spaces
      .trim() // Remove leading/trailing spaces
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    if (formattedText.length <= 20) {
      // Max length check
      setFormData({ ...formData, name: formattedText });
      if (errors.name) setErrors({ ...errors, name: null });
    }
  };

  const handleMobileChange = (text) => {
    // Only allow numbers and check for valid starting digit
    if (text.length <= 10 && /^\d*$/.test(text)) {
      if (
        text.length === 0 ||
        !["0", "1", "2", "3", "4", "5"].includes(text.charAt(0))
      ) {
        setFormData({ ...formData, mobile: text });
        if (errors.mobile) setErrors({ ...errors, mobile: null });
      }
    }
  };

  const handleAddressChange = (text) => {
    // Allow alphanumeric characters and basic punctuation
    const formattedText = text.replace(/[^\w\s,.-]/g, "").replace(/\s+/g, " "); // Remove extra spaces

    setFormData({ ...formData, address: formattedText });
    if (errors.address) setErrors({ ...errors, address: null });
  };

  const handleAadharChange = (text) => {
    // Only allow numbers
    if (text.length <= 12 && /^\d*$/.test(text)) {
      setFormData({ ...formData, aadhar_number: text });
      if (errors.aadhar_number) setErrors({ ...errors, aadhar_number: null });
    }
  };

  return (
    <>
      <CustomHeader title="Add Captain" />
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Name
              </Text>
            }
            value={formData.name}
            style={styles.input}
            onChangeText={handleNameChange}
            error={!!errors.name}
            placeholder="Enter Name"
            autoCapitalize="words"
            maxLength={20}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Mobile Number
              </Text>
            }
            value={formData.mobile}
            style={styles.input}
            onChangeText={handleMobileChange}
            keyboardType="number-pad"
            error={!!errors.mobile}
            maxLength={10}
            placeholder="Enter mobile number"
          />
          {errors.mobile && (
            <Text style={styles.errorText}>{errors.mobile}</Text>
          )}

          <TextInput
            mode="outlined"
            label={
              <Text>
                Address
              </Text>
            }
            value={formData.address}
            style={styles.input}
            onChangeText={handleAddressChange}
            error={!!errors.address}
            multiline
            placeholder="Enter address"
          />
          {errors.address && (
            <Text style={styles.errorText}>{errors.address}</Text>
          )}

          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Aadhar Number
              </Text>
            }
            value={formData.aadhar_number}
            style={styles.input}
            onChangeText={handleAadharChange}
            keyboardType="number-pad"
            error={!!errors.aadhar_number}
            maxLength={12}
            placeholder="Enter Aadhar number"
          />
          {errors.aadhar_number && (
            <Text style={styles.errorText}>{errors.aadhar_number}</Text>
          )}

          <TextInput
            mode="outlined"
            label="Email"
            value={formData.email}
            style={styles.input}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            error={!!errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TouchableOpacity onPress={handleShowDatePicker}>
            <TextInput
              mode="outlined"
              label="Date of Birth"
              value={formData.dob}
              style={styles.input}
              editable={false}
              right={<TextInput.Icon name="calendar" />}
            />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={datePickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? "spinner" : "default"}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <RemixIcon
              name="checkbox-circle-line"
              size={20}
              color="#fff" // Ensures the icon color is white
              style={styles.icon} // Ensures any other styling is applied correctly
            />
            <Text style={styles.buttonText}>
              {loading ? "Adding Captain..." : "Add Captain"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 16,
  },
  required: {
    color: "red",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#0dcaf0",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50, // Makes the button fully rounded
    flexDirection: "row", // Ensures the icon and text are aligned horizontally
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  icon: {
    marginRight: 8,
    color: "white", // Adds space between the icon and text
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#cccccc",
  },
});

export default AddCaptain;
