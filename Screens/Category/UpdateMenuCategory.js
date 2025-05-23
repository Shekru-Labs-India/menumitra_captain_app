import React, { useEffect, useState, useLayoutEffect } from "react";
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
  RefreshControl,
  PermissionsAndroid,
  Linking,
  Animated,
} from "react-native";
import { Button, Text, TextInput, Switch } from "react-native-paper";
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

export default function UpdateMenuCategory({ route, navigation }) {
  const { menu_cat_id } = route.params; // get menu category ID from navigation params
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);

  const [vegNonveg, setVegNonveg] = useState(""); // default value
  const [vegModalVisible, setVegModalVisible] = useState(false); // for showing/hiding veg/non-veg modal
  const [vegNonvegList, setVegNonvegList] = useState([]); // for storing veg/non-veg list from API

  const [refreshing, setRefreshing] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
  });

  const [isImageRemoved, setIsImageRemoved] = useState(false);

  // Add a new state variable for tracking active status
  const [isActive, setIsActive] = useState(true);

  // Add a new state for the toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchCategoryDetails()])
      .catch((error) => {
        console.error("Error refreshing:", error);
        Alert.alert("Error", "Failed to refresh data");
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [menu_cat_id]);

  useEffect(() => {
    fetchCategoryDetails();
  }, [menu_cat_id]);

  const fetchCategoryDetails = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_category_view",
        {
          outlet_id: restaurantId,
          menu_cat_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(response.data);
      if (response.data.st === 1) {
        const categoryData = response.data.data;
        setName(categoryData.name);
        setProfileImage(categoryData.image);
        setVegNonveg(categoryData.food_type);
        setIsActive(categoryData.is_active || false); // Set the active status
      } else {
        Alert.alert("Error", "Failed to fetch category details.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.log(error);
    }
  };

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
            setImageSelected(true);
            setIsImageRemoved(false);
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
          setImageSelected(true);
          setIsImageRemoved(false);
        }
      } catch (error) {
        console.error("Error picking image:", error);
        Alert.alert("Error", "Failed to pick image");
      }
    }
  };

  const handleRemoveImage = () => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: () => {
          setProfileImage(null);
          setImageSelected(false);
          setIsImageRemoved(true);
        },
        style: "destructive",
      },
    ]);
  };

 const handleUpdateCategory = async () => {
  if (!name) {
    Alert.alert("Error", "Please fill out all fields with valid values.");
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
    formData.append("category_name", name);
    formData.append("outlet_id", restaurantId.toString());
    formData.append("menu_cat_id", menu_cat_id.toString());
    formData.append("user_id", userId.toString());
    formData.append("food_type", vegNonveg);

    // Handle image attachment based on state
    if (imageSelected && profileImage) {
      // New image selected
      const imageDetails = {
        uri: profileImage,
        type: "image/jpeg",
        name: "category_image.jpg",
      };
      formData.append("image", imageDetails);
    } else if (profileImage && !isImageRemoved) {
      // Existing image unchanged, send the URL
      formData.append("image", profileImage);
    }
    // No need to append image field if it's being removed, as we'll use the flag in URL

    console.log("Form data being sent:", Object.fromEntries(formData._parts));

    // Construct the appropriate URL based on whether the image is being removed
    let apiEndpoint = onGetProductionUrl() + "menu_category_update";
    if (isImageRemoved) {
      apiEndpoint += "?remove_image_flag=True";
    }

    const response = await axiosInstance.post(
      apiEndpoint,
      formData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      }
    );

    if (response.data.st === 1) {
      Alert.alert("Success", "Category updated successfully", [
        {
          text: "OK",
          onPress: async () => {
            if (route.params?.refresh) {
              await route.params.refresh();
            }
            navigation.goBack();
          },
        },
      ]);
    } else {
      throw new Error(response.data.msg || "Failed to update category");
    }
  } catch (error) {
    console.error("Error updating category:", error);
    Alert.alert(
      "Error",
      error.message || "Failed to update category. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  const handleDeleteCategory = async () => {
    setLoading(true);
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_category_delete",
        {
          outlet_id: restaurantId,
          menu_cat_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Category deleted successfully.");
        if (route.params?.refresh) {
          route.params.refresh();
        }
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to delete category. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const validateCategoryName = (text) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setErrors((prev) => ({ ...prev, name: "Category name is required" }));
      return false;
    }

    if (trimmedText.length < 3) {
      setErrors((prev) => ({
        ...prev,
        name: "Category name must be at least 3 characters",
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

  // Create a function to show the toast
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

  // Add a new function to handle the active status update
 

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0dcaf0"]}
            tintColor="#0dcaf0"
          />
        }
      >
        <TextInput
          label={
            <Text style={styles.label}>
              <Text style={{ color: "red" }}>*</Text> Category Name
            </Text>
          }
          value={name}
          onChangeText={(text) => {
            // Only allow letters and spaces
            const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
            setName(formattedText);
            validateCategoryName(formattedText);
          }}
          mode="outlined"
          style={[newstyles.input, errors.name && styles.errorInput]}
          error={!!errors.name}
          maxLength={50}
          placeholder="Enter category name"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        

        <TouchableOpacity onPress={pickImage} style={styles.card}>
          {!profileImage ? (
            <View style={styles.cardContent}>
              <Icon name="cloud-upload" size={40} color="#888" />
              <Text style={styles.cardTitle}>Click to Upload</Text>
              <Text style={styles.cardSubtitle}>(Max file size: 3Mb)</Text>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <Image source={{ uri: profileImage }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
              >
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

       

        <Button
          mode="contained"
          onPress={handleUpdateCategory}
          loading={loading}
          disabled={loading}
          style={[newstyles.submitButton, { width: "100%" }]}
          icon={() => (
            <RemixIcon name="ri-checkbox-circle-line" size={20} color="#fff" />
          )}
        >
          Save
        </Button>
      </ScrollView>
      <CustomTabBar />
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
  imageContainer: {
    position: "relative",
    width: 200,
    height: 200,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "red",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  categoryPicker: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 15,
    borderWidth: 0.5,
    borderColor: "#1a1919",
    borderRadius: 3,
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
  errorInput: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 8,
  },
  activeStatusContainer: {
    width: '100%',
    marginBottom: 20,
  },
  activeStatusLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switch: {
    transform: [{ scaleX: 1 }, { scaleY: 1 }],
  },
  activeText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  activeStatusContainerBottom: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  toastText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
