import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  Pressable,
  Modal,
  PermissionsAndroid,
  Linking,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import CustomTabBar from "../CustomTabBar";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomHeader from "../../components/CustomHeader";
import { getUserId } from "../utils/getOwnerData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const formatDateString = (dateStr) => {
  if (!dateStr) return "";

  // Since we're getting date in "DD Mon YYYY" format from API
  // We can use it directly
  return dateStr;
};

const EditStaffDetails = ({ route, navigation }) => {
  const { staffData, restaurantId } = route.params;
  console.log("Staff Data received:", staffData);

  const [formData, setFormData] = useState({
    name: staffData?.name || "",
    role: staffData?.role || "",
    mobile: staffData?.mobile?.toString() || "",
    dob: staffData?.dob || "", // Use DOB directly from API
    aadhar_number: staffData?.aadhar_number?.toString() || "",
    address: staffData?.address || "",
    remove_photo: false,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [image, setImage] = useState(staffData?.photo || null);
  const [mobileError, setMobileError] = useState("");
  const [nameError, setNameError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);

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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === "set" && selectedDate) {
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

      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = months[selectedDate.getMonth()];
      const year = selectedDate.getFullYear();

      const formattedDate = `${day} ${month} ${year}`;
      console.log("New formatted date:", formattedDate);

      setFormData((prev) => ({
        ...prev,
        dob: formattedDate,
      }));
    }
  };

  const handleAadharChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    if (numericValue.length <= 12) {
      setFormData((prev) => ({ ...prev, aadhar_number: numericValue }));
    }
  };

  const isValidAadhar = (number) => {
    const aadharPattern = /^\d{12}$/;
    return aadharPattern.test(number);
  };

  const validateMobile = (number) => {
    if (number.length === 0) {
      setMobileError("");
      return true;
    }

    if (number.length !== 10) {
      setMobileError("Mobile number must be 10 digits");
      return false;
    }

    const firstDigit = parseInt(number.charAt(0));
    if (firstDigit < 6 || firstDigit > 9) {
      setMobileError("Mobile number should start with 6, 7, 8, or 9");
      return false;
    }

    setMobileError("");
    return true;
  };

  const handleMobileChange = (text) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");

    // If it's the first digit, only allow 6-9
    if (numericText.length > 0) {
      const firstDigit = parseInt(numericText.charAt(0));
      if (firstDigit >= 6 && firstDigit <= 9) {
        setFormData((prev) => ({ ...prev, mobile: numericText.slice(0, 10) }));
      } else if (numericText.length === 1) {
        // Don't set invalid first digits
        return;
      } else {
        // If not first digit, allow the change
        setFormData((prev) => ({ ...prev, mobile: numericText.slice(0, 10) }));
      }
    } else {
      // Empty input is allowed
      setFormData((prev) => ({ ...prev, mobile: "" }));
    }

    validateMobile(numericText);
  };

  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s]+$/;
    return nameRegex.test(name);
  };

  const handleSave = async () => {
    try {
      const [userId, accessToken] = await Promise.all([
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const formDataToSend = new FormData();

      // Basic staff details
      formDataToSend.append("staff_id", staffData.staff_id.toString());
      formDataToSend.append("outlet_id", restaurantId.toString());
      formDataToSend.append("user_id", userId);
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("mobile", formData.mobile.toString());
      formDataToSend.append("address", formData.address?.trim() || "");
      formDataToSend.append("role", formData.role.trim());
      formDataToSend.append("dob", formData.dob);
      formDataToSend.append("aadhar_number", formData.aadhar_number.toString());

      // Handle image
      if (formData.remove_photo) {
        // Send empty photo field when removing image
        formDataToSend.append("photo", "");
      } else if (image && image !== staffData.photo) {
        // Only append new image if it exists and has changed
        const imageUri =
          Platform.OS === "ios" ? image.replace("file://", "") : image;
        formDataToSend.append("photo", {
          uri: imageUri,
          type: "image/jpeg",
          name: "photo.jpg",
        });
      }

      console.log(
        "Sending form data:",
        Object.fromEntries(formDataToSend._parts)
      );

      // Construct the URL with remove_image_flag parameter when needed
      let apiUrl = onGetProductionUrl() + "staff_update";
      if (formData.remove_photo) {
        apiUrl += "?remove_image_flag=True";
      }

      const response = await axiosInstance({
        method: "post",
        url: apiUrl,
        data: formDataToSend,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.st === 1) {
        Alert.alert(
          "Staff details updated successfully"
        );
        navigation.navigate({
          name: "StaffDetails",
          params: {
            staffId: staffData.staff_id,
            restaurantId: restaurantId,
            refresh: Date.now(),
          },
          merge: true,
        });
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to update staff details"
        );
      }
    } catch (error) {
      console.error("Update error:", error.response?.data || error);
      Alert.alert("Error", "Failed to update staff details. Please try again.");
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      "Remove Image",
      "Are you sure you want to remove the profile image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: () => {
            setImage(null);
            setFormData((prev) => ({
              ...prev,
              remove_photo: true,
              photo: null, // Add this line
            }));
            console.log("Image removed, updated formData:", formData); // Debug log
          },
          style: "destructive",
        },
      ]
    );
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setFormData((prev) => ({
          ...prev,
          remove_photo: false
        }));
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  return (
   <>
      <CustomHeader title=" Edit Staff" />
      <View style={styles.container}>
        <ScrollView style={styles.formContainer}>
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={pickImage}>
              <View style={styles.imageWrapper}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.profileImage} />
                ) : (
                  <View
                    style={[
                      styles.profileImage,
                      {
                        backgroundColor: "#f0f0f0",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={50}
                      color="#999"
                    />
                  </View>
                )}
                <View style={styles.editIconContainer}>
                  <MaterialCommunityIcons
                    name="camera"
                    size={20}
                    color="#6200ee"
                  />
                </View>
              </View>
            </TouchableOpacity>
            {image && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={24}
                  color="#FF0000"
                />
              </TouchableOpacity>
            )}
            <Text style={styles.fileSizeText}>Maximum file size: 3MB</Text>
          </View>

          <TextInput
            style={[styles.input, nameError ? { borderColor: "red" } : null]}
            mode="outlined"
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text> Name
              </Text>
            }
            value={formData.name}
            onChangeText={(text) => {
              // Only allow letters and spaces
              const filteredText = text.replace(/[^A-Za-z\s]/g, "");

              if (filteredText.length > 20) {
                setNameError("Name should not exceed 20 characters");
              } else if (filteredText.length < 3) {
                setNameError("Name should be at least 3 characters");
              } else if (!validateName(filteredText)) {
                setNameError("Name should contain only letters and spaces");
              } else {
                setNameError("");
              }

              setFormData((prev) => ({ ...prev, name: filteredText }));
            }}
            error={!!nameError}
            maxLength={20}
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              <Text style={styles.required}>*</Text> Role
            </Text>
            <Pressable onPress={() => setShowRoleModal(true)}>
              <TextInput
                mode="outlined"
                style={[styles.input, { height: 45 }]}
                value={
                  // First try to find the role in the formatted roles list
                  roles.find((r) => r.value === formData.role)?.label ||
                  // If not found, capitalize the first letter of the existing role
                  (formData.role
                    ? formData.role.charAt(0).toUpperCase() +
                      formData.role.slice(1)
                    : "")
                }
                placeholder="Select Role"
                editable={false}
                right={<TextInput.Icon icon="chevron-down" />}
              />
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              label="Mobile Number"
              value={formData.mobile}
              onChangeText={handleMobileChange}
              keyboardType="numeric"
              maxLength={10}
              error={!!mobileError}
            />
            {mobileError ? (
              <Text style={styles.errorText}>{mobileError}</Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
              label={
                <Text style={styles.label}>
                 Date Of Birth
                </Text>
              }
              mode="outlined"
              style={styles.input}
              value={formData.dob}
              editable={false}
            />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={(() => {
                if (formData.dob) {
                  // Parse the "DD Mon YYYY" format
                  const [day, month, year] = formData.dob.split(" ");
                  const months = {
                    Jan: 0,
                    Feb: 1,
                    Mar: 2,
                    Apr: 3,
                    May: 4,
                    Jun: 5,
                    Jul: 6,
                    Aug: 7,
                    Sep: 8,
                    Oct: 9,
                    Nov: 10,
                    Dec: 11,
                  };
                  return new Date(year, months[month], parseInt(day));
                }
                return new Date();
              })()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <TextInput
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text> Aadhar Number
              </Text>
            }
            mode="outlined"
            style={[
              styles.input,
              { marginTop: 17 },
              formData.aadhar_number.length > 0 &&
                formData.aadhar_number.length !== 12 &&
                styles.errorInput,
            ]}
            value={formData.aadhar_number}
            onChangeText={handleAadharChange}
            keyboardType="numeric"
            maxLength={12}
          />
          {formData.aadhar_number.length > 0 &&
            formData.aadhar_number.length !== 12 && (
              <Text style={styles.errorText}>
                Aadhar number must be 12 digits
              </Text>
            )}

          <TextInput
            mode="outlined"
            label={
              <Text style={styles.label}>
                 Address
              </Text>
            }
            style={[
              styles.input,
              { marginTop: 17 },
              addressError ? { borderColor: "red" } : null,
            ]}
            value={formData.address}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, address: text }))
            }
            multiline
            numberOfLines={4}
            placeholder="Enter address"
            maxLength={100}
            outlineStyle={{ borderRadius: 4 }}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Icon name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <CustomTabBar />
      <Modal
        transparent={true}
        visible={showRoleModal}
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowRoleModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity
                onPress={() => setShowRoleModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, role: role.value }));
                    setShowRoleModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{role.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "500",
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  required: {
    color: "red",
  },
  input: {
    backgroundColor: "#fff",
    // marginBottom: 16,
    // height: 48,
    // borderWidth: 1,
    // borderColor: '#e0e0e0',
    // borderRadius: 4,
    paddingHorizontal: 12,
  },
  addressInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 8,
  },
  saveButton: {
    backgroundColor: "#00bcd4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 80,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#666",
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  picker: {
    height: 48,
    width: "100%",
    backgroundColor: "transparent",
  },
  pickerItem: {
    fontSize: 14,
    color: "#000",
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  errorInput: {
    borderColor: "#ff0000",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: 20,
    position: "relative",
  },
  imageWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  editIconContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inputContainer: {
    marginBottom: 16,
    marginTop: 10,
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
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1,
  },
  fileSizeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic'
  },
});

export default EditStaffDetails;
