import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  RefreshControl,
  Modal,
  Pressable,
  PermissionsAndroid,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput, Switch, Button } from "react-native-paper";
import axios from "axios";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetProductionUrl, onGetOwnerUrl } from "../utils/ConstantFunctions";
import CustomTabBar from "../CustomTabBar";
import newstyles from "../newstyles";
import MainToolBar from "../MainToolbar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import CustomHeader from "../../components/CustomHeader";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import axiosInstance from "../../utils/axiosConfig";

export default function EditRestaurantInfo({ route, navigation }) {
  const [restaurantType, setRestaurantType] = useState("restaurant");
  const [restaurantTypeModalVisible, setRestaurantTypeModalVisible] =
    useState(false);
  const [restaurantTypeList, setRestaurantTypeList] = useState([]);

  const [vegNonvegList, setVegNonvegList] = useState([]);
  const [vegNonveg, setVegNonveg] = useState("");
  const [vegModalVisible, setVegModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restaurantData, setRestaurantData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    restaurant_type: "",
    fssainumber: "",
    gstnumber: "",
    mobile: "",
    veg_nonveg: "",
    service_charges: "",
    gst: "",
    address: "",
    is_open: false,
    upi_id: "",
    website: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    google_business_link: "",
    google_review: "",
    opening_time: "",
    closing_time: "",
  });
  const [image, setImage] = useState(null);
  const [imageSelected, setImageSelected] = useState(false);

  const [restaurantTypes] = useState([
    { key: 1, name: "restaurant" },
    { key: 2, name: "cafe" },
    { key: 3, name: "mess" },
    { key: 4, name: "hotel" },
  ]);

  const [vegNonvegOptions] = useState([
    { key: 1, name: "Veg" },
    { key: 2, name: "NonVeg" },
  ]);

  const [showOpeningPicker, setShowOpeningPicker] = useState(false);
  const [showClosingPicker, setShowClosingPicker] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRestaurantData().finally(() => {
      setRefreshing(false);
    });
  }, []);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "view_outlet",
        {
          user_id: userId,
          outlet_id: restaurantId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const data = response.data.data;
        console.log("Restaurant data:", data);
        setRestaurantData(data);
        setFormData({
          name: data.name || "",
          outlet_type: data.outlet_type || "",
          fssainumber: data.fssainumber || "",
          gstnumber: data.gstnumber || "",
          mobile: data.mobile || "",
          veg_nonveg: data.veg_nonveg || "",
          service_charges: data.service_charges?.toString() || "",
          gst: data.gst?.toString() || "",
          address: data.address || "",
          is_open: data.is_open || false,
          upi_id: data.upi_id || "",
          website: data.website || "",
          whatsapp: data.whatsapp || "",
          facebook: data.facebook || "",
          instagram: data.instagram || "",
          google_business_link: data.google_business_link || "",
          google_review: data.google_review || "",
          opening_time: data.opening_time || "",
          closing_time: data.closing_time || "",
        });

        setRestaurantType(data.outlet_type || "");
        setVegNonveg(data.veg_nonveg || "");
      } else {
        Alert.alert("Error", "Failed to fetch restaurant data");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateName = (text) => /^[a-zA-Z\s]{3,50}$/.test(text);
  const validateMobile = (number) => /^[6-9]\d{9}$/.test(number);
  const validateFSSAI = (number) => /^\d{14}$/.test(number);
  const validateGST = (number) => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9]{1}Z[0-9A-Z]{1}$/.test(
      number
    );
  };
  const validateUPI = (upiId) => {
    // UPI format: username@bankname (min 6, max 50 chars)
    const upiRegex = /^[a-zA-Z0-9._-]{3,}@[a-zA-Z]{3,}$/;

    // List of valid UPI handles
    const validHandles = [
      "okaxis",
      "okhdfcbank",
      "okicici",
      "oksbi",
      "paytm",
      "ybl",
      "apl",
      "axl",
      "ibl",
      "upi",
      "icici",
      "sbi",
      "hdfc",
      "axis",
      "kotak",
    ];

    if (!upiId) return true; // Optional field

    // Length check
    if (upiId.length < 6 || upiId.length > 50) return false;

    // Basic format check
    if (!upiRegex.test(upiId)) return false;

    // Check if the bank handle is valid
    const handle = upiId.split("@")[1].toLowerCase();
    return validHandles.some((validHandle) => handle.includes(validHandle));
  };
  const validateURL = (url) => {
    if (!url) return true; // Optional field
    return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(
      url
    );
  };
  const validateWhatsapp = (number) => {
    if (!number) return true; // Optional field
    return /^\d{10}$/.test(number);
  };
  const validateAddress = (text) => {
    const length = text.trim().length;
    return length >= 5 && length <= 80 && /^[a-zA-Z0-9\s,]+$/.test(text);
  };

  const validateDecimalNumber = (text) => {
    return /^\d*\.?\d{0,2}$/.test(text); // Allows numbers with up to 2 decimal places
  };

  const validateForm = () => {
    let formIsValid = true;
    let newErrors = {};

    // Restaurant name (mandatory)
    if (!formData.name.trim()) {
      newErrors.name = "Restaurant name is required";
      formIsValid = false;
    } else if (!validateName(formData.name)) {
      newErrors.name = "Please enter a valid restaurant name";
      formIsValid = false;
    }

    // Restaurant type (mandatory)
    if (!restaurantType) {
      newErrors.restaurantType = "Restaurant type is required";
      formIsValid = false;
    }

    // Veg/Non-veg (mandatory)
    if (!vegNonveg) {
      newErrors.vegNonveg = "Please select veg or non-veg";
      formIsValid = false;
    }

    // FSSAI (optional - only validate if provided)
    if (formData.fssainumber && !validateFSSAI(formData.fssainumber)) {
      newErrors.fssainumber = "FSSAI number must be 14 digits";
      formIsValid = false;
    }

    // GST (optional)
    if (formData.gstnumber && !validateGST(formData.gstnumber)) {
      newErrors.gstnumber = "Please enter a valid GST number";
      formIsValid = false;
    }

    // Mobile (mandatory)
    if (!formData.mobile) {
      newErrors.mobile = "Mobile number is required";
      formIsValid = false;
    } else if (!validateMobile(formData.mobile)) {
      newErrors.mobile = "Please enter a valid 10 digit mobile number";
      formIsValid = false;
    }

    // Address (mandatory)
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
      formIsValid = false;
    }

    // UPI ID (mandatory)
    if (!formData.upi_id) {
      newErrors.upi_id = "UPI ID is required";
      formIsValid = false;
    } else if (!validateUPI(formData.upi_id)) {
      newErrors.upi_id = "Please enter a valid UPI ID";
      formIsValid = false;
    }

    // Other validations remain optional
    // ...

    setErrors(newErrors);
    return formIsValid;
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
        setImageSelected(true);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const formDataToSend = new FormData();

      // Convert boolean to string "1" or "0" for is_open
      formDataToSend.append("is_open", formData.is_open);

      // Format times to ensure they're in the correct format (HH:mm:ss)
      const formatTime = (timeStr) => {
        if (!timeStr) return "";
        try {
          // Parse the time string into hours and minutes
          const [time, period] = timeStr.split(" "); // Split "10:30 AM" into ["10:30", "AM"]
          const [hours, minutes] = time.split(":"); // Split "10:30" into ["10", "30"]

          // Create a date object for today with the given time
          const date = new Date();
          date.setHours(
            period === "PM" && hours !== "12"
              ? parseInt(hours) + 12
              : period === "AM" && hours === "12"
              ? 0
              : parseInt(hours),
            parseInt(minutes),
            0
          );

          // Format the date to match the required format
          const formattedDate = date.toISOString().split("T")[0]; // Get YYYY-MM-DD
          const formattedTime = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          });

          return `${formattedDate} ${formattedTime}`;
        } catch (e) {
          console.error("Time formatting error:", e);
          return "";
        }
      };

      formDataToSend.append("outlet_id", restaurantId.toString());
      formDataToSend.append("user_id", userId.toString());
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("outlet_type", restaurantType || "");
      
      // Fix for FSSAI number - explicitly set as empty string if empty/null/undefined
      const fssaiValue = formData.fssainumber ? formData.fssainumber.trim() : "";
      formDataToSend.append("fssainumber", fssaiValue);
      console.log("FSSAI value being sent:", fssaiValue);
      
      formDataToSend.append("gstnumber", formData.gstnumber.trim() || "");
      formDataToSend.append("mobile", formData.mobile.trim());
      formDataToSend.append("veg_nonveg", vegNonveg || "");
      formDataToSend.append(
        "service_charges",
        formData.service_charges.toString() || ""
      );
      formDataToSend.append("gst", formData.gst.toString() || "");
      formDataToSend.append("address", formData.address.trim());
      formDataToSend.append("opening_time", formatTime(formData.opening_time));
      formDataToSend.append("closing_time", formatTime(formData.closing_time));
      formDataToSend.append("upi_id", formData.upi_id?.trim() || "");
      formDataToSend.append("website", formData.website?.trim() || "");
      formDataToSend.append("whatsapp", formData.whatsapp?.trim() || "");
      formDataToSend.append("facebook", formData.facebook?.trim() || "");
      formDataToSend.append("instagram", formData.instagram?.trim() || "");
      formDataToSend.append(
        "google_business_link",
        formData.google_business_link?.trim() || ""
      );
      formDataToSend.append(
        "google_review",
        formData.google_review?.trim() || ""
      );

      // Append image if selected
      if (imageSelected && image) {
        const imageUri =
          Platform.OS === "ios" ? image.replace("file://", "") : image;
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";

        formDataToSend.append("image", {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      // Log the FormData for debugging
      const formDataObj = {};
      formDataToSend._parts.forEach(([key, value]) => {
        formDataObj[key] = value;
      });
      console.log("FormData being sent:", formDataObj);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_outlet",
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Restaurant information updated successfully");
        navigation.goBack();
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to update restaurant information"
        );
      }
    } catch (error) {
      console.error("Update Error:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.msg ||
          "Failed to update restaurant information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpeningTimeChange = (event, selectedTime) => {
    setShowOpeningPicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setFormData((prev) => ({ ...prev, opening_time: timeString }));
    }
  };

  const handleClosingTimeChange = (event, selectedTime) => {
    setShowClosingPicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setFormData((prev) => ({ ...prev, closing_time: timeString }));
    }
  };

  if (loading && !restaurantData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }
  const fetchRestaurantTypes = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_outlet_type",
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const restaurantTypeList = response.data.outlet_type_list;
        const types = Object.entries(restaurantTypeList).map(
          ([key, value]) => ({
            key: key,
            name: value,
          })
        );
        setRestaurantTypeList(types);
        setRestaurantTypeModalVisible(true);
      } else {
        Alert.alert("Error", "Failed to fetch restaurant types.");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while fetching restaurant types: " + error.message
      );
    }
  };

  const fetchVegNonvegList = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_veg_or_nonveg_list",
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const vegNonvegList = Object.entries(
          response.data.veg_or_nonveg_list
        ).map(([key, value]) => ({
          key: key,
          name: value,
        }));
        setVegNonvegList(vegNonvegList);
        setVegModalVisible(true);
      } else {
        Alert.alert("Error", "Failed to fetch veg/non-veg options.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <>
      <CustomHeader title=" Edit Restaurant Info" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={newstyles.inner}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#6200ee"]}
                tintColor="#6200ee"
              />
            }
          >
            <View style={styles.formContainer}>
              <View style={styles.imageContainer}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.imageWrapper}
                >
                  {image || restaurantData?.image ? (
                    <Image
                      source={{ uri: image || restaurantData?.image }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View
                      style={[styles.profileImage, styles.placeholderContainer]}
                    >
                      <MaterialCommunityIcons
                        name="store"
                        size={40}
                        color="#666"
                      />
                    </View>
                  )}
                  <View style={styles.editIconContainer}>
                    <MaterialCommunityIcons
                      name="pencil"
                      size={20}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
              </View>
              <TextInput
                label="Restaurant Name *"
                value={formData.name}
                onChangeText={(text) => {
                  const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
                  setFormData((prev) => ({ ...prev, name: formattedText }));
                  setErrors((prev) => ({ ...prev, name: "" }));
                }}
                error={!!errors.name}
                mode="outlined"
                style={styles.input}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}

              <Pressable style={styles.input} onPress={fetchRestaurantTypes}>
                <Text style={styles.labelContainer}>
                  <Text style={styles.required}>*</Text>
                  <Text>Restaurant Type</Text>
                </Text>
                <View style={styles.dropdownDisplay}>
                  <Text>{restaurantType || "Select Restaurant Type"}</Text>
                  <RemixIcon name="arrow-down-s-line" size={24} />
                </View>
              </Pressable>

              <Pressable style={styles.input} onPress={fetchVegNonvegList}>
                <Text style={styles.labelContainer}>
                  <Text style={styles.required}>*</Text>
                  <Text>Veg/Non-Veg</Text>
                </Text>
                <View style={styles.dropdownDisplay}>
                  <Text>{vegNonveg || "Select Veg/Non-Veg"}</Text>
                  <RemixIcon name="arrow-down-s-line" size={24} />
                </View>
              </Pressable>
              <TextInput
                label="FSSAI Number"
                value={formData.fssainumber}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "");
                  setFormData((prev) => ({
                    ...prev,
                    fssainumber: numericText,
                  }));
                  setErrors((prev) => ({ ...prev, fssainumber: "" }));
                }}
                keyboardType="numeric"
                maxLength={14}
                error={!!errors.fssainumber}
                mode="outlined"
                style={styles.input}
              />
              {errors.fssainumber && (
                <Text style={styles.errorText}>{errors.fssainumber}</Text>
              )}

              <TextInput
                label="GST Number"
                value={formData.gstnumber}
                onChangeText={(text) => {
                  const formattedText = text
                    .replace(/[^0-9A-Z]/g, "")
                    .toUpperCase();
                  setFormData((prev) => ({
                    ...prev,
                    gstnumber: formattedText,
                  }));
                  if (formattedText.length === 15) {
                    if (!validateGST(formattedText)) {
                      setErrors((prev) => ({
                        ...prev,
                        gstnumber:
                          "Invalid GST format. Example: 29ABCDE1234F1Z5",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, gstnumber: "" }));
                    }
                  } else {
                    setErrors((prev) => ({ ...prev, gstnumber: "" }));
                  }
                }}
                placeholder="Example: 29ABCDE1234F1Z5"
                maxLength={15}
                error={!!errors.gstnumber}
                mode="outlined"
                style={styles.input}
                autoCapitalize="characters"
              />
              {errors.gstnumber && (
                <Text style={styles.errorText}>{errors.gstnumber}</Text>
              )}

              <TextInput
                label={
                  <Text style={styles.label}>
                    <Text style={{ color: "red" }}>*</Text> Mobile Number
                  </Text>
                }
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
                  setErrors((prev) => ({ ...prev, mobile: "" }));
                }}
                keyboardType="numeric"
                maxLength={10}
                error={!!errors.mobile}
                mode="outlined"
                style={styles.input}
              />
              {errors.mobile && (
                <Text style={styles.errorText}>{errors.mobile}</Text>
              )}

              <TextInput
                label="Service Charges (%)"
                value={formData.service_charges}
                onChangeText={(text) => {
                  if (validateDecimalNumber(text) || text === "") {
                    setFormData((prev) => ({
                      ...prev,
                      service_charges: text,
                    }));

                    const numValue = parseFloat(text);
                    if (text && (numValue < 0 || numValue > 100)) {
                      setErrors((prev) => ({
                        ...prev,
                        service_charges:
                          "Service charges must be between 0 and 100",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, service_charges: "" }));
                    }
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="Enter service charges (0-100)"
                error={!!errors.service_charges}
                mode="outlined"
                style={styles.input}
              />
              {errors.service_charges && (
                <Text style={styles.errorText}>{errors.service_charges}</Text>
              )}

              <TextInput
                label="GST (%)"
                value={formData.gst}
                onChangeText={(text) => {
                  if (validateDecimalNumber(text) || text === "") {
                    setFormData((prev) => ({
                      ...prev,
                      gst: text,
                    }));

                    const numValue = parseFloat(text);
                    if (text && (numValue < 0 || numValue > 100)) {
                      setErrors((prev) => ({
                        ...prev,
                        gst: "GST must be between 0 and 100",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, gst: "" }));
                    }
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="Enter GST percentage (0-100)"
                error={!!errors.gst}
                mode="outlined"
                style={styles.input}
              />
              {errors.gst && <Text style={styles.errorText}>{errors.gst}</Text>}

              <TextInput
                label="Address *"
                value={formData.address}
                onChangeText={(text) => {
                  // Only allow letters, numbers and spaces
                  const formattedText = text.replace(/[^a-zA-Z0-9\s]/g, "");

                  setFormData((prev) => ({
                    ...prev,
                    address: formattedText,
                  }));

                  // Real-time validation
                  if (formattedText.length < 5) {
                    setErrors((prev) => ({
                      ...prev,
                      address: "Address must be at least 5 characters long",
                    }));
                  } else if (formattedText.length > 30) {
                    setErrors((prev) => ({
                      ...prev,
                      address: "Address cannot exceed 30 characters",
                    }));
                  } else if (!validateAddress(formattedText)) {
                    setErrors((prev) => ({
                      ...prev,
                      address:
                        "Address can only contain letters, numbers, and spaces",
                    }));
                  } else {
                    setErrors((prev) => ({ ...prev, address: "" }));
                  }
                }}
                placeholder="Enter address (5-30 characters)"
                error={!!errors.address}
                mode="outlined"
                style={styles.input}
                multiline
                maxLength={30}
              />
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}

              <TextInput
                label="UPI ID *"
                value={formData.upi_id}
                onChangeText={(text) => {
                  // Remove spaces and special characters except @ . _ -
                  const formattedText = text
                    .replace(/[^a-zA-Z0-9@._-]/g, "")
                    .toLowerCase();

                  setFormData((prev) => ({
                    ...prev,
                    upi_id: formattedText,
                  }));

                  // Real-time validation
                  if (formattedText) {
                    if (formattedText.length < 6) {
                      setErrors((prev) => ({
                        ...prev,
                        upi_id: "UPI ID must be at least 6 characters",
                      }));
                    } else if (formattedText.length > 50) {
                      setErrors((prev) => ({
                        ...prev,
                        upi_id: "UPI ID cannot exceed 50 characters",
                      }));
                    } else if (!validateUPI(formattedText)) {
                      setErrors((prev) => ({
                        ...prev,
                        upi_id: "Invalid UPI ID format. Example: username@upi",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, upi_id: "" }));
                    }
                  } else {
                    setErrors((prev) => ({ ...prev, upi_id: "" }));
                  }
                }}
                placeholder="Example: username@upi (6-50 characters)"
                error={!!errors.upi_id}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={50}
              />
              {errors.upi_id && (
                <Text style={styles.errorText}>{errors.upi_id}</Text>
              )}

              <TextInput
                label={<Text style={styles.label}>Website</Text>}
                value={formData.website}
                onChangeText={(text) =>
                  setFormData({ ...formData, website: text })
                }
                mode="outlined"
                style={styles.input}
                placeholder="https://example.com"
              />

              <TextInput
                label={<Text style={styles.label}>WhatsApp Link</Text>}
                value={formData.whatsapp}
                onChangeText={(text) =>
                  setFormData({ ...formData, whatsapp: text })
                }
                mode="outlined"
                style={styles.input}
                placeholder="https://wa.me/your-number"
              />

              <TextInput
                label={<Text style={styles.label}>Facebook Link</Text>}
                value={formData.facebook}
                onChangeText={(text) =>
                  setFormData({ ...formData, facebook: text })
                }
                mode="outlined"
                style={styles.input}
                placeholder="https://facebook.com/your-page"
              />

              <TextInput
                label={<Text style={styles.label}>Instagram Link</Text>}
                value={formData.instagram}
                onChangeText={(text) =>
                  setFormData({ ...formData, instagram: text })
                }
                mode="outlined"
                style={styles.input}
                placeholder="https://instagram.com/your-profile"
              />

              <TextInput
                label={<Text style={styles.label}>Google Business Link</Text>}
                value={formData.google_business_link}
                onChangeText={(text) =>
                  setFormData({ ...formData, google_business_link: text })
                }
                mode="outlined"
                style={styles.input}
                placeholder="https://business.google.com/your-business"
              />

              <TextInput
                label={<Text style={styles.label}>Google Review Link</Text>}
                value={formData.google_review}
                onChangeText={(text) =>
                  setFormData({ ...formData, google_review: text })
                }
                mode="outlined"
                style={styles.input}
                placeholder="https://g.page/r/your-review-link"
              />

              <View style={styles.timeContainer}>
                <Text style={[styles.label, { marginBottom: 8 }]}>
                  <Text></Text> Operating Hours
                </Text>

                <View style={styles.timeInputsRow}>
                  <Pressable
                    style={styles.timeInput}
                    onPress={() => setShowOpeningPicker(true)}
                  >
                    <Text style={styles.timeLabel}>Opening Time</Text>
                    <Text style={styles.timeValue}>
                      {formData.opening_time || "Select Time"}
                    </Text>
                  </Pressable>

                  <Text style={styles.timeSeperator}>to</Text>

                  <Pressable
                    style={styles.timeInput}
                    onPress={() => setShowClosingPicker(true)}
                  >
                    <Text style={styles.timeLabel}>Closing Time</Text>
                    <Text style={styles.timeValue}>
                      {formData.closing_time || "Select Time"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.timeErrorContainer}>
                  {errors.opening_time && (
                    <Text style={styles.errorText}>{errors.opening_time}</Text>
                  )}
                  {errors.closing_time && (
                    <Text style={styles.errorText}>{errors.closing_time}</Text>
                  )}
                </View>
              </View>

              {showOpeningPicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleOpeningTimeChange}
                />
              )}

              {showClosingPicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleClosingTimeChange}
                />
              )}

              <View style={styles.switchContainer}>
                <Text style={newstyles.labelText}>Restaurant Open</Text>
                <Switch
                  value={formData.is_open}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_open: value })
                  }
                />
              </View>

              <Button
                mode="contained"
                onPress={handleUpdate}
                loading={loading}
                disabled={loading}
                style={styles.updateButton}
                icon={() => <Icon name="save" size={20} color="#fff" />}
              >
                Save
              </Button>
            </View>
            <Modal
              transparent={true}
              visible={vegModalVisible}
              onRequestClose={() => setVegModalVisible(false)}
            >
              <View style={styles.selectModalContainer}>
                <View style={styles.selectModalContent}>
                  <View style={styles.selectModalHeader}>
                    <Text style={styles.selectModalTitle}>
                      Select Veg/Non-Veg
                    </Text>
                    <TouchableOpacity onPress={() => setVegModalVisible(false)}>
                      <Icon name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={vegNonvegList}
                    keyExtractor={(item) => item.key.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.selectModalItem}
                        onPress={() => {
                          setVegNonveg(item.name);
                          setVegModalVisible(false);
                        }}
                      >
                        <Text>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>
            <Modal
              transparent={true}
              visible={restaurantTypeModalVisible}
              onRequestClose={() => setRestaurantTypeModalVisible(false)}
            >
              <View style={styles.selectModalContainer}>
                <View style={styles.selectModalContent}>
                  <View style={styles.selectModalHeader}>
                    <Text style={styles.selectModalTitle}>
                      Select Restaurant Type
                    </Text>
                    <TouchableOpacity
                      onPress={() => setRestaurantTypeModalVisible(false)}
                    >
                      <Icon name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={restaurantTypeList}
                    keyExtractor={(item) => item.key.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.selectModalItem}
                        onPress={() => {
                          setRestaurantType(item.name);
                          setRestaurantTypeModalVisible(false);
                        }}
                      >
                        <Text>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
        <CustomTabBar />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // margin: 10,
    backgroundColor: "#fff",
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  formContainer: {
    padding: 10,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  required: {
    color: "red",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
    marginBottom: 16,
  },
  updateButton: {
    marginBottom: 100,
    backgroundColor: "#6200ee",
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    marginBottom: 20,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
  },
  profileImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
  },
  placeholderContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  editIconContainer: {
    position: "absolute",
    right: 16,
    bottom: 16,
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
  dropdownDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginTop: 5,
  },
  selectModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  selectModalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  selectModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  selectModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  selectModalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  timeContainer: {
    marginBottom: 16,
  },
  timeInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    color: "#000",
  },
  timeSeperator: {
    marginHorizontal: 12,
    color: "#666",
  },
  errorText: {
    color: "red",
    marginTop: 5,
  },
  inputError: {
    borderColor: "red",
  },
  timeErrorContainer: {
    marginTop: 5,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 2,
  },
});
