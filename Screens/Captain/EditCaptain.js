import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator, // Import ActivityIndicator
  Alert,
  Platform,
} from "react-native";
import { TextInput, Text } from "react-native-paper";
import axios from "axios";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Switch } from "react-native-paper";
import { getUserId } from "../utils/getOwnerData";

const EditCaptain = ({ route, navigation }) => {
  const { captain } = route.params;
  const [formData, setFormData] = useState({
    name: "",
    mobile_number: "",
    address: "",
    aadhar_number: "",
    dob: "",
    email: "",
    is_active: false,
  });

  const [errors, setErrors] = useState({
    name: "",
    mobile_number: "",
    address: "",
    aadhar_number: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Show toast message
  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  // Handle status update separately
 

  // Fetch captain details from View API
  const fetchCaptainDetails = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "captain_view",
        {
          outlet_id: captain.outlet_id,
          user_id: captain.user_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const { name, mobile, aadhar_number, address, email, dob, is_active } = response.data.data;
        setFormData({
          ...formData,
          name,
          mobile_number: mobile,
          aadhar_number,
          address,
          email: email || "",
          dob: dob || "",
          is_active: is_active === true || is_active === 1,
        });
      } else {
        console.log("Error: Failed to fetch captain details");
      }
    } catch (error) {
      console.error("Error fetching captain details:", error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchCaptainDetails();
    // Set initial date picker value from captain data
    if (captain.dob) {
      const [day, month, year] = captain.dob.split(' ');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = months.indexOf(month);
      if (monthIndex !== -1) {
        setDatePickerDate(new Date(year, monthIndex, parseInt(day)));
      }
    }
  }, []);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCaptainDetails();
    setRefreshing(false);
  };

  // Add input handlers with proper validation
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
      if (errors.name) setErrors({ ...errors, name: "" });
    }
  };

  const handleMobileChange = (text) => {
    // Only allow numbers and check for valid starting digit
    if (text.length <= 10 && /^\d*$/.test(text)) {
      if (
        text.length === 0 ||
        !["0", "1", "2", "3", "4", "5"].includes(text.charAt(0))
      ) {
        setFormData({ ...formData, mobile_number: text });
        if (errors.mobile_number) setErrors({ ...errors, mobile_number: "" });
      }
    }
  };

  const handleAddressChange = (text) => {
    // Allow alphanumeric characters and basic punctuation
    const formattedText = text.replace(/[^\w\s,.-]/g, "").replace(/\s+/g, " "); // Remove extra spaces

    setFormData({ ...formData, address: formattedText });
    if (errors.address) setErrors({ ...errors, address: "" });
  };

  const handleAadharChange = (text) => {
    // Only allow numbers
    if (text.length <= 12 && /^\d*$/.test(text)) {
      setFormData({ ...formData, aadhar_number: text });
      if (errors.aadhar_number) setErrors({ ...errors, aadhar_number: "" });
    }
  };

  // Add date picker handlers
  const onDateChange = (event, selectedDate) => {
    const currentDob = formData.dob;  // Store current dob before any changes

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    // Handle iOS cancellation
    if (Platform.OS === 'ios') {
      if (event.type === 'dismissed') {
        return;
      }
    }
    
    // Only update if a date was selected and not dismissed
    if (selectedDate && event.type !== 'dismissed') {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
      setFormData({ ...formData, dob: formattedDate });
      setDatePickerDate(selectedDate);
    } else {
      // Keep the existing date if cancelled
      setFormData(prev => ({ ...prev, dob: currentDob }));
    }
  };

  // Update validation function
  const validate = () => {
    const newErrors = {};
    const { name, mobile_number, address, aadhar_number, email } = formData;

    // Name validation with length checks
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    } else if (name.trim().length > 20) {
      newErrors.name = "Name cannot exceed 20 characters";
    } else if (!/^[A-Za-z\s]+$/.test(name)) {
      newErrors.name = "Name can only contain letters and spaces";
    }

    // Mobile validation - exactly 10 digits
    if (!mobile_number) {
      newErrors.mobile_number = "Mobile number is required";
    } else if (!/^\d{10}$/.test(mobile_number)) {
      newErrors.mobile_number = "Mobile number must be exactly 10 digits";
    }

    // Aadhar validation - exactly 12 digits
    if (!aadhar_number) {
      newErrors.aadhar_number = "Aadhar number is required";
    } else if (!/^\d{12}$/.test(aadhar_number)) {
      newErrors.aadhar_number = "Aadhar number must be exactly 12 digits";
    }

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission (update)
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const loggedInUserId = await getUserId();

      const requestData = {
        update_user_id: loggedInUserId,
        user_id: captain.user_id,
        outlet_id: captain.outlet_id,
        name: formData.name.trim(),
        mobile: formData.mobile_number,
        address: formData.address ? formData.address.trim() : "",
        aadhar_number: formData.aadhar_number,
        dob: formData.dob || "",
        email: formData.email || "",
        is_active: formData.is_active ? 1 : 0,
      };

      console.log("Update Request:", requestData);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "captain_update",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Update Response:", response.data);

      if (response.data.st === 1) {
        // Call the refresh functions passed through navigation
        if (route.params?.onUpdate) {
          await route.params.onUpdate();
        }
        if (route.params?.refreshList) {
          await route.params.refreshList();
        }
        Alert.alert("Success", "Captain updated successfully", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update captain");
      }
    } catch (error) {
      console.error("Error updating captain:", error);
      Alert.alert("Error", "Failed to update captain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CustomHeader title="Edit Captain" />
      {toastVisible && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            value={formData.mobile_number}
            style={styles.input}
            onChangeText={handleMobileChange}
            keyboardType="number-pad"
            error={!!errors.mobile_number}
            maxLength={10}
            placeholder="Enter Mobile Number"
          />
          {errors.mobile_number && (
            <Text style={styles.errorText}>{errors.mobile_number}</Text>
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
            placeholder="Enter Address"
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
            placeholder="Enter Aadhar Number"
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

          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
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

         

          {/* Show loader when form is being submitted */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0dcaf0"
              style={styles.loader}
            />
          ) : (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Updating Captain..." : "Update Captain"}
              </Text>
            </TouchableOpacity>
          )}
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
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: "#cccccc",
  },
  icon: {
    marginRight: 8,
    color: "white",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 12,
  },
  loader: {
    marginTop: 16,
    alignItems: "center",
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1000,
  },
  toastText: {
    color: 'white',
    textAlign: 'center',
  },
});

export default EditCaptain;