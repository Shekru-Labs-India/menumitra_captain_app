import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { TextInput, Text } from "react-native-paper";
import axios from "axios";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import DateTimePicker from "@react-native-community/datetimepicker";



const AddWaiter = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: "",
    mobile_number: "",
    address: "",
    aadhar_number: "",
    dob: "",
    email: "",
  });

  const [errors, setErrors] = useState({
    name: "",
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());

  const validateField = (fieldName, value) => {
    const nameRegex = /^[A-Za-z ]+$/;
    const mobileRegex = /^[6-9]\d{9}$/;
    const aadharRegex = /^\d{12}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (fieldName) {
      case "name":
        return nameRegex.test(value)
          ? ""
          : "Name should only contain alphabets and spaces.";
      case "mobile_number":
        if (!value) return "Mobile number is required.";
        if (value.length !== 10) return "Mobile number should be 10 digits.";
        if (!mobileRegex.test(value))
          return "Mobile number should start with 6-9.";
        return "";
      case "aadhar_number":
        if (!value) return "Aadhar number is required.";
        if (value.length !== 12) return "Aadhar number should be 12 digits.";
        if (!/^\d+$/.test(value))
          return "Aadhar number should only contain digits.";
        return "";
      case "address":
        if (!value) return "";
        if (value.trim().length < 5)
          return "Address should be at least 5 characters long.";
        return "";
      case "dob":
        return "";
      case "email":
        if (!value) return "";
        if (!emailRegex.test(value)) return "Please enter a valid email address.";
        return "";
      default:
        return "";
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData({ ...formData, [fieldName]: value });

    // Validate the field and clear the error if the value is valid
    const error = validateField(fieldName, value);
    setErrors((prevErrors) => ({ ...prevErrors, [fieldName]: error }));
  };

  const validateForm = () => {
    let formErrors = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        formErrors[field] = error;
      }
    });

    setErrors(formErrors);

    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const [restaurantId, accessToken, userId] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
        AsyncStorage.getItem("user_id"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "waiter_create",
        {
          outlet_id: restaurantId,
          user_id: userId || "",
          name: formData.name,
          mobile: formData.mobile_number,
          address: formData.address,
          aadhar_number: formData.aadhar_number,
          dob: formData.dob,
          email: formData.email,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Waiter added successfully");
        navigation.replace("WaiterList"); // Refresh current page or replace with WaiterList
      } else {
        Alert.alert("Error", response.data.msg || "Failed to add waiter");
      }
    } catch (error) {
      console.error("Error adding waiter:", error);
      Alert.alert("Error", "Failed to add waiter");
    } finally {
      setLoading(false);
    }
  };

  const validateWaiterName = (text) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setErrors((prev) => ({ ...prev, name: "Waiter name is required" }));
      return false;
    }

    if (trimmedText.length < 3) {
      setErrors((prev) => ({
        ...prev,
        name: "Name must be at least 3 characters",
      }));
      return false;
    }

    // Allow only letters and spaces
    if (!/^[a-zA-Z\s]+$/.test(trimmedText)) {
      setErrors((prev) => ({
        ...prev,
        name: "Only letters and spaces allowed",
      }));
      return false;
    }

    setErrors((prev) => ({ ...prev, name: "" }));
    return true;
  };

  const onDateChange = (event, selectedDate) => {
    // On Android, pressing "cancel" will pass a null selectedDate
    // On iOS, we need to handle the dismiss action separately
    
    // First hide the date picker on Android (iOS handled by buttons)
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    // Only update if a date was actually selected
    if (selectedDate) {
      // Format the date to match the API requirement (e.g., "12 Jan 2023")
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
      
      // Update the form data with the formatted date
      setFormData({ ...formData, dob: formattedDate });
      
      // Also update the date picker date state
      setDatePickerDate(selectedDate);
      
      // Validate the field
      const error = validateField("dob", formattedDate);
      setErrors((prevErrors) => ({ ...prevErrors, dob: error }));
    }
  };

  const handleShowDatePicker = () => {
    // Always ensure we have a valid date object before showing the picker
    if (formData.dob) {
      try {
        // Try to parse the existing date if available
        const parts = formData.dob.split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(parts[1]);
          const year = parseInt(parts[2], 10);
          
          if (!isNaN(day) && month !== -1 && !isNaN(year)) {
            setDatePickerDate(new Date(year, month, day));
          } else {
            setDatePickerDate(new Date()); // Default to today
          }
        } else {
          setDatePickerDate(new Date()); // Default to today
        }
      } catch (e) {
        console.log("Error parsing date:", e);
        setDatePickerDate(new Date()); // Default to today
      }
    } else {
      // No date selected yet, use today's date
      setDatePickerDate(new Date());
    }
    
    // Show the picker
    setShowDatePicker(true);
  };

  return (
    <>
      <CustomHeader title="Add Waiter" />
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
            style={[styles.input, errors.name && styles.errorInput]}
            onChangeText={(text) => {
              // Only allow letters and spaces
              const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
              handleInputChange("name", formattedText);
              validateWaiterName(formattedText);
            }}
            error={!!errors.name}
            theme={{
              colors: {
                error: "red",
              },
            }}
            maxLength={50}
            placeholder="Enter waiter name"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput
            mode="outlined"
            maxLength={10}
            label={
              <Text>
                <Text style={styles.required}>*</Text> Mobile Number
              </Text>
            }
            value={formData.mobile_number}
            style={styles.input}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, "");

              // Check first digit (6-9 only)
              if (numericText.length === 1) {
                if (!["6", "7", "8", "9"].includes(numericText)) {
                  return; // Don't update if first digit is not 6-9
                }
              }

              handleInputChange("mobile_number", numericText);
            }}
            error={!!errors.mobile_number}
            theme={{
              colors: {
                error: "red",
              },
            }}
            keyboardType="numeric"
          />

          {errors.mobile_number && (
            <Text style={styles.errorText}>{errors.mobile_number}</Text>
          )}

          <TextInput
            mode="outlined"
            label="Address"
            value={formData.address}
            style={[styles.input, styles.textArea]}
            onChangeText={(text) => {
              handleInputChange("address", text);
              // Real-time validation as user types
              const error = validateField("address", text);
              setErrors((prev) => ({ ...prev, address: error }));
            }}
            error={!!errors.address}
            numberOfLines={4}
            multiline={true}
            theme={{
              colors: {
                error: "red",
              },
            }}
          />
          {errors.address && (
            <Text style={styles.errorText}>{errors.address}</Text>
          )}

          <TextInput
            mode="outlined"
            maxLength={12}
            label={
              <Text>
                <Text style={styles.required}>*</Text> Aadhar Number
              </Text>
            }
            value={formData.aadhar_number}
            style={styles.input}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, "");
              handleInputChange("aadhar_number", numericText);
            }}
            error={!!errors.aadhar_number}
            theme={{
              colors: {
                error: "red",
              },
            }}
            keyboardType="numeric"
          />
          {errors.aadhar_number && (
            <Text style={styles.errorText}>{errors.aadhar_number}</Text>
          )}

          <TextInput
            mode="outlined"
            label="Email"
            value={formData.email}
            style={styles.input}
            onChangeText={(text) => {
              handleInputChange("email", text);
            }}
            error={!!errors.email}
            theme={{
              colors: {
                error: "red",
              },
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          <TouchableOpacity onPress={handleShowDatePicker}>
            <TextInput
              mode="outlined"
              label="Date of Birth"
              value={formData.dob}
              style={styles.input}
              editable={false}
              right={<TextInput.Icon name="calendar" />}
              error={!!errors.dob}
              theme={{
                colors: {
                  error: "red",
                },
              }}
            />
          </TouchableOpacity>
          {errors.dob && (
            <Text style={styles.errorText}>{errors.dob}</Text>
          )}

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
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Add Waiter</Text>
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
  textArea: {
    height: 100, // Adjust height as needed
    textAlignVertical: "top", // Ensures text starts at the top
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  errorText: {
    color: "red",
    marginBottom: 12,
    fontSize: 12,
  },
  button: {
    backgroundColor: "#0dcaf0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorInput: {
    borderColor: "red",
  },
});

export default AddWaiter;
