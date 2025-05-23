import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text, TextInput, Switch } from "react-native-paper";
import axios from "axios";
import { onGetOwnerUrl ,onGetProductionUrl} from "../utils/ConstantFunctions";

import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomTabBar from "../CustomTabBar";

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

const EditManager = ({ route, navigation }) => {
  const { manager, onUpdate } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
    aadhar_number: "",
    email: "",
    dob: "",
    is_active: false,
  });
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

 

  const onDateChange = (event, selectedDate) => {
    const currentDob = formData.dob;

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (Platform.OS === 'ios') {
      if (event.type === 'dismissed') {
        return;
      }
    }
    
    if (selectedDate && event.type !== 'dismissed') {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
      setFormData(prev => ({ ...prev, dob: formattedDate }));
      setDatePickerDate(selectedDate);
    } else {
      setFormData(prev => ({ ...prev, dob: currentDob }));
    }
  };

  useEffect(() => {
    fetchManagerDetails();
    if (manager.dob) {
      const [day, month, year] = manager.dob.split(' ');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = months.indexOf(month);
      if (monthIndex !== -1) {
        setDatePickerDate(new Date(year, monthIndex, parseInt(day)));
      }
    }
  }, []);

  const fetchManagerDetails = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetOwnerUrl() + "manager/view",
        {
          outlet_id: restaurantId,
          user_id: manager.user_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const managerData = response.data.data;
        setFormData({
          name: managerData.name || "",
          mobile: managerData.mobile || "",
          address: managerData.address || "",
          aadhar_number: managerData.aadhar_number || "",
          email: managerData.email || "",
          dob: managerData.dob || "",
          is_active: managerData.is_active === true || managerData.is_active === 1,
        });
      }
    } catch (error) {
      console.error("Error fetching manager details:", error);
      Alert.alert("Error", "Failed to load manager details");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter manager name";
    } else if (!validateName(formData.name)) {
      newErrors.name = "Name should only contain letters and spaces";
    }

    if (!formData.mobile) {
      newErrors.mobile = "Please enter mobile number";
    } else if (!validateMobile(formData.mobile)) {
      newErrors.mobile =
        "Enter a valid 10-digit mobile number starting with 6-9";
    }

    if (formData.address && !validateAddress(formData.address)) {
      newErrors.address = "Address should only contain letters, numbers, and spaces";
    }

    if (!formData.aadhar_number) {
      newErrors.aadhar_number = "Please enter Aadhar number";
    } else if (!validateAadhar(formData.aadhar_number)) {
      newErrors.aadhar_number = "Enter a valid 12-digit Aadhar number";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please check all required fields");
      return;
    }

    try {
      setLoading(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      const loggedInUserId = await getUserId();

      const requestData = {
        outlet_id: manager.outlet_id,
        user_id: manager.user_id,
        update_user_id: loggedInUserId,
        name: formData.name.trim(),
        mobile: formData.mobile,
        aadhar_number: formData.aadhar_number.trim(),
        address: formData.address?.trim() || "",
        email: formData.email?.trim() || "",
        dob: formData.dob || "",
        is_active: formData.is_active
      };

      console.log("Update Request:", requestData);

      const response = await axiosInstance.post(
        onGetOwnerUrl() + "manager/update",
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
        if (onUpdate) {
          await onUpdate();
        }
        Alert.alert("Success", "Manager updated successfully", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update manager");
      }
    } catch (error) {
      console.error("Error updating manager:", error);
      Alert.alert("Error", "Failed to update manager");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toastVisible && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <RemixIcon name="arrow-left-line" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Manager</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <TextInput
            label="Name *"
            value={formData.name}
            onChangeText={(text) => {
              const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
              setFormData((prev) => ({ ...prev, name: formattedText }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            activeOutlineColor="#0dcaf0"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput
            label="Mobile Number *"
            value={formData.mobile}
            onChangeText={(text) => {
              const numericText = text.replace(/[^0-9]/g, "");
              if (
                numericText.length === 1 &&
                !["6", "7", "8", "9"].includes(numericText)
              ) {
                return;
              }
              setFormData((prev) => ({ ...prev, mobile: numericText }));
              if (errors.mobile)
                setErrors((prev) => ({ ...prev, mobile: "" }));
            }}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            error={!!errors.mobile}
            activeOutlineColor="#0dcaf0"
            maxLength={10}
          />
          {errors.mobile && (
            <Text style={styles.errorText}>{errors.mobile}</Text>
          )}

          <TextInput
            label="Address"
            value={formData.address}
            onChangeText={(text) => {
              const formattedText = text.replace(/[^a-zA-Z0-9\s,.-]/g, "");
              setFormData((prev) => ({ ...prev, address: formattedText }));
              if (errors.address)
                setErrors((prev) => ({ ...prev, address: "" }));
            }}
            mode="outlined"
            style={styles.input}
            error={!!errors.address}
            activeOutlineColor="#0dcaf0"
            multiline
          />
          {errors.address && (
            <Text style={styles.errorText}>{errors.address}</Text>
          )}

          <TextInput
            label="Aadhar Number *"
            value={formData.aadhar_number}
            onChangeText={(text) => {
              const numericText = text.replace(/[^0-9]/g, "");
              setFormData((prev) => ({
                ...prev,
                aadhar_number: numericText,
              }));
              if (errors.aadhar_number)
                setErrors((prev) => ({ ...prev, aadhar_number: "" }));
            }}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            error={!!errors.aadhar_number}
            activeOutlineColor="#0dcaf0"
            maxLength={12}
          />
          {errors.aadhar_number && (
            <Text style={styles.errorText}>{errors.aadhar_number}</Text>
          )}

          <TextInput
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            mode="outlined"
            style={styles.input}
            error={!!errors.email}
            activeOutlineColor="#0dcaf0"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
              label="Date of Birth"
              value={formData.dob}
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

         
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#0dcaf0"
            style={styles.loader}
          />
        ) : (
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Updating Manager..." : "Update Manager"}
            </Text>
          </TouchableOpacity>
        )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
    marginTop: 30,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  input: {
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 8,
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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

export default EditManager;
