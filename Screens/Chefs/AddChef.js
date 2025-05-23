import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import axios from "axios";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import CustomHeader from "../../components/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import DateTimePicker from "@react-native-community/datetimepicker";

const validateName = (text) => {
  return /^[a-zA-Z\s]*$/.test(text);
};

const validateMobile = (number) => {
  return /^[6-9]\d{9}$/.test(number);
};

const validateAadhar = (number) => {
  return /^\d{12}$/.test(number);
};

const validateAddress = (text) => {
  return /^[a-zA-Z0-9\s,.-]*$/.test(text);
};

const AddChef = ({ navigation, route }) => {
  const { onRefresh } = route.params; // Get the refresh callback

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());
  const [errors, setErrors] = useState({
    name: "",
    mobile: "",
    address: "",
    aadharNumber: "",
    email: "",
  });

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
      setDob(formattedDate);
      setDatePickerDate(selectedDate);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: "",
      mobile: "",
      address: "",
      aadharNumber: "",
      email: "",
    };

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    } else if (!validateName(name)) {
      newErrors.name = "Name should only contain letters and spaces";
      isValid = false;
    }

    // Mobile validation
    if (!mobile) {
      newErrors.mobile = "Mobile number is required";
      isValid = false;
    } else if (!validateMobile(mobile)) {
      newErrors.mobile =
        "Enter a valid 10-digit mobile number starting with 6-9";
      isValid = false;
    }

    // Address validation
   

    // Aadhar validation
    if (!aadharNumber) {
      newErrors.aadharNumber = "Aadhar number is required";
      isValid = false;
    } else if (!validateAadhar(aadharNumber)) {
      newErrors.aadharNumber = "Enter a valid 12-digit Aadhar number";
      isValid = false;
    }

    // Email validation
    if (email && !email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      console.log("Submitting chef with data:", {
        outlet_id: restaurantId,
        user_id: userId,
        update_user_id: userId,
        name: name.trim(),
        mobile: mobile,
        address: address.trim(),
        aadhar_number: aadharNumber,
        email: email.trim() || "",
        dob: dob || "",
      });

      const response = await axiosInstance.post(
        onGetProductionUrl() + "chef_create",
        {
          outlet_id: restaurantId,
          user_id: userId,
          update_user_id: userId,
          name: name.trim(),
          mobile: mobile,
          address: address.trim(),
          aadhar_number: aadharNumber,
          email: email.trim() || "",
          dob: dob || "",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Chef Create Response:",
        JSON.stringify(response.data, null, 2)
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Chef added successfully", [
          {
            text: "OK",
            onPress: () => {
              onRefresh(); // Call the refresh function
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to add chef");
      }
    } catch (error) {
      console.error("Error adding chef:", error);
      console.error("Error response:", error.response?.data);
      Alert.alert(
        "Error",
        error.response?.data?.msg || "Failed to add chef. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CustomHeader title="Add Chef" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            label="Name *"
            value={name}
            onChangeText={(text) => {
              const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
              setName(formattedText);
              setErrors((prev) => ({ ...prev, name: "" }));
            }}
            style={[styles.input, errors.name && styles.errorInput]}
            error={!!errors.name}
            mode="outlined"
            activeOutlineColor="#0dcaf0"
          />
          {errors.name ? (
            <Text style={styles.errorText}>{errors.name}</Text>
          ) : null}

          <TextInput
            label="Mobile Number *"
            value={mobile}
            onChangeText={(text) => {
              const numericText = text.replace(/[^0-9]/g, "");
              if (
                numericText.length === 1 &&
                !["6", "7", "8", "9"].includes(numericText)
              ) {
                return;
              }
              setMobile(numericText);
              setErrors((prev) => ({ ...prev, mobile: "" }));
            }}
            keyboardType="numeric"
            style={[styles.input, errors.mobile && styles.errorInput]}
            error={!!errors.mobile}
            mode="outlined"
            activeOutlineColor="#0dcaf0"
            maxLength={10}
          />
          {errors.mobile ? (
            <Text style={styles.errorText}>{errors.mobile}</Text>
          ) : null}

          <TextInput
            label="Address *"
            value={address}
            onChangeText={(text) => {
              const formattedText = text.replace(/[^a-zA-Z0-9\s,.-]/g, "");
              setAddress(formattedText);
              setErrors((prev) => ({ ...prev, address: "" }));
            }}
            style={[styles.input, errors.address && styles.errorInput]}
            error={!!errors.address}
            mode="outlined"
            activeOutlineColor="#0dcaf0"
            multiline
          />
          {errors.address ? (
            <Text style={styles.errorText}>{errors.address}</Text>
          ) : null}

          <TextInput
            label="Aadhar Number *"
            value={aadharNumber}
            onChangeText={(text) => {
              const numericText = text.replace(/[^0-9]/g, "");
              setAadharNumber(numericText);
              setErrors((prev) => ({ ...prev, aadharNumber: "" }));
            }}
            keyboardType="numeric"
            style={[styles.input, errors.aadharNumber && styles.errorInput]}
            error={!!errors.aadharNumber}
            mode="outlined"
            activeOutlineColor="#0dcaf0"
            maxLength={12}
          />
          {errors.aadharNumber ? (
            <Text style={styles.errorText}>{errors.aadharNumber}</Text>
          ) : null}

          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            style={styles.input}
            mode="outlined"
            activeOutlineColor="#0dcaf0"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
              label="Date of Birth"
              value={dob}
              style={styles.input}
              mode="outlined"
              activeOutlineColor="#0dcaf0"
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

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
            buttonColor="#0dcaf0"
          >
            Add Chef
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
  },
  errorInput: {
    borderColor: "#dc3545",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
});

export default AddChef;
