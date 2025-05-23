import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Text,
  Linking,
  PermissionsAndroid,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Button, TextInput, Menu, Provider } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Icon from "react-native-vector-icons/MaterialIcons";
import newstyles from "../../newstyles";
import { getRestaurantId, getUserId } from "../../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import {
  onGetProductionUrl,
  onGetOwnerUrl,
} from "../../utils/ConstantFunctions";
import CustomTabBar from "../../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../../utils/axiosConfig";
import LottieView from 'lottie-react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';

export default function AddMenuProduct({ navigation }) {
  const [name, setName] = useState("");
  const [vegNonveg, setVegNonveg] = useState(""); // default value
  const [spicyIndex, setSpicyIndex] = useState(""); // default value
  const [fullPrice, setFullPrice] = useState("");
  const [halfPrice, setHalfPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]); // Instead of const [image, setImage] = useState(null);
  const [ingredients, setIngredients] = useState("");
  const [offer, setOffer] = useState("");
  const [rating, setRating] = useState(""); // default value
  const [loading, setLoading] = useState(false);
  const [menuCatId, setMenuCatId] = useState(null); // for storing selected menu_cat_id
  const [categories, setCategories] = useState([]); // for storing category list from API
  const [vegNonvegList, setVegNonvegList] = useState([]); // for storing veg/non-veg list from API
  const [modalVisible, setModalVisible] = useState(false); // for showing/hiding category modal
  const [vegModalVisible, setVegModalVisible] = useState(false); // for showing/hiding veg/non-veg modal

  const [spicyIndexList, setSpicyIndexList] = useState([]); // for storing spicy index list from API
  const [spicyModalVisible, setSpicyModalVisible] = useState(false); // for showing/hiding spicy index modal

  const [ratingList, setRatingList] = useState([]); // for storing rating list from API
  const [ratingModalVisible, setRatingModalVisible] = useState(false); // for showing/hiding rating modal

  // Add these validation states
  const [errors, setErrors] = useState({
    name: "",
    fullPrice: "",
    halfPrice: "",
    offer: "",
    description: "",
    ingredients: "",
  });

  const [userId, setUserId] = useState(null);
  const [imageError, setImageError] = useState("");
  const [showFullForm, setShowFullForm] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [showAILoading, setShowAILoading] = useState(false);

  // Add this state for animation
  const [borderAnimation] = useState(new Animated.Value(0));

  // Add another animation value for the image generation button
  const [imageBorderAnimation] = useState(new Animated.Value(0));

  // Fetch menu categories on component mount
  useEffect(() => {
    fetchCategories();
    fetchVegNonvegList();
    fetchSpicyIndexList();
    fetchRatingList();
    const fetchUserId = async () => {
      try {
        const id = await getUserId();
        setUserId(id);
      } catch (error) {
        console.error("Error fetching user ID:", error);
        Alert.alert("Error", "Failed to fetch user ID");
      }
    };

    fetchUserId();
  }, []);

  const fetchCategories = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_category_listview",
        { outlet_id: restaurantId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const categoryList = response.data.menucat_details.map((cat) => ({
          name: cat.category_name,
          id: cat.menu_cat_id ? cat.menu_cat_id.toString() : "",
        }));
        setCategories(categoryList);
      } else {
        console.log("Category API Error:", response.data);
        Alert.alert(
          "Error",
          response.data.msg || "Failed to fetch categories."
        );
      }
    } catch (error) {
      console.log("Category fetch error:", error.response?.data || error);
      Alert.alert("Error", "Failed to fetch categories. Please try again.");
    }
  };

  const fetchVegNonvegList = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_food_type_list",
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.st === 1) {
        const vegNonvegList = Object.entries(response.data.food_type_list).map(
          ([key, value]) => ({
            name: value,
            key: key,
          })
        );
        setVegNonvegList(vegNonvegList);
      } else {
        Alert.alert("Error", "Failed to fetch veg/non-veg options.");
      }
    } catch (error) {
      console.error("Error fetching veg/non-veg list:", error);
    }
  };
  
  const fetchSpicyIndexList = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_spicy_index_list",
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.st === 1) {
        const spicyList = Object.entries(response.data.spicy_index_list).map(
          ([key, value]) => ({
            name: value,
            key: key,
          })
        );
        setSpicyIndexList(spicyList);
      } else {
        Alert.alert("Error", "Failed to fetch spicy index.");
      }
    } catch (error) {
      console.error("Error fetching spicy index list:", error);
    }
  };

  const fetchRatingList = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const response = await axiosInstance.post(
        onGetProductionUrl() + "rating_list",
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.st === 1) {
        const ratingList = Object.entries(response.data.rating_list).map(
          ([key, value]) => ({
            name: value,
            key: key,
          })
        );
        setRatingList(ratingList);
      } else {
        console.log("Rating API Error:", response.data); // For debugging
        Alert.alert("Error", "Failed to fetch rating list.");
      }
    } catch (error) {
      console.error("Error fetching rating list:", error);
    }
  };


  const pickImage = async () => {
    if (images.length >= 5) {
      setImageError("Maximum 5 images allowed");
      return;
    }

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
        aspect: [4, 3],
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];

        // Check file size (fileSize is in bytes, convert to MB)
        const fileSizeInMB = selectedImage.fileSize / (1024 * 1024);

        if (fileSizeInMB > 3) {
          setImageError(
            `Image size must be less than 3MB. Current size: ${fileSizeInMB.toFixed(
              2
            )}MB`
          );
          return;
        }

        // Ensure we're getting a JPEG and append to existing images
        if (selectedImage.uri) {
          setImages((prevImages) => [...prevImages, selectedImage.uri]);
          setImageError("");

          console.log("Selected image details:", {
            uri: selectedImage.uri,
            width: selectedImage.width,
            height: selectedImage.height,
            type: selectedImage.type,
            fileSize: `${fileSizeInMB.toFixed(2)}MB`,
          });
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageError("");
  };

  // Add validation functions
  const validateName = (text) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setErrors((prev) => ({ ...prev, name: "Menu name is required" }));
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
    if (!/^[a-zA-Z\s0-9]+$/.test(trimmedText)) {
      setErrors((prev) => ({
        ...prev,
        name: "Only letters, numbers, and spaces allowed",
      }));
      return false;
    }

    setErrors((prev) => ({ ...prev, name: "" }));
    return true;
  };

  const validatePrice = (text, field) => {
    // Remove any spaces from the input
    const trimmedText = text.trim();

    if (field === "fullPrice" && !trimmedText) {
      setErrors((prev) => ({ ...prev, [field]: "Full price is required" }));
      return false;
    }

    // Allow empty value for half price
    if (field === "halfPrice" && !trimmedText) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
      return true;
    }

    // Check for valid number format (integers or floating points)
    if (!/^\d*\.?\d*$/.test(trimmedText)) {
      setErrors((prev) => ({ ...prev, [field]: "Enter a valid price" }));
      return false;
    }

    // Convert to number for value checking
    const price = parseFloat(trimmedText);

    if (isNaN(price) || price <= 0) {
      setErrors((prev) => ({
        ...prev,
        [field]: "Price must be greater than 0",
      }));
      return false;
    }

    // Validate decimal places (maximum 2 decimal places)
    if (trimmedText.includes(".") && trimmedText.split(".")[1].length > 2) {
      setErrors((prev) => ({
        ...prev,
        [field]: "Maximum 2 decimal places allowed",
      }));
      return false;
    }

    setErrors((prev) => ({ ...prev, [field]: "" }));
    return true;
  };

  const validateOffer = (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setErrors((prev) => ({ ...prev, offer: "" })); // Clear error if empty
      return true;
    }
    // Only allow whole numbers for offer
    if (!/^\d+$/.test(trimmedText)) {
      setErrors((prev) => ({ ...prev, offer: "Only whole numbers allowed" }));
      return false;
    }
    const offerValue = parseInt(trimmedText);
    if (offerValue < 0 || offerValue > 100) {
      setErrors((prev) => ({
        ...prev,
        offer: "Offer must be between 0 and 100",
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, offer: "" }));
    return true;
  };

  const validateDescription = (text) => {
    if (!text) return true; // Optional field
    // Allow letters, numbers, basic punctuation, and common symbols
    if (!/^[a-zA-Z0-9\s.,!?'-]+$/.test(text)) {
      setErrors((prev) => ({
        ...prev,
        description: "Invalid characters in description",
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, description: "" }));
    return true;
  };

  const validateIngredients = (text) => {
    if (!text) return true; // Optional field
    // Allow letters, commas, and spaces
    if (!/^[a-zA-Z\s,]+$/.test(text)) {
      setErrors((prev) => ({
        ...prev,
        ingredients: "Only letters and commas allowed",
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, ingredients: "" }));
    return true;
  };

  // Add this validation function
  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Menu name is required";
      isValid = false;
    }

    // Validate full price
    if (!fullPrice.trim()) {
      newErrors.fullPrice = "Full price is required";
      isValid = false;
    }

    // Validate menu category
    if (!menuCatId) {
      Alert.alert("Error", "Please select a menu category");
      isValid = false;
    }

    // Validate food type
    if (!vegNonveg) {
      Alert.alert("Error", "Please select a food type");
      isValid = false;
    }

    // Update error states
    setErrors(newErrors);
    return isValid;
  };

  // Add this helper function to handle image resizing and conversion
  const processImage = async (base64Image) => {
    try {
      // Remove data URI prefix if present
      const base64Data = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1]
        : base64Image;

      // Convert to smaller size/format if needed
      // You might want to add image compression here
      
      return base64Data;
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  // Update the handleAddProduct function
  const handleAddProduct = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const formData = new FormData();
      formData.append("outlet_id", restaurantId);
      formData.append("name", name.trim());
      formData.append("menu_cat_id", menuCatId);
      formData.append("food_type", vegNonveg);
      formData.append("spicy_index", spicyIndex);
      formData.append("full_price", fullPrice);
      formData.append("half_price", halfPrice || "0");
      formData.append("description", description.trim());
      formData.append("ingredients", ingredients.trim());
      formData.append("offer", offer || "0");
      formData.append("user_id", userId);

      // Handle images
      if (images.length > 0) {
        images.forEach((imageUri, index) => {
          // Extract filename from URI
          const uriParts = imageUri.split("/");
          const filename = uriParts[uriParts.length - 1];

          formData.append("images", {
            uri: imageUri,
            type: "image/jpeg",
            name: filename,
          });
        });
      }

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_create",
        formData,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Complete API Response:", response.data);

      if (response.data.st === 1) {
        Alert.alert("Success", "Menu item added successfully", [
          {
            text: "OK",
            onPress: () => {
              resetForm();
              navigation.navigate("MenuScreen", {
                refresh: true,
                timestamp: Date.now(),
              });
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to add menu item");
      }
    } catch (error) {
      console.error("Error adding menu item:", error);
      Alert.alert(
        "Error",
        "Failed to add menu item. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Add this function for the border animation
  const animateBorder = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  // Add animation function for image generation
  const animateImageBorder = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(imageBorderAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(imageBorderAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  // Update the handleGenerateAI function
  const handleGenerateAI = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter menu name first");
      return;
    }

    setShowAILoading(true);
    animateBorder();
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "ai_genrate_menu_details",
        {
          outlet_id: restaurantId,
          name: name.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        console.log("AI generated data:", response.data);
        
        // More robust handling of description
        if (response.data.Description || response.data.description) {
          setDescription(response.data.Description || response.data.description || "");
        }

        // More robust handling of ingredients
        if (response.data.Ingredients || response.data.ingredients) {
          setIngredients(response.data.Ingredients || response.data.ingredients || "");
        }

        // Handle food type with case-insensitive comparison
        const foodType = (response.data["Food Type"] || response.data.food_type || "").toLowerCase();
        if (foodType) {
          const vegNonvegOption = vegNonvegList.find(
            item => item.name.toLowerCase() === foodType ||
                   item.key.toLowerCase() === foodType
          );

          if (vegNonvegOption) {
            setVegNonveg(vegNonvegOption.key);
            console.log("Set veg/non-veg to:", vegNonvegOption.key);
          }
        }

        // Handle spicy index with more robust parsing
        const spicyLevel = response.data["Spicy Index"] || response.data.spicy_index;
        if (spicyLevel !== undefined && spicyLevel !== null) {
          const spicyString = spicyLevel.toString();
          const spicyOption = spicyIndexList.find(
            item => item.key === spicyString || item.name === spicyString
          );

          if (spicyOption) {
            setSpicyIndex(spicyOption.key);
            console.log("Set spicy index to:", spicyOption.key);
          }
        }

        setShowFullForm(true);
        setShowButtons(false);
      }
    } catch (error) {
      console.error("Error generating AI content:", error);
      Alert.alert(
        "Error",
        "Failed to generate content. Please try filling manually."
      );
    } finally {
      setShowAILoading(false);
    }
  };

  // Add function to handle manual fill
  const handleManualFill = () => {
    setShowFullForm(true);
    setShowButtons(false);
  };

  // Update the handleGenerateImage function
  const handleGenerateImage = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter menu name first");
      return;
    }

    setImageLoading(true);
    animateImageBorder(); // Start the image border animation
    try {
      
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "ai_genrate_image_details",
        {
          prompt: name.trim(),
          description: description || `${name.trim()} is a delicious dish`, // Use description if available
          image_count: 1
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.image) {
        // Process the received base64 image
        const processedImage = await processImage(response.data.image);
        
        // Add the new image to the images array
        setImages(prevImages => [...prevImages, `data:image/jpeg;base64,${processedImage}`]);
      } else {
        throw new Error("No image data received");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      Alert.alert(
        "Error",
        "Failed to generate image. Please try again."
      );
    } finally {
      setImageLoading(false);
    }
  };

  // Add this function to reset all form fields
  const resetForm = () => {
    setName("");
    setVegNonveg("");
    setSpicyIndex("");
    setFullPrice("");
    setHalfPrice("");
    setDescription("");
    setImages([]);
    setIngredients("");
    setOffer("");
    setRating("");
    setMenuCatId(null);
    setImageError("");
    setShowFullForm(false);
    setShowButtons(true);
    setErrors({
      name: "",
      fullPrice: "",
      halfPrice: "",
      offer: "",
      description: "",
      ingredients: "",
    });
  };

  // Add useEffect to reset form when navigating back
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reset form when screen comes into focus
      resetForm();
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Always visible fields */}
        <TextInput
          mode="outlined"
          label="Menu Name *"
          placeholder="Enter menu name"
          value={name}
          onChangeText={(text) => {
            const formattedText = text.replace(/[^a-zA-Z\s0-9]/g, "");
            setName(formattedText);
            validateName(formattedText);
          }}
          error={!!errors.name}
          style={[styles.input, errors.name && styles.errorInput]}
          maxLength={50}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        {/* Price fields in a row */}
        <View style={styles.priceContainer}>
          <View style={styles.priceField}>
            <TextInput
              mode="outlined"
              label="Full Price *"
              placeholder="Enter full price"
              value={fullPrice}
              onChangeText={(text) => {
                const formattedText = text
                  .replace(/[^0-9.]/g, "")
                  .replace(/(\..*)\./g, "$1");
                setFullPrice(formattedText);
                validatePrice(formattedText, "fullPrice");
              }}
              keyboardType="decimal-pad"
              error={!!errors.fullPrice}
              style={[styles.input, errors.fullPrice && styles.errorInput]}
            />
            {errors.fullPrice && (
              <Text style={styles.errorText}>{errors.fullPrice}</Text>
            )}
          </View>

          
        </View>

        {/* Generate/Manual buttons */}
        {showButtons && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              onPress={handleManualFill}
              style={styles.manualTextButton}
            >
              <Text style={styles.manualText}>Manually</Text>
            </TouchableOpacity>

            <Animated.View style={[
              styles.buttonWrapper,
              {
                borderColor: borderAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#4CAF50', '#00BCD4'] // Green to Cyan
                })
              }
            ]}>
              <TouchableOpacity
                style={styles.aiOutlineButton}
                onPress={handleGenerateAI}
                disabled={showAILoading}
              >
                {showAILoading ? (
                  <>
                    <ExpoImage 
                      source={require('../../../assets/animations/AI-animation-unscreen.gif')}
                      style={styles.aiButtonIcon}
                      contentFit="contain"
                      cachePolicy="none"
                    />
                    <Text style={[styles.aiOutlineButtonText, { color: '#4CAF50' }]}>Generate by AI</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="auto-awesome" size={24} color="#4CAF50" />
                    <Text style={[styles.aiOutlineButtonText, { color: '#4CAF50' }]}>Generate by AI</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* Remaining form fields */}
        {showFullForm && (
          <>
            {/* Menu Category dropdown moved inside conditional rendering */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.dropdownLabel}>
                  {menuCatId
                    ? categories.find((cat) => cat.id === menuCatId)?.name
                    : "Select Menu Category *"}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              mode="outlined"
              label="Description"
              placeholder="Enter description"
              value={description}
              onChangeText={(text) => {
                if (text.length <= 500) {
                  const formattedText = text.replace(/[^a-zA-Z0-9\s.,!?'-]/g, "");
                  setDescription(formattedText);
                  validateDescription(formattedText);
                }
              }}
              multiline
              numberOfLines={3}
              maxLength={500}
              error={!!errors.description}
              style={[styles.input, errors.description && styles.errorInput]}
            />
            <View style={styles.counterContainer}>
              <Text 
                style={[
                  styles.charCounter, 
                  description.length >= 500 && styles.charCounterWarning
                ]}
              >
                {description.length}/500 characters
              </Text>
            </View>
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}

            <TextInput
              mode="outlined"
              label="Ingredients"
              placeholder="Enter ingredients"
              value={ingredients}
              onChangeText={(text) => {
                const formattedText = text.replace(/[^a-zA-Z\s,]/g, "");
                setIngredients(formattedText);
                validateIngredients(formattedText);
              }}
              error={!!errors.ingredients}
              style={[styles.input, errors.ingredients && styles.errorInput]}
            />
            {errors.ingredients && (
              <Text style={styles.errorText}>{errors.ingredients}</Text>
            )}

            {/* Food Type and Spicy Level dropdowns */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setVegModalVisible(true)}
              >
                <Text style={styles.dropdownLabel}>
                  {vegNonveg ? vegNonveg : "Select Food Type *"}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setSpicyModalVisible(true)}
              >
                <Text style={styles.dropdownLabel}>
                  {spicyIndex ? spicyIndex : "Select Spicy Level"}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Offer input field - added back */}
            <TextInput
              mode="outlined"
              label="Offer (%)"
              placeholder="Enter offer percentage"
              value={offer}
              onChangeText={(text) => {
                const formattedText = text.replace(/[^0-9]/g, "");
                setOffer(formattedText);
                validateOffer(formattedText);
              }}
              keyboardType="numeric"
              error={!!errors.offer}
              style={[styles.input, errors.offer && styles.errorInput]}
              maxLength={3}
            />
            {errors.offer && <Text style={styles.errorText}>{errors.offer}</Text>}

            {/* Image upload section */}
            <View style={styles.imageSection}>
              <View style={styles.imageHeaderContainer}>
                <Text style={styles.sectionTitle}>Upload Images</Text>
                <Animated.View style={[
                  styles.buttonWrapper,
                  {
                    borderColor: imageBorderAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['#9C27B0', '#E91E63'] // Purple to Pink
                    })
                  }
                ]}>
                  <TouchableOpacity
                    style={styles.aiGenerateImageButton}
                    onPress={handleGenerateImage}
                    disabled={imageLoading}
                  >
                    {imageLoading ? (
                      <View style={styles.aiButtonContent}>
                        <ExpoImage 
                          source={require('../../../assets/animations/AI-animation-unscreen.gif')}
                          style={styles.aiButtonIcon}
                          contentFit="contain"
                          cachePolicy="none"
                        />
                        <Text style={[styles.aiGenerateImageText, { color: '#9C27B0' }]}>Generate Image</Text>
                      </View>
                    ) : (
                      <View style={styles.aiButtonContent}>
                        <MaterialIcons name="auto-awesome" size={24} color="#9C27B0" />
                        <Text style={[styles.aiGenerateImageText, { color: '#9C27B0' }]}>Generate Image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
              
              <Text style={styles.subtitle}>Max image size 3MB</Text>
              {imageError && <Text style={styles.errorText}>{imageError}</Text>}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageScrollView}
              >
                {images.map((img, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: img }} style={styles.thumbnailImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 5 && (
                  <View style={styles.imageContainer}>
                    {imageLoading ? (
                      <View style={styles.aiGeneratingContainer}>
                        <ExpoImage 
                          source={require('../../../assets/animations/AI-animation-unscreen.gif')}
                          style={styles.imageLottieAnimation}
                          contentFit="contain"
                          cachePolicy="none"
                        />
                        <Text style={styles.aiGeneratingText}>Generating...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addImageButton}
                        onPress={pickImage}
                      >
                        <Icon name="add" size={40} color="#888" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Save button */}
            <Button
              mode="contained"
              style={newstyles.submitButton}
              icon={() => (
                <RemixIcon name="ri-checkbox-circle-line" size={20} color="#fff" />
              )}
              onPress={handleAddProduct}
              loading={loading}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </>
        )}

        {/* Modal for category selection */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Menu Category</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Icon name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        menuCatId === item.id && styles.selectedItem,
                      ]}
                      onPress={() => {
                        setMenuCatId(item.id);
                        setModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          menuCatId === item.id && styles.selectedItemText,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Modal for veg/non-veg selection */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={vegModalVisible}
          onRequestClose={() => setVegModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setVegModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Food Type</Text>
                  <TouchableOpacity onPress={() => setVegModalVisible(false)}>
                    <Icon name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={vegNonvegList}
                  keyExtractor={(item) => item.key}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        vegNonveg === item.key && styles.selectedItem,
                      ]}
                      onPress={() => {
                        setVegNonveg(item.key);
                        setVegModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          vegNonveg === item.key && styles.selectedItemText,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Modal for spicy index selection */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={spicyModalVisible}
          onRequestClose={() => setSpicyModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setSpicyModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Spicy Level</Text>
                  <TouchableOpacity onPress={() => setSpicyModalVisible(false)}>
                    <Icon name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={spicyIndexList}
                  keyExtractor={(item) => item.key}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        spicyIndex === item.key && styles.selectedItem,
                      ]}
                      onPress={() => {
                        setSpicyIndex(item.key);
                        setSpicyModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          spicyIndex === item.key && styles.selectedItemText,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Rating Picker */}
       

        {/* Rating Modal */}
      
      </ScrollView>
      <CustomTabBar />
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 2,
  },
  asterisk: {
    color: "red", // Red color for the asterisk
  },
  outlinedInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginTop: 8,
    justifyContent: "center",
    height: 50,
  },
  inner: {
    padding: 16,
    paddingBottom: 100,
  },
  inputContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: "#666",
  },
  required: {
    color: "red",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 8,
  },
  offerInput: {
    marginTop: 0,
  },
  categoryPicker: {
    backgroundColor: "#fff",
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 4,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  column: {
    flex: 1,
    marginHorizontal: 5,
    marginTop: 2,
  },
  columnInput: {
    marginHorizontal: 0,
  },
  card: {
    width: "100%",
    height: 120,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxHeight: "80%",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedItem: {
    backgroundColor: "#f0f9ff",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  selectedItemText: {
    color: "#2563eb",
    fontWeight: "500",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 16,
    color: "#666",
  },
  dropdownContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  errorInput: {
    borderColor: "#dc3545",
    borderWidth: 1,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  imageSection: {
    marginVertical: 16,
  },
  imageHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  aiGenerateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  imageScrollView: {
    flexDirection: 'row',
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    right: 5,
    top: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  generateButton: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  generateButton: {
    backgroundColor: '#4CAF50',
  },
  manualButton: {
    backgroundColor: '#2196F3',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceField: {
    flex: 1,
    marginHorizontal: 4,
  },
  aiLoadingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiLoadingContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  aiLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  aiGeneratingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  imageLottieAnimation: {
    width: 60,
    height: 60,
  },
  aiGeneratingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  manualTextButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  manualText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  aiOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  aiGenerateImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  aiButtonIcon: {
    width: 28,
    height: 28,
    marginRight: 4,
  },
  aiOutlineButtonText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  aiGenerateImageText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  counterContainer: {
    alignItems: 'flex-start',
    marginTop: 0,
    marginBottom: 8,
    // paddingRight: 0,
  },
  charCounter: {
    fontSize: 12,
    color: '#666',
  },
  charCounterWarning: {
    color: '#dc3545',
  }
});
