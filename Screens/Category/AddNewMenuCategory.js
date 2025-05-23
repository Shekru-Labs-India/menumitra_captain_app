import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  PermissionsAndroid,
  Linking,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import newstyles from "../newstyles";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomTabBar from "../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

export default function AddNewMenuCategory({ route, navigation }) {
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [vegNonveg, setVegNonveg] = useState(""); // default value
  const [vegModalVisible, setVegModalVisible] = useState(false); // for showing/hiding veg/non-veg modal
  const [vegNonvegList, setVegNonvegList] = useState([]); // for storing veg/non-veg list from API

  const [error, setError] = useState("");

  const validateCategoryName = (text) => {
    const trimmedText = text.trim();

    // Check if empty
    if (!trimmedText) {
      setError("Category name is required");
      return false;
    }

    // Check minimum length (2 characters)
    if (trimmedText.length < 2) {
      setError("Category name must be at least 2 characters");
      return false;
    }

    // Check maximum length (30 characters)
    if (trimmedText.length > 30) {
      setError("Category name cannot exceed 30 characters");
      return false;
    }

    // Allow only letters and spaces
    if (!/^[a-zA-Z\s]+$/.test(trimmedText)) {
      setError("Only letters and spaces are allowed");
      return false;
    }

    setError("");
    return true;
  };

  useEffect(() => {}, []);

  const pickImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            setProfileImage(fileReader.result);
          };
          fileReader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
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

        let pickedImage = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

        if (!pickedImage.canceled) {
          setProfileImage(pickedImage.assets[0].uri);
        }
      } catch (error) {
        console.error("Error picking image:", error);
        Alert.alert("Error", "Failed to pick image");
      }
    }
  };

  const handleSaveStaff = async () => {
    try {
      // Validate category name
      if (!validateCategoryName(name)) {
        return;
      }

      setLoading(true);
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      // Create form data properly
      const formData = new FormData();

      // Add text fields
      formData.append("category_name", name.trim());
      formData.append("outlet_id", restaurantId.toString());
      formData.append("user_id", userId.toString());

      // Add image if exists
      if (profileImage) {
        // Handle image upload for both web and mobile
        if (Platform.OS === "web") {
          // For web, handle base64 image
          const response = await fetch(profileImage);
          const blob = await response.blob();
          formData.append("image", blob, "category_image.jpg");
        } else {
          // For mobile
          const imageDetails = {
            uri: profileImage,
            type: "image/jpeg",
            name: "category_image.jpg",
          };
          formData.append("image", imageDetails);
        }
      }

      console.log("Sending form data:", Object.fromEntries(formData._parts));

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_category_create",
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
          transformRequest: (data, headers) => {
            return data; // Don't transform the data
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Category created successfully", [
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
        throw new Error(response.data.msg || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create category. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <TextInput
          label={
            <Text style={styles.label}>
              <Text style={{ color: "red" }}>*</Text> Category Name
            </Text>
          }
          value={name}
          onChangeText={(text) => {
            // Remove any characters except letters and spaces
            const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
            setName(formattedText);
            validateCategoryName(formattedText);
          }}
          mode="outlined"
          style={[newstyles.input, error && { borderColor: "#FF0000" }]}
          error={!!error}
          autoCapitalize="words" // Auto capitalize each word
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={pickImage} style={styles.card}>
          {!profileImage ? (
            <View style={styles.cardContent}>
              <Icon name="cloud-upload" size={40} color="#888" />
              <Text style={styles.cardTitle}>Click to Upload</Text>
              <Text style={styles.cardSubtitle}>(Max file size: 3Mb)</Text>
            </View>
          ) : (
            <Image
              source={
                profileImage
                  ? { uri: profileImage }
                  : require("../../assets/icons/person.png")
              }
              style={styles.image}
            />
          )}
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={handleSaveStaff}
          loading={loading}
          disabled={loading}
          style={newstyles.submitButton}
          icon={() => (
            <RemixIcon name="ri-checkbox-circle-line" size={20} color="#fff" />
          )}
        >
          Save
        </Button>
      </ScrollView>
      <CustomTabBar />
    </KeyboardAvoidingView>
  );
}
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  card: {
    width: "100%",
    margin: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    color: "#333",
    marginTop: 10,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#888",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  categoryPicker: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 15,
    borderWidth: 0.5,
    borderColor: "#1a1919",
    borderRadius: 14,
    marginBottom: 15,
  },
  modalContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",

    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 16,
  },
  errorText: {
    color: "#FF0000",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 5,
    marginBottom: 10,
  },
});
