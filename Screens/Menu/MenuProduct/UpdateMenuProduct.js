import React, {
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  PermissionsAndroid,
  Linking,
  Animated,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import newstyles from "../../newstyles";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getRestaurantId, getUserId } from "../../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import {
  onGetProductionUrl,
  onGetOwnerUrl,
} from "../../utils/ConstantFunctions";
import CustomTabBar from "../../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../../utils/axiosConfig";
import { getSettings } from '../../../utils/getSettings';

const { width } = Dimensions.get("window");

const toTitleCase = (str) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Add this validation function at the top level
const validateMenuName = (text) => {
  return /^[a-zA-Z\s0-9]+$/.test(text);
};

export default function UpdateMenuProduct({ navigation, route }) {
  const { menuId } = route.params; // Get the menu ID from navigation params
  const [name, setName] = useState("");
  const [vegNonveg, setVegNonveg] = useState("");
  const [spicyIndex, setSpicyIndex] = useState("");
  const [rating, setRating] = useState("");
  const [fullPrice, setFullPrice] = useState("");
  const [halfPrice, setHalfPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [ingredients, setIngredients] = useState("");
  const [offer, setOffer] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuCatId, setMenuCatId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [vegNonvegList, setVegNonvegList] = useState([]);
  const [vegModalVisible, setVegModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [spicyIndexList, setSpicyIndexList] = useState([]);
  const [spicyModalVisible, setSpicyModalVisible] = useState(false);

  const [ratingList, setRatingList] = useState([]);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [isSpecial, setIsSpecial] = useState(false);
  const [vegNonvegModalVisible, setVegNonvegModalVisible] = useState(false);

  // Add validation states
  const [errors, setErrors] = useState({
    name: "",
    fullPrice: "", 
    description: "",
    menuCatId: "",
    vegNonveg: "",
    spicyIndex: "",
  });

  // Add loading state for button
  const [isToggleDisabled, setIsToggleDisabled] = useState(false);

  // Add state to track API call status
  const [isApiCalling, setIsApiCalling] = useState(false);

  // Add formData state at the top of your component
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    full_price: "",
    half_price: "",
    offer: "",
    is_available: true,
    is_special: isSpecial ? "1" : "0",
    image: null,
  });

  // Add tempSpecial state to track temporary changes
  const [tempSpecial, setTempSpecial] = useState(false);

  // Add userId state
  const [userId, setUserId] = useState(null);

  // Add imageSelected state
  const [imageSelected, setImageSelected] = useState(false);

  // Add imageError state
  const [imageError, setImageError] = useState("");

  // Add special status options
  const specialOptions = [
    { label: "Special", value: true },
    { label: "Non Special", value: false },
  ];

  // Add settings state
  const [settings, setSettings] = useState({ POS_show_menu_image: true });

  // Add active status toggle states
  const [isActive, setIsActive] = useState(true);
  const [isActiveLoading, setIsActiveLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Store all images data - both existing and new
  const [imageData, setImageData] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);

  // Add useEffect to fetch userId when component mounts
  useEffect(() => {
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

  // Add this useEffect to fetch categories first
  useEffect(() => {
    const fetchCategoriesFirst = async () => {
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
            id: Number(cat.menu_cat_id),
          }));
          setCategories(categoryList);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategoriesFirst();
  }, []); // Empty dependency array to run once on mount

  // Add this useEffect to load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await getSettings();
        if (appSettings) {
          console.log("Loaded settings in UpdateMenuProduct:", appSettings);
          setSettings(appSettings);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Validation function
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

    // Validate spicy index
   

    // Update error states
    setErrors(newErrors);
    return isValid;
  };

  // Fetch categories and product details on component mount
  useEffect(() => {
    fetchCategories();
    fetchVegNonvegList();
    fetchSpicyIndexList();
    fetchRatingList();
    fetchProductDetails();
    const fetchUserId = async () => {
      const id = await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // Execute all fetch calls, ensuring they are Promises
    Promise.all([
      fetchCategories(),
      fetchVegNonvegList(),
      fetchSpicyIndexList(),
      fetchRatingList(),
      fetchProductDetails(),
    ]).finally(() => {
      setRefreshing(false); // Ensures refreshing state resets after all requests finish
    });
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
        Alert.alert("Error", "Failed to fetch categories.");
      }
    } catch (error) {
      console.error("Category fetch error:", error);
      Alert.alert("Error", "Failed to fetch categories: " + error.message);
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
        Alert.alert(t("Error"), t("Failed to fetch veg/non-veg options."));
      }
    } catch (error) {
      console.error("Error fetching veg/non-veg list:", error);
      Alert.alert(t("Error"), error.message);
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
        console.log("Rating list:", ratingList);
        setRatingList(ratingList);

        if (!rating) {
          setRating("0.0");
        }
      } else {
        console.log("Rating API Error:", response.data);
        Alert.alert(
          t("Error"),
          response.data.msg || t("Failed to fetch rating list.")
        );
      }
    } catch (error) {
      console.error("Rating fetch error:", error.response?.data || error);
      Alert.alert(t("Error"), t("Unable to fetch rating list. Please try again."));
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
        Alert.alert(t("Error"), t("Failed to fetch spicy index."));
      }
    } catch (error) {
      console.error("Error fetching spicy index list:", error);
    }
  };

  const fetchProductDetails = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_view",
        {
          outlet_id: restaurantId,
          menu_id: menuId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const menuDetails = response.data.data;
        setName(menuDetails.name || "");
        setDescription(menuDetails.description || "");
        setMenuCatId(menuDetails.menu_cat_id?.toString() || "");
        setFullPrice(menuDetails.full_price?.toString() || "");
        setHalfPrice(menuDetails.half_price?.toString() || "");
        setOffer(menuDetails.offer?.toString() || "");
        setIsSpecial(menuDetails.is_special === "1" || menuDetails.is_special === true);
        setRating(menuDetails.rating || "0.0");
        setIngredients(menuDetails.ingredients || "");
        setVegNonveg(menuDetails.food_type || "");
        setSpicyIndex(menuDetails.spicy_index || "");
        setIsActive(menuDetails.is_active !== false);

        // Process images from API response
        if (menuDetails.images && Array.isArray(menuDetails.images)) {
          const processedImages = [];
          
          menuDetails.images.forEach(img => {
            if (typeof img === 'object' && img.image && img.image_id) {
              // Convert ID to number to ensure consistency
              const imageId = Number(img.image_id);
              processedImages.push({
                url: img.image,
                id: imageId,
                isExisting: true
              });
            } else if (typeof img === 'string') {
              processedImages.push({
                url: img,
                isExisting: true
              });
            }
          });
          
          setImageData(processedImages);
          // Initialize with empty array - we'll add IDs to remove when user removes images
          setRemovedImageIds([]);
          
          console.log("Initial image data:", JSON.stringify(processedImages));
        }
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      Alert.alert("Error", "Failed to load menu details: " + error.message);
    }
  };

  // Add useEffect to set initial special state
  useEffect(() => {
    if (route.params?.menuItem) {
      const { menuItem } = route.params;
      const specialStatus = menuItem.is_special === true;
      setIsSpecial(specialStatus);
      setTempSpecial(specialStatus); // Set initial temp state

      setFormData({
        ...formData,
        name: menuItem.name || "",
        description: menuItem.description || "",
        category_id: menuItem.category_id?.toString() || "",
        full_price: menuItem.full_price?.toString() || "",
        half_price: menuItem.half_price?.toString() || "",
        offer: menuItem.offer ? menuItem.offer.toString() : "",
        is_available: menuItem.is_available === 1,
        is_special: specialStatus,
        image: menuItem.image || null,
      });
    }
  }, [route.params?.menuItem]);

  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case "full_price":
        if (!value || value.trim() === "") {
          return "Full price is required";
        }
        if (isNaN(value) || Number(value) <= 0) {
          return "Please enter a valid price greater than 0";
        }
        return "";
      // ... other field validations
      default:
        return "";
    }
  };

  // Add navigation listener to reset temp state
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (tempSpecial !== isSpecial) {
        // Reset temp state to match actual state
        setTempSpecial(isSpecial);
      }
    });

    return unsubscribe;
  }, [navigation, tempSpecial, isSpecial]);

  const pickImage = async () => {
    try {
      if (imageData.length >= 5) {
        setImageError("You can only upload up to 5 images");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          url: result.assets[0].uri,
          isNew: true,
          file: {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: result.assets[0].uri.split('/').pop(),
          }
        };
        
        // Add the new image to imageData
        setImageData(prev => [...prev, newImage]);
        setImageError("");
        
        console.log("Added new image:", JSON.stringify(newImage));
        console.log("Updated image data:", JSON.stringify([...imageData, newImage]));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // CRITICAL FIX: Modified removeImage function to track IDs to REMOVE
  const removeImage = (index) => {
    const imageToRemove = imageData[index];
    
    console.log("Removing image at index:", index);
    console.log("Image to remove:", JSON.stringify(imageToRemove));
    
    // If it's an existing image, ADD its ID to the list of IDs to REMOVE
    if (imageToRemove.isExisting && imageToRemove.id) {
      const idToRemove = Number(imageToRemove.id);
      setRemovedImageIds(prev => {
        const updated = [...prev, idToRemove];
        console.log("Updated removedImageIds:", JSON.stringify(updated));
        return updated;
      });
    }
    
    // Remove the image from imageData array
    setImageData(prev => {
      const updated = prev.filter((_, i) => i !== index);
      console.log("Updated image data after removal:", JSON.stringify(updated));
      return updated;
    });
    
    setImageError("");
  };

  // Improved handleSubmit function
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(), 
        AsyncStorage.getItem("access_token"),
      ]);

      const formData = new FormData();
      
      // Append basic menu details
      formData.append("menu_id", menuId);
      formData.append("outlet_id", restaurantId);
      formData.append("user_id", userId);
      formData.append("name", name);
      formData.append("full_price", fullPrice);
      formData.append("food_type", vegNonveg);
      formData.append("menu_cat_id", menuCatId);
      
      // Optional fields
      if (halfPrice) formData.append("half_price", halfPrice);
      if (spicyIndex) formData.append("spicy_index", spicyIndex);
      if (offer) formData.append("offer", offer);
      if (rating) formData.append("rating", rating);
      if (description) formData.append("description", description);
      if (ingredients) formData.append("ingredients", ingredients);
      
      // Special status
      formData.append("is_special", isSpecial ? "1" : "0");
      
      // Handle new images - each new image is appended separately with the same key name
      const newImages = imageData.filter(img => img.isNew && img.file);
      if (newImages.length > 0) {
        newImages.forEach(image => {
          formData.append("images", image.file);
        });
        console.log(`Adding ${newImages.length} new images`);
      }
      
      // CRITICAL FIX: We only send the removedImageIds if there are any
      // This tells the API which existing images to REMOVE
      if (removedImageIds.length > 0) {
        formData.append("existing_image_ids", JSON.stringify(removedImageIds));
        console.log("IDs of images to remove:", JSON.stringify(removedImageIds));
      }
      
      console.log("Submitting form data");
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_update",
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      if (response.data.st === 1) {
        Alert.alert("Success", "Menu item updated successfully", [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("MenuScreen", {
                refresh: true,
                timestamp: Date.now(),
              });
            },
          },
        ]);
      } else {
        throw new Error(response.data.msg || "Failed to update menu item");
      }
    } catch (error) {
      console.error("Error updating menu item:", error);
      Alert.alert(
        "Error",
        error.response?.data?.msg || error.message || "Failed to update menu item"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderSpecialStatus = () => (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleText}>Special Menu</Text>
      <View style={styles.switchContainer}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#0dcaf0"
            style={styles.toggleLoader}
          />
        ) : (
          <Switch
            value={isSpecial}
            onValueChange={async (newValue) => {
              try {
                const [restaurantId, userId, accessToken] = await Promise.all([
                  getRestaurantId(),
                  getUserId(),
                  AsyncStorage.getItem("access_token"),
                ]);

                // Show loading state
                setLoading(true);

                const response = await axiosInstance.post(
                  onGetProductionUrl() + "make_menu_special_non_special",
                  {
                    outlet_id: restaurantId,
                    menu_id: menuId,
                    user_id: userId,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                  }
                );

                if (response.data.st === 1) {
                  setIsSpecial(newValue);
                  Alert.alert(
                    "Success",
                    newValue
                      ? "Menu marked as special"
                      : "Menu removed from special"
                  );
                } else {
                  Alert.alert(
                    "Error",
                    response.data.msg || "Failed to update special status"
                  );
                }
              } catch (error) {
                console.error("Error updating special status:", error);
                Alert.alert(
                  "Error",
                  "Failed to update special status. Please try again."
                );
              } finally {
                setLoading(false);
              }
            }}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isSpecial ? "#0dcaf0" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
          />
        )}
      </View>
    </View>
  );

  // Update the renderCategoryDropdown (keep everything else the same)
  const renderCategoryDropdown = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.labelText}>
        Menu Category <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.dropdownText}>
          {categories.find((cat) => cat.id === menuCatId)?.name || "Select Category"}
        </Text>
        <Icon name="arrow-drop-down" size={24} color="#000" />
      </TouchableOpacity>
      {errors.menuCatId && (
        <Text style={styles.errorText}>{errors.menuCatId}</Text>
      )}
    </View>
  );

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

  // Add this function to handle the active status toggle


  // Add this new function to render the active status toggle in the same style as the special status
 

  // Update the image section rendering to match the new structure
  const renderImageSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Menu Images (Max 5)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
        {imageData.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image
              source={{ uri: image.url }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
            >
              <Icon name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {imageData.length < 5 && (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={pickImage}
          >
            <Icon name="add-a-photo" size={24} color="#666" />
            <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.formSection}>
            {renderImageSection()}
            
            <TextInput
              mode="outlined"
              label={
                <Text style={styles.label}>
                  <Text style={styles.asterisk}>*</Text> Menu Name
                </Text>
              }
              placeholder="Enter menu name"
              value={name}
              onChangeText={(text) => {
                // Only allow letters, numbers, and spaces
                const formattedText = text.replace(/[^a-zA-Z\s0-9]/g, "");
                setName(formattedText);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              onBlur={() => {
                if (!name.trim()) {
                  setErrors((prev) => ({
                    ...prev,
                    name: "Menu name is required",
                  }));
                } else if (!validateMenuName(name)) {
                  setErrors((prev) => ({
                    ...prev,
                    name: "Only letters, numbers, and spaces allowed",
                  }));
                }
              }}
              style={[
                styles.input,
                styles.inputHeight,
                errors.name && styles.errorInput,
              ]}
              error={!!errors.name}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            {renderCategoryDropdown()}

            <View style={styles.inputContainer}>
              <Text style={styles.labelText}>
                Food Type <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setVegNonvegModalVisible(true)}
              >
                <Text style={styles.dropdownText}>
                  {vegNonveg || "Select Food Type"}
                </Text>
                <Icon name="arrow-drop-down" size={24} color="#000" />
              </TouchableOpacity>
              {errors.vegNonveg && (
                <Text style={styles.errorText}>{errors.vegNonveg}</Text>
              )}
            </View>

            <View style={styles.rowContainer}>
              
              <View style={styles.column}>
                <TextInput
                  mode="outlined"
                  label={
                    <Text style={styles.label}>
                      <Text style={styles.asterisk}>*</Text> Full Price{" "}
                    </Text>
                  }
                  placeholder="Enter full price"
                  value={fullPrice}
                  onChangeText={(text) => {
                    if (/^\d*\.?\d*$/.test(text)) {
                      setFullPrice(text);
                      setErrors((prev) => ({ ...prev, fullPrice: "" }));
                    }
                  }}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    styles.inputHeight,
                    errors.fullPrice && styles.errorInput,
                  ]}
                  error={!!errors.fullPrice}
                />
                {errors.fullPrice && (
                  <Text style={[styles.errorText, { marginTop: 4 }]}>
                    {errors.fullPrice}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={styles.column}>
                <View>
                  <Text style={styles.labelText}>Spicy Level</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, styles.inputHeight]}
                    onPress={() => setSpicyModalVisible(true)}
                  >
                    <Text style={styles.dropdownLabel}>
                      {spicyIndex
                        ? spicyIndexList.find((item) => item.key === spicyIndex)
                            ?.name
                        : "Select Spicy Level *"}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.column}>
                <View>
                  <Text style={styles.labelText}>Offer (%)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Enter offer percentage"
                    value={offer}
                    onChangeText={(text) => {
                      if (
                        text === "" ||
                        (!isNaN(text) &&
                          Number(text) >= 0 &&
                          Number(text) <= 100)
                      ) {
                        setOffer(text);
                      }
                    }}
                    keyboardType="numeric"
                    style={[styles.input, styles.inputHeight]}
                  />
                </View>
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Description"
              placeholder="Enter description"
              value={description}
              onChangeText={(text) => {
                if (text.length <= 500) {
                  setDescription(text);
                  setErrors((prev) => ({ ...prev, description: "" }));
                }
              }}
              multiline
              numberOfLines={4}
              maxLength={500}
              style={[
                styles.input,
                { minHeight: 100 },
                errors.description && styles.errorInput,
              ]}
              error={!!errors.description}
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
                setIngredients(text);
                setErrors((prev) => ({ ...prev, ingredients: "" }));
              }}
              style={[
                styles.input,
                styles.inputHeight,
                errors.ingredients && styles.errorInput,
              ]}
              error={!!errors.ingredients}
            />
            {errors.ingredients && (
              <Text style={styles.errorText}>{errors.ingredients}</Text>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rating</Text>
              <Pressable onPress={() => setRatingModalVisible(true)}>
                <TextInput
                  style={styles.input}
                  value={rating}
                  editable={false}
                  mode="outlined"
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              </Pressable>
            </View>

            {renderSpecialStatus()}

          

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={[styles.button, { width: "100%" }]}
                icon={() => (
                  <RemixIcon
                    name="checkbox-circle-line"
                    size={20}
                    color="#fff"
                  />
                )}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </View>
          </View>

          {/* Toast notification */}
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

          {/* Keep your existing modals */}
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomTabBar />
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
      <Modal
        animationType="fade"
        transparent={true}
        visible={vegNonvegModalVisible}
        onRequestClose={() => setVegNonvegModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setVegNonvegModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>SELECT FOOD TYPE</Text>
              <FlatList
                data={vegNonvegList}
                // data={[{ id: null, name: 'All' }, ...vegNonvegList]} // Prepend "All" option

                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setVegNonveg(item.key);
                      setVegNonvegModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        vegNonveg === item.key && styles.selectedItem,
                      ]}
                    >
                      {toTitleCase(item.name)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={spicyModalVisible}
        onRequestClose={() => setSpicyModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSpicyModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>SELECT SPICY LEVEL</Text>
                <TouchableOpacity onPress={() => setSpicyModalVisible(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={spicyIndexList}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSpicyIndex(item.key);
                      setSpicyModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        spicyIndex === item.key && styles.selectedItem,
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
      <Modal
        animationType="fade"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setRatingModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rating</Text>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {ratingList.map((ratingItem) => (
                <TouchableOpacity
                  key={ratingItem.key}
                  style={styles.modalItem}
                  onPress={() => {
                    setRating(ratingItem.key);
                    setRatingModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{ratingItem.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  keyboardView: {
    flex: 1,
  },
  asterisk: {
    color: "red", // Red color for the asterisk
  },
  scrollView: {
    padding: 20,
    marginBottom: 60, // Add margin to account for CustomTabBar
  },
  card: {
    width: width - 40,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  cardTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  imageSection: {
    marginVertical: 16,
  },
  imageTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: "#666",
  },
  imageScrollView: {
    flexDirection: "row",
    marginBottom: 16,
  },
  imageContainer: {
    marginRight: 10,
    position: "relative",
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff4444",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  formSection: {
    marginTop: 10,
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 8,
  },
  inputHeight: {
    height: 50, // Consistent height for all inputs
  },
  categoryPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12, // Match height with other inputs
    backgroundColor: "#fff",
    height: 45, // Match height with other inputs
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  columnInput: {
    marginHorizontal: 0,
  },
  specialContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginVertical: 8,
  },
  specialLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  buttonContainer: {
    marginVertical: 20,
    width: "100%",
  },
  button: {
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
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
  selectedItem: {
    color: "#0dcaf0",
    fontWeight: "bold",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    marginRight: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
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
    height: 50, // Match input height
  },
  dropdownLabel: {
    fontSize: 16,
    color: "#666",
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
  closeButton: {
    padding: 5,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  errorText: {
    color: "#FF0000",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 8,
  },
  errorInput: {
    borderColor: "#FF0000",
  },
  required: {
    color: "#FF0000",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 16,
  },
  toggleText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleLoader: {
    marginRight: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 4, // Reduced margin to accommodate error message
  },
  errorText: {
    color: "#dc3545",
    fontSize: 12,
    marginLeft: 8,
    marginTop: 2,
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
  label: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  labelText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  counterContainer: {
    alignItems: 'flex-start',
    marginTop: 0,
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 12,
    color: '#666',
  },
  charCounterWarning: {
    color: '#dc3545',
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
    color: '#26c963',
    marginLeft: 8,
    fontWeight: '500',
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
  statusText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: "#666",
  },
  imageScrollView: {
    flexDirection: "row",
    marginBottom: 16,
  },
  imageContainer: {
    marginRight: 10,
    position: "relative",
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff4444",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
});
