import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Pressable,
  Modal,
  Platform,
  Linking,
} from "react-native";
import { TextInput, Text } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { MaterialIcons, MaterialIcons as Icon } from "@expo/vector-icons";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { Dropdown } from "react-native-element-dropdown";
import DateTimePickerAndroid from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomTabBar from "../CustomTabBar";
import newstyles from "../newstyles";
import CustomHeader from "../../components/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import { PermissionsAndroid } from "react-native";

export default function AddNewStaff({ navigation, route }) {
  // State declarations
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dob, setDob] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [roles, setRoles] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showMobileError, setShowMobileError] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    role: false,
    mobileNumber: false,
    dob: false,
    aadhar: false,
    address: false,
  });
  const [showRolePicker, setShowRolePicker] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_staff_role",
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const roleList = response.data.role_list;
        const formattedRoles = Object.keys(roleList).map((key) => ({
          label: roleList[key].charAt(0).toUpperCase() + roleList[key].slice(1),
          value: roleList[key],
        }));
        setRoles(formattedRoles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS === 'android') {
        // For Android 11 (API 30) and below
        if (Platform.Version <= 30) {
          const storagePermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: "Storage Permission",
              message: "App needs access to your storage to select images",
              buttonPositive: "Allow",
              buttonNegative: "Deny"
            }
          );

          if (storagePermission !== 'granted') {
            Alert.alert(
              "Permission needed",
              "Please grant storage permissions in your device settings to upload images.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
              ]
            );
            return;
          }
        } else {
          // For Android 12+ (API 31+)
          const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!mediaPermission.granted) {
            Alert.alert(
              "Permission needed",
              "Please grant media access in your device settings to upload images.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
              ]
            );
            return;
          }
        }
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
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
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatAPIDate = (displayDate) => {
    if (!displayDate) return "";
    const months = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };

    const [day, month, year] = displayDate.split(" ");
    return `${year}-${months[month]}-${day}`;
  };

  const isValidMobile = (number) => {
    return /^[6-9]\d{9}$/.test(number);
  };

  const handleMobileChange = (text) => {
    const filteredText = text.replace(/[^0-9]/g, "");
    if (filteredText.length <= 10) {
      setMobileNumber(filteredText);
      // Show error if first digit is entered and invalid
      if (filteredText.length === 1) {
        setShowMobileError(!/^[6-9]/.test(filteredText));
      } else {
        setShowMobileError(false);
      }
    }
  };

  const validateMobile = (number) => {
    if (!number) return "Mobile number is required";
    if (number.length !== 10) return "Mobile number must be 10 digits";
    if (!/^[6-9]/.test(number)) return "Mobile number must start with 6-9";
    return "";
  };

  const validateName = (name) => {
    return /^[A-Za-z\s]{3,20}$/.test(name);
  };

  const validateMobileNumber = (number) => {
    // Check if starts with 6-9 and is 10 digits
    return /^[6-9]\d{9}$/.test(number);
  };

  const validateAadhar = (number) => {
    // Check if exactly 12 digits
    return /^\d{12}$/.test(number);
  };

  const validateAddress = (address) => {
    return address.length >= 5 && /^[A-Za-z0-9\s,.-/#&()]+$/.test(address);
  };

  const formatDateForAPI = (dateString) => {
    try {
      // First, parse the incoming date string
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log("Invalid date:", dateString);
        return "";
      }

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

      // Format the date components
      const day = date.getDate().toString().padStart(2, "0");
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      const formattedDate = `${day} ${month} ${year}`;
      console.log("Original date:", dateString);
      console.log("Formatted date:", formattedDate);

      return formattedDate;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "";
    }
  };

  const handleSaveStaff = async () => {
    // First validate all required fields
    if (!name || !role || !mobileNumber || !aadhar) {
      Alert.alert("Error", "Please fill all required fields");
      // Mark all fields as touched to show validation errors
      setTouchedFields({
        name: true,
        role: true,
        mobileNumber: true,
        dob: true,
        aadhar: true,
      });
      return;
    }

    // Validate individual fields
    if (!validateName(name)) {
      Alert.alert("Error", "Name should contain only letters");
      return;
    }

    if (!validateMobileNumber(mobileNumber)) {
      Alert.alert(
        "Error",
        "Please enter a valid 10-digit mobile number starting with 6-9"
      );
      return;
    }

    if (!validateAadhar(aadhar)) {
      Alert.alert("Error", "Please enter a valid 12-digit Aadhar number");
      return;
    }

    setLoading(true);
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("role", role);
      formData.append("mobile", mobileNumber);
      formData.append("dob", dob);
      formData.append("aadhar_number", aadhar);
      formData.append("address", address.trim());
      formData.append("outlet_id", restaurantId);
      formData.append("user_id", userId);

      if (image) {
        formData.append("photo", {
          uri: image,
          type: "image/jpeg",
          name: "staff_photo.jpg",
        });
      }

      // Debug logs
      console.log("Date being sent:", dob);
      console.log("Complete form data:", Object.fromEntries(formData._parts));

      const response = await axiosInstance.post(
        onGetProductionUrl() + "staff_create",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("API Response:", response.data); // Debug log

      if (response.data.st === 1) {
        Alert.alert("Success", "Staff member added successfully", [
          {
            text: "OK",
            onPress: () => {
              if (route.params?.refresh) {
                route.params.refresh();
              }
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to save staff member"
        );
      }
    } catch (error) {
      console.error("API Error:", error.response?.data || error.message); // Debug log

      if (error.response) {
        // Server responded with an error
        Alert.alert(
          "Error",
          error.response.data.msg || "Server error occurred"
        );
      } else if (error.request) {
        // Request was made but no response received
        Alert.alert(
          "Error",
          "No response from server. Please check your connection."
        );
      } else {
        // Something else went wrong
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    // Only hide the date picker when the event type is 'set' (user confirmed) or 'dismissed' (user canceled)
    if (event.type === 'set' || event.type === 'dismissed') {
      setShowDatePicker(false);
    }
    
    // Only update the date if the user actually selected a date (event.type === 'set')
    if (event.type === 'set' && selectedDate) {
      // Format the date immediately when selected
      const formattedDate = formatDateForAPI(selectedDate);
      setDob(formattedDate); // Store the formatted date string directly
    }
    // If user canceled (event.type === 'dismissed'), we do nothing to keep the existing date
  };

  return (
    <>
      <CustomHeader title="Add New Staff" />

      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView style={styles.content}>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={{ width: 120, height: 120, borderRadius: 60 }}
              />
            ) : (
              <>
                <MaterialIcons name="camera-alt" size={40} color="#fff" />
                <Text style={styles.photoText}>
                  Tap to add photo ( max 3 MB )
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              style={[styles.inputContainer, { backgroundColor: "white" }]}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Full Name
                </Text>
              }
              value={name}
              onChangeText={(text) => {
                const filteredText = text.replace(/[^A-Za-z\s]/g, "");
                setName(filteredText);
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, name: true }))
              }
              error={touchedFields.name && (!name || !validateName(name))}
            />
            {touchedFields.name && !name && (
              <Text style={styles.errorText}>Name is required</Text>
            )}
            {touchedFields.name && name && !validateName(name) && (
              <Text style={styles.errorText}>
                Name should be 3-20 characters
              </Text>
            )}
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text> Role
              </Text>
              <Pressable onPress={() => setShowRolePicker(true)}>
                <TextInput
                  mode="outlined"
                  style={[
                    styles.input,
                    { height: 45 },
                    touchedFields.role && !role && styles.inputError,
                  ]}
                  value={roles.find((r) => r.value === role)?.label || ""}
                  placeholder="Select Role"
                  editable={false}
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              </Pressable>
              {touchedFields.role && !role && (
                <Text style={styles.errorText}>Please select a role</Text>
              )}
            </View>

            <Modal
              transparent={true}
              visible={showRolePicker}
              animationType="fade"
              onRequestClose={() => setShowRolePicker(false)}
            >
              <TouchableOpacity
                style={styles.modalContainer}
                activeOpacity={1}
                onPress={() => setShowRolePicker(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Role</Text>
                    <TouchableOpacity
                      onPress={() => setShowRolePicker(false)}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView>
                    {roles.map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={styles.modalItem}
                        onPress={() => {
                          setRole(item.value);
                          setShowRolePicker(false);
                          setTouchedFields((prev) => ({ ...prev, role: true }));
                        }}
                      >
                        <Text style={styles.modalItemText}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputContainer, { backgroundColor: "white" }]}
                label={
                  <Text style={styles.label}>
                    <Text style={styles.required}>*</Text> Mobile Number
                  </Text>
                }
                value={mobileNumber}
                onChangeText={(text) => {
                  const filteredText = text.replace(/[^0-9]/g, "");
                  if (
                    text === "" ||
                    (filteredText.length === 1 &&
                      /^[6-9]/.test(filteredText)) ||
                    filteredText.length > 1
                  ) {
                    setMobileNumber(filteredText);
                  }
                }}
                onBlur={() =>
                  setTouchedFields((prev) => ({ ...prev, mobileNumber: true }))
                }
                keyboardType="phone-pad"
                maxLength={10}
                mode="outlined"
                error={
                  touchedFields.mobileNumber && validateMobile(mobileNumber)
                }
              />
              {touchedFields.mobileNumber && validateMobile(mobileNumber) && (
                <Text style={styles.errorText}>
                  {validateMobile(mobileNumber)}
                </Text>
              )}
            </View>

            <Pressable onPress={() => setShowDatePicker(true)}>
              <TextInput
                mode="outlined"
                style={[styles.inputContainer, { backgroundColor: "white" }]}
                label={
                  <Text style={styles.label}>
                    Date Of Birth
                  </Text>
                }
                value={dob}
                editable={false}
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => setShowDatePicker(true)}
                  />
                }
              />
            </Pressable>

            {showDatePicker && (
              <DateTimePickerAndroid
                value={dob ? new Date(formatAPIDate(dob)) : new Date()}
                mode="date"
                display="calendar"
                onChange={onDateChange}
                maximumDate={new Date()} // Prevents future dates
              />
            )}

            <TextInput
              mode="outlined"
              style={[styles.inputContainer, { backgroundColor: "white" }]}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Aadhar Number
                </Text>
              }
              keyboardType="numeric"
              value={aadhar}
              onChangeText={(text) => {
                const filteredText = text.replace(/[^0-9]/g, "");
                if (filteredText.length <= 12) {
                  setAadhar(filteredText);
                }
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, aadhar: true }))
              }
              maxLength={12}
              error={touchedFields.aadhar && (!aadhar || aadhar.length !== 12)}
            />
            {touchedFields.aadhar && !aadhar && (
              <Text style={styles.errorText}>Aadhar number is required</Text>
            )}
            {touchedFields.aadhar && aadhar && aadhar.length !== 12 && (
              <Text style={styles.errorText}>
                Aadhar number must be 12 digits
              </Text>
            )}

            <TextInput
              mode="outlined"
              style={[styles.inputContainer, { backgroundColor: "white" }]}
              label={
                <Text style={styles.label}>
                  Address
                </Text>
              }
              multiline
              numberOfLines={5}
              value={address}
              onChangeText={(text) => {
                const filteredText = text.replace(
                  /[^A-Za-z0-9\s,.-/#&()]/g,
                  ""
                );
                setAddress(filteredText);
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, address: true }))
              }
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveStaff}
            disabled={loading}
          >
            <Icon name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>
              {loading ? "Saving..." : "Save "}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomTabBar />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    // marginLeft: 16,
    fontWeight: "500",
    textAlign: "center",
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#00BCD4",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  photoText: {
    color: "#fff",
    marginTop: 8,
  },
  inputContainer: {
    marginTop: 20,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#666",
  },
  required: {
    color: "red",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    paddingHorizontal: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#00BCD4",
    padding: 16,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    marginBottom: 100,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  dropdown: {
    height: 48,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  dropdownPlaceholder: {
    color: "#999",
    fontSize: 16,
  },
  dropdownSelectedText: {
    color: "#000",
    fontSize: 16,
  },
  inputText: {
    fontSize: 16,
    color: "#000",
    paddingVertical: 12,
  },
  placeholderText: {
    color: "#999",
  },
  errorInput: {
    borderColor: "#ff0000",
    borderWidth: 1,
  },
  errorText: {
    color: "#ff0000",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  helperText: {
    color: "#666",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  required: {
    color: "red",
    marginRight: 5,
    fontSize: 16,
  },
  labelSpacing: {
    marginLeft: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 4,
    backgroundColor: "white",
  },
  pickerText: {
    fontSize: 16,
    color: "#000",
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    width: "80%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#555",
  },
  roleItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  roleText: {
    fontSize: 16,
    color: "#333",
  },
  selectedRoleText: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  errorBorder: {
    borderColor: "red",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 20,
    width: "80%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  inputError: {
    borderColor: "red",
  },
});
