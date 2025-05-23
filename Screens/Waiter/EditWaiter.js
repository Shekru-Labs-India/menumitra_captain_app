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
  Animated,
} from "react-native";
import { TextInput, Text } from "react-native-paper";
import axios from "axios";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Switch } from "react-native-paper";
import { getUserId } from "../utils/getOwnerData";

const EditWaiter = ({ route, navigation }) => {
  const { waiter } = route.params;
  const [formData, setFormData] = useState({
    name: "",
    mobile_number: "",
    address: "",
    aadhar_number: "",
    dob: "",
    email: "",
    is_active: true,
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Fetch captain details from View API
  const fetchCaptainDetails = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "waiter_view",
        {
          outlet_id: waiter.outlet_id,
          user_id: waiter.user_id,
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
          is_active: is_active || false,
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
  }, []);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCaptainDetails();
    setRefreshing(false);
  };

  // Update validation functions
  const validateName = (text) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return "Name is required";
    }

    if (trimmedText.length < 3) {
      return "Name must be at least 3 characters";
    }

    // Allow only letters and spaces
    if (!/^[a-zA-Z\s]+$/.test(trimmedText)) {
      return "Only letters and spaces allowed";
    }

    return "";
  };

  const validateMobile = (number) => {
    if (!number) {
      return "Mobile number is required";
    }

    if (!/^[6-9]\d{9}$/.test(number)) {
      return "Enter valid 10-digit number starting with 6-9";
    }

    return "";
  };

  const validateAddress = (text) => {
    if (!text) return ""; // Empty is valid
    const trimmedText = text.trim();

    if (trimmedText.length > 30) {
      return "Address cannot exceed 30 characters";
    }
    return "";
  };

  const validateAadhar = (number) => {
    if (!number) {
      return "Aadhar number is required";
    }

    if (!/^\d{12}$/.test(number)) {
      return "Enter valid 12-digit Aadhar number";
    }

    return "";
  };

  const validateEmail = (email) => {
    if (!email) return ""; // Empty is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : "Please enter a valid email address";
  };

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
    if (formData.dob) {
      try {
        const parts = formData.dob.split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(parts[1]);
          const year = parseInt(parts[2], 10);
          
          if (!isNaN(day) && month !== -1 && !isNaN(year)) {
            setDatePickerDate(new Date(year, month, day));
          } else {
            setDatePickerDate(new Date());
          }
        } else {
          setDatePickerDate(new Date());
        }
      } catch (e) {
        console.log("Error parsing date:", e);
        setDatePickerDate(new Date());
      }
    } else {
      setDatePickerDate(new Date());
    }
    setShowDatePicker(true);
  };

  // Add this function to show toast notifications
  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setToastVisible(false);
    });
  };

  // Add this function to handle status update
 

  // Handle form submission (update)
  const handleSubmit = async () => {
    const { name, mobile_number, address, aadhar_number, email, dob } = formData;

    // Only validate required fields
    const newErrors = {
      name: validateName(name),
      mobile_number: validateMobile(mobile_number),
      aadhar_number: validateAadhar(aadhar_number),
      // Optional fields - only validate if they have values
      email: email ? validateEmail(email) : "",
      address: address ? validateAddress(address) : "",
    };

    setErrors(newErrors);

    // Check if there are any errors in required fields only
    const hasRequiredErrors = newErrors.name || 
                            newErrors.mobile_number || 
                            newErrors.aadhar_number;

    if (hasRequiredErrors) {
      showToast('Please check all required fields');
      return;
    }

    setLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const loggedInUserId = await getUserId();

      const requestData = {
        update_user_id: loggedInUserId,
        user_id: waiter.user_id,
        outlet_id: waiter.outlet_id,
        name: name.trim(),
        mobile: mobile_number,
        address: address ? address.trim() : "",
        aadhar_number,
        dob: dob || "",
        email: email || "",
        is_active: formData.is_active ? 1 : 0,
      };

      console.log("Request Data:", requestData);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "waiter_update",
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
        showToast('Waiter details updated successfully');
        setTimeout(async () => {
          if (route.params?.onUpdate) {
            await route.params.onUpdate();
          }
          if (route.params?.refreshList) {
            await route.params.refreshList();
          }
          navigation.goBack();
        }, 1000);
      } else {
        showToast(response.data.msg || 'Failed to update waiter');
      }
    } catch (error) {
      console.error("Error updating waiter:", error);
      showToast('An error occurred while updating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CustomHeader title="Edit Waiter" />
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
            onChangeText={(text) => {
              // Only allow letters and spaces
              const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
              setFormData({ ...formData, name: formattedText });
              setErrors((prev) => ({
                ...prev,
                name: validateName(formattedText),
              }));
            }}
            style={[styles.input, errors.name && styles.inputError]}
            error={!!errors.name}
            maxLength={50}
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
            onChangeText={(text) => {
              // Only allow numbers and validate first digit
              const formattedText = text.replace(/[^0-9]/g, "");
              if (formattedText.length === 0 || /^[6-9]/.test(formattedText)) {
                setFormData({ ...formData, mobile_number: formattedText });
                setErrors((prev) => ({
                  ...prev,
                  mobile_number: validateMobile(formattedText),
                }));
              }
            }}
            keyboardType="numeric"
            maxLength={10}
            style={[styles.input, errors.mobile_number && styles.inputError]}
            error={!!errors.mobile_number}
          />
          {errors.mobile_number && (
            <Text style={styles.errorText}>{errors.mobile_number}</Text>
          )}

          <TextInput
            mode="outlined"
            label="Address"
            value={formData.address}
            onChangeText={(text) => {
              // Only allow letters, numbers and spaces
              const formattedText = text.replace(/[^a-zA-Z0-9\s]/g, "");
              setFormData({ ...formData, address: formattedText });
              setErrors((prev) => ({
                ...prev,
                address: validateAddress(formattedText),
              }));
            }}
            style={[styles.input, errors.address && styles.inputError]}
            error={!!errors.address}
            maxLength={30}
            multiline
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
            onChangeText={(text) => {
              // Only allow numbers
              const formattedText = text.replace(/[^0-9]/g, "");
              setFormData({ ...formData, aadhar_number: formattedText });
              setErrors((prev) => ({
                ...prev,
                aadhar_number: validateAadhar(formattedText),
              }));
            }}
            keyboardType="numeric"
            maxLength={12}
            style={[styles.input, errors.aadhar_number && styles.inputError]}
            error={!!errors.aadhar_number}
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
              setFormData({ ...formData, email: text });
              setErrors((prev) => ({
                ...prev,
                email: validateEmail(text),
              }));
            }}
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

         

          {/* Show loader when form is being submitted */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0dcaf0"
              style={styles.loader}
            />
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Update Waiter</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <CustomTabBar />
      {/* Custom Toast */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            { 
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }]
            }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
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
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 12,
  },
  loader: {
    marginTop: 16,
    alignItems: "center",
  },
  inputError: {
    borderColor: "red",
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
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default EditWaiter;
