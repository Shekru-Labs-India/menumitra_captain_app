import React, { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  VStack,
  FormControl,
  Input,
  Select,
  TextArea,
  Button,
  useToast,
  CheckIcon,
  Switch,
  HStack,
  Text,
  Spinner,
  Icon,
  Image,
  Pressable,
  Modal,
  FlatList,
  IconButton,
  Badge,
  Center,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import Header from "../../components/Header";
import * as ImagePicker from "expo-image-picker";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

export default function EditMenuView() {
  const params = useLocalSearchParams();
  const menuId = params?.menuId;
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add settings state for POS_show_menu_image
  const [settings, setSettings] = useState({ POS_show_menu_image: true });

  // States for modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [foodTypeModalVisible, setFoodTypeModalVisible] = useState(false);
  const [spicyModalVisible, setSpicyModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [isSpecialLoading, setIsSpecialLoading] = useState(false);

  // States for data
  const [menuDetails, setMenuDetails] = useState({
    name: "",
    full_price: "",
    food_type: "",
    menu_cat_id: "",
    spicy_index: "",
    offer: "",
    description: "",
    ingredients: "",
    rating: "",
    images: [],
    is_special: false,
    is_active: true,
    outlet_id: "",
    category_name: "",
  });

  const [categories, setCategories] = useState([]);
  const [foodTypes, setFoodTypes] = useState([]);
  const [spicyLevels, setSpicyLevels] = useState([]);
  const [ratingList, setRatingList] = useState([]);

  // Add this at the top with other state declarations
  const [errors, setErrors] = useState({});

  // Add this state variable with the other state declarations
  const [imageSelected, setImageSelected] = useState(false);

  // Add this state variable with the other state variables
  const [isActiveLoading, setIsActiveLoading] = useState(false);

  // Add a state to track removed image IDs
  const [removedImageIds, setRemovedImageIds] = useState([]);

  // Add useEffect to load settings
  useEffect(() => {
    loadSettings();
  }, []);

  // Add function to load settings from AsyncStorage
  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem("app_settings");
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        console.log("Loaded settings in EditMenuView:", parsedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Define fetchInitialData function with improved image handling
  const fetchInitialData = async () => {
    if (!menuId) {
      toast.show({
        description: "Menu ID is missing",
        status: "error",
        duration: 3000,
      });
      setTimeout(() => {
        router.back();
      }, 3000);
      return;
    }

    try {
      const outletId = await AsyncStorage.getItem("outlet_id");

      if (!outletId) {
        throw new Error("Outlet ID not found");
      }

      // Fetch menu details
      const data = await fetchWithAuth(`${getBaseUrl()}/menu_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          menu_id: menuId,
        }),
      });
      console.log("Menu Data:", data);

      if (data.st === 1 && data.data) {
        const menuData = data.data;
        
        // Enhanced image processing logic to handle all formats and preserve IDs
        let processedImages = [];
        
        if (menuData.images) {
          // Handle array of images
          if (Array.isArray(menuData.images)) {
            processedImages = menuData.images
              .filter(img => img) // Remove null/undefined values
              .map(img => {
                // Convert to a standardized image object with ID
                if (typeof img === 'string') {
                  return { url: img, isExisting: true };
                }
                
                // Handle object with image property (most common from API)
                if (img?.image) {
                  return { 
                    url: img.image, 
                    id: img.image_id ? Number(img.image_id) : null,
                    isExisting: true
                  };
                }
                
                // Handle object with url property
                if (img?.url) {
                  return { 
                    url: img.url, 
                    id: img.id ? Number(img.id) : null,
                    isExisting: true
                  };
                }
                
                // Handle object with uri property
                if (img?.uri) {
                  return { url: img.uri, isExisting: true };
                }
                
                return null;
              })
              .filter(img => img && img.url); // Remove null values and ensure URL exists
          } 
          // Handle single object
          else if (typeof menuData.images === 'object') {
            if (menuData.images.image) {
              processedImages.push({
                url: menuData.images.image,
                id: menuData.images.image_id ? Number(menuData.images.image_id) : null,
                isExisting: true
              });
            }
          }
          // Handle single string
          else if (typeof menuData.images === 'string') {
            processedImages.push({
              url: menuData.images,
              isExisting: true
            });
          }
        }

        console.log("Original images:", menuData.images);
        console.log("Processed images:", processedImages);

        // Initialize removedImageIds as empty
        setRemovedImageIds([]);

        setMenuDetails({
          ...menuDetails,
          name: menuData.name || "",
          full_price: menuData.full_price?.toString() || "",
          food_type: menuData.food_type || "",
          menu_cat_id: menuData.menu_cat_id?.toString() || "",
          category_name: menuData.category_name || "",
          spicy_index: menuData.spicy_index?.toString() || "1",
          offer: menuData.offer?.toString() || "",
          description: menuData.description || "",
          ingredients: menuData.ingredients || "",
          rating: menuData.rating?.toString() || "",
          images: processedImages,
          is_special: Boolean(Number(menuData.is_special)),
          is_active: menuData.is_active !== undefined ? Boolean(Number(menuData.is_active)) : true,
          outlet_id: outletId,
        });
      } else {
        throw new Error(data.msg || "Failed to fetch menu details");
      }
    } catch (error) {
      console.error("Error in fetchInitialData:", error);
      toast.show({
        description: error.message || "Failed to load menu details",
        status: "error",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Define fetchDropdownData function
  const fetchDropdownData = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");

      // Fetch Categories
      const categoryData = await fetchWithAuth(
        `${getBaseUrl()}/menu_category_listview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outlet_id: outletId }),
        }
      );
      if (categoryData.st === 1) {
        // Filter out null menu_cat_id and 'all' category
        const validCategories = categoryData.menucat_details.filter(
          (cat) => cat && cat.menu_cat_id !== null && cat.category_name !== "all"
        );
        setCategories(validCategories);
      }

      // Fetch Food Types
      const foodTypeData = await fetchWithAuth(
        `${getBaseUrl()}/get_food_type_list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}) // Empty body to ensure device_token is added
        }
      );
      if (foodTypeData.st === 1) {
        const foodTypeArray = Object.entries(foodTypeData.food_type_list).map(
          ([key, value]) => ({
            id: key,
            name: value,
          })
        );
        setFoodTypes(foodTypeArray);
      }

      // Fetch Spicy Levels
      const spicyData = await fetchWithAuth(
        `${getBaseUrl()}/get_spicy_index_list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", },
          body: JSON.stringify({}) // Empty body to ensure device_token is added
        }
      );
      if (spicyData.st === 1) {
        const spicyArray = Object.entries(spicyData.spicy_index_list).map(
          ([key, value]) => ({
            id: key,
            name: value,
          })
        );
        setSpicyLevels(spicyArray);
      }

      // Fetch Rating List
      const ratingData = await fetchWithAuth(`${getBaseUrl()}/rating_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (ratingData.st === 1) {
        const ratingArray = Object.entries(ratingData.rating_list).map(
          ([key, value]) => ({
            key: key,
            name: value,
          })
        );
        setRatingList(ratingArray);
      }
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
      toast.show({
        description: "Failed to load dropdown data",
        status: "error",
      });
    }
  };

  // useEffect to fetch data when component mounts
  useEffect(() => {
    fetchInitialData();
    fetchDropdownData();
  }, [menuId]);

  const handleUpdate = async () => {
    // Validate all required fields first
    const newErrors = {};

    if (!menuDetails.name?.trim()) {
      newErrors.name = "Menu name is required";
    }

    if (!menuDetails.full_price) {
      newErrors.full_price = "Full price is required";
    }

    if (!menuDetails.menu_cat_id) {
      newErrors.menu_cat_id = "Category is required";
    }

    if (!menuDetails.food_type) {
      newErrors.food_type = "Food type is required";
    }

    // Update errors state
    setErrors(newErrors);

    // If there are errors, stop form submission
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");

      // Create FormData instance
      const formData = new FormData();

      // Append basic fields
      formData.append("menu_id", menuId);
      formData.append("outlet_id", outletId);
      formData.append("user_id", userId);
      formData.append("name", menuDetails.name);
      formData.append("full_price", menuDetails.full_price);
      formData.append("food_type", menuDetails.food_type);
      formData.append("menu_cat_id", menuDetails.menu_cat_id);
      formData.append("spicy_index", menuDetails.spicy_index || "1");
      formData.append("offer", menuDetails.offer || "0");
      formData.append("description", menuDetails.description || "");
      formData.append("ingredients", menuDetails.ingredients || "");
      // Format rating value as a string with one decimal place to match API expectations
      const ratingValue = parseFloat(menuDetails.rating || 0).toFixed(1);
      formData.append("rating", ratingValue);
      formData.append("is_special", menuDetails.is_special ? "1" : "0");
      formData.append("is_active", menuDetails.is_active ? "1" : "0");

      const deviceToken = await AsyncStorage.getItem("device_token");
      if (deviceToken) {
        formData.append("device_token", deviceToken);
      }

      // Handle new images - add them with the "images" key
      const newImages = menuDetails.images.filter(img => img.isNew && img.file);
      if (newImages.length > 0) {
        newImages.forEach(image => {
          formData.append("images", image.file);
        });
        console.log(`Adding ${newImages.length} new images to formData`);
      }
      
      // Construct the URL with remove_image_flag parameter when needed
      let apiUrl = `${getBaseUrl()}/menu_update`;
      const hasRemovedImages = removedImageIds.length > 0;
      const allImagesRemoved = menuDetails.images.length === 0;
      
      // Add remove_image_flag query parameter in two cases:
      // 1. When specific images have been removed (tracked in removedImageIds)
      // 2. When all images have been removed (no images left)
      if (hasRemovedImages || allImagesRemoved) {
        apiUrl += "?remove_image_flag=True";
        
        // Only include existing_image_ids if we have specific IDs to remove
        if (hasRemovedImages) {
          formData.append("existing_image_ids", JSON.stringify(removedImageIds));
          console.log("IDs of images to remove:", JSON.stringify(removedImageIds));
        }
        
        console.log("Adding remove_image_flag to URL:", apiUrl);
      }

      console.log("Sending update request with FormData contents:", {
        menu_id: menuId,
        outlet_id: outletId,
        user_id: userId,
        name: menuDetails.name,
        full_price: menuDetails.full_price,
        food_type: menuDetails.food_type,
        newImagesCount: newImages.length,
        removedImageIds: removedImageIds,
        apiUrl: apiUrl
      });

      const data = await fetchWithAuth(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
      console.log("Update Response:", data);

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Menu updated successfully",
          status: "success",
          duration: 3000,
        });
        router.push({
          pathname: "/screens/menus/MenuDetailsView",
          params: {
            menuId: menuId,
            refresh: Date.now(),
          },
        });
      } else {
        throw new Error(data.msg || "Failed to update menu");
      }
    } catch (error) {
      console.error("Update Error:", error);
      toast.show({
        description: error.message || "Failed to update menu",
        status: "error",
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Special/Non-Special Toggle
  const handleSpecialToggle = async () => {
    try {
      setIsSpecialLoading(true);
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");
      
      // Check if user_id is available
      if (!userId) {
        console.error("User ID is missing");
        toast.show({
          description: "Unable to update special status: User ID is missing",
          status: "error",
          duration: 3000,
        });
        return;
      }

      console.log("Toggling special status with user_id:", userId);
      
      const data = await fetchWithAuth(
        `${getBaseUrl()}/make_menu_special_non_special`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: outletId,
            menu_id: menuId,
            user_id: userId,
          }),
        }
      );
      
      console.log("Special toggle response:", data);

      if (data.st === 1) {
        // Update the state first
        const newSpecialStatus = !menuDetails.is_special;
        setMenuDetails((prev) => ({
          ...prev,
          is_special: newSpecialStatus,
        }));

        // Show appropriate toast message with icon
        toast.show({
          render: () => (
            <Box
              bg={newSpecialStatus ? "success.500" : "info.500"}
              px="4"
              py="2"
              rounded="sm"
              mb={5}
            >
              <HStack space={2} alignItems="center">
                <Icon
                  as={MaterialIcons}
                  name={newSpecialStatus ? "star" : "star-outline"}
                  color="white"
                  size="sm"
                />
                <Text color="white" fontWeight="medium">
                  {newSpecialStatus 
                    ? `${menuDetails.name} marked as Special Menu` 
                    : `${menuDetails.name} removed from Special Menu`}
                </Text>
              </HStack>
            </Box>
          ),
          duration: 3000,
          placement: "top",
        });
      } else {
        throw new Error(data.msg || "Failed to update special status");
      }
    } catch (error) {
      console.error("Special toggle error:", error);
      toast.show({
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsSpecialLoading(false);
    }
  };

  // Add this new handler function after handleSpecialToggle
  const handleActiveToggle = async () => {
    try {
      setIsActiveLoading(true);
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");
      
      // Check if user_id is available
      if (!userId) {
        console.error("User ID is missing");
        toast.show({
          description: "Unable to update active status: User ID is missing",
          status: "error",
          duration: 3000,
        });
        return;
      }
      
      console.log("Toggling active status with user_id:", userId);
      
      const data = await fetchWithAuth(
        `${getBaseUrl()}/toggle_menu_active_status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: outletId,
            menu_id: menuId,
            user_id: userId,
            is_active: menuDetails.is_active ? "0" : "1", // Toggle the current status
          }),
        }
      );
      
      console.log("Active toggle response:", data);

      if (data.st === 1) {
        setMenuDetails((prev) => ({
          ...prev,
          is_active: !prev.is_active,
        }));
        toast.show({
          description: data.msg || `Menu ${!menuDetails.is_active ? 'activated' : 'deactivated'} successfully`,
          status: "success",
          duration: 3000,
        });
      } else {
        throw new Error(data.msg || "Failed to update active status");
      }
    } catch (error) {
      console.error("Active toggle error:", error);
      toast.show({
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsActiveLoading(false);
    }
  };

  // Add these dropdown selection handlers
  const handleCategorySelect = (categoryId) => {
    setMenuDetails((prev) => ({
      ...prev,
      menu_cat_id: categoryId,
    }));
  };

  const handleFoodTypeSelect = (foodType) => {
    setMenuDetails((prev) => ({
      ...prev,
      food_type: foodType,
    }));
  };

  const handleSpicyLevelSelect = (level) => {
    setMenuDetails((prev) => ({
      ...prev,
      spicy_index: level,
    }));
  };

  const handleRatingSelect = (rating) => {
    // Ensure rating is stored as a string with one decimal place
    const formattedRating = parseFloat(rating).toFixed(1);
    setMenuDetails((prev) => ({
      ...prev,
      rating: formattedRating,
    }));
  };

  // Update the pickImage function to format new images consistently
  const pickImage = async () => {
    try {
      // Check maximum image limit
      if (menuDetails.images.length >= 5) {
        toast.show({
          description: "Maximum 5 images allowed",
          status: "warning",
          duration: 2000,
        });
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Check file size
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const fileSizeInMB = blob.size / (1024 * 1024);

        if (fileSizeInMB > 3) {
          toast.show({
            description: "Image size should not exceed 3MB",
            status: "error",
            duration: 3000,
          });
          return;
        }

        // Add the new image with isNew flag to indicate it's a new upload
        setMenuDetails((prev) => ({
          ...prev,
          images: [...prev.images, {
            url: imageUri,
            isNew: true,
            file: {
              uri: imageUri,
              type: 'image/jpeg',
              name: imageUri.split('/').pop(),
            }
          }],
        }));
        
        // Set imageSelected to true
        setImageSelected(true);
        
        // Clear any image errors
        setErrors((prev) => {
          const { image, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.show({
        description: "Failed to pick image",
        status: "error",
      });
    }
  };

  // Update the removeImage function to track removed image IDs
  const removeImage = (index) => {
    const imageToRemove = menuDetails.images[index];
    
    // If removing an existing image with ID, add it to removedImageIds
    if (imageToRemove.isExisting && imageToRemove.id) {
      setRemovedImageIds(prev => [...prev, imageToRemove.id]);
    }
    
    // Remove from images array
    setMenuDetails((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));

    console.log(`Removed image at index ${index}`, imageToRemove);
    console.log("Updated removedImageIds:", [...removedImageIds, imageToRemove.id].filter(Boolean));
  };

  // Update the input handlers
  const handleMenuNameChange = (text) => {
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setMenuDetails((prev) => ({ ...prev, name: sanitizedText }));

    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, name: "Menu name is required" }));
    } else if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({
        ...prev,
        name: "Menu name must be at least 2 characters",
      }));
    } else {
      setErrors((prev) => {
        const { name, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleFullPriceChange = (text) => {
    let sanitizedText = text.replace(/[^0-9.]/g, "").replace(/^0+/, "");
    
    if (text.startsWith("0.")) {
      sanitizedText = "0" + sanitizedText;
    }

    const parts = sanitizedText.split(".");
    const formattedText = parts[0] + (parts[1] ? "." + parts[1] : "");

    setMenuDetails((prev) => ({ ...prev, full_price: formattedText }));

    if (!formattedText) {
      setErrors((prev) => ({ ...prev, full_price: "Full price is required" }));
    } else if (parseFloat(formattedText) <= 0) {
      setErrors((prev) => ({ ...prev, full_price: "Price must be greater than 0" }));
    } else {
      setErrors((prev) => {
        const { full_price, ...rest } = prev;
        return rest;
      });
    }
  };

  

  const handleOfferChange = (text) => {
    // Allow 0 at the start and only numbers
    let sanitizedText = text.replace(/[^0-9]/g, "");

    // Validate offer percentage (0-100)
    if (sanitizedText && Number(sanitizedText) > 100) {
      sanitizedText = "100";
    }

    setMenuDetails((prev) => ({ ...prev, offer: sanitizedText }));
  };

  if (loading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Edit Menu" showBackButton />
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Edit Menu" showBackButton />

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space={4} p={4}>
          {/* Image Gallery with respect to POS_show_menu_image setting */}
          {settings.POS_show_menu_image && (
            <Box>
              <HStack justifyContent="space-between" alignItems="center" mb={2}>
                <Text fontSize="md">Menu Images ({menuDetails.images.length}/5)</Text>
                {menuDetails.images.length === 0 && (
                  <Badge colorScheme="warning" rounded="md" variant="subtle">
                    <Text fontSize="xs">No images</Text>
                  </Badge>
                )}
              </HStack>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack space={2}>
                  {menuDetails.images.map((image, index) => (
                    <Box key={index} position="relative">
                      <Image
                        source={{ uri: image.url }}
                        alt={`Menu Image ${index + 1}`}
                        size="xl"
                        rounded="lg"
                        fallbackElement={
                          <Box size="xl" bg="gray.200" rounded="lg" justifyContent="center" alignItems="center">
                            <Icon
                              as={MaterialIcons}
                              name="image-not-supported"
                              size={8}
                              color="gray.400"
                            />
                            <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
                              Image load failed
                            </Text>
                          </Box>
                        }
                      />
                      <IconButton
                        position="absolute"
                        top={1}
                        right={1}
                        size="sm"
                        rounded="full"
                        bg="red.500"
                        icon={
                          <Icon
                            as={MaterialIcons}
                            name="close"
                            color="white"
                            size="sm"
                          />
                        }
                        onPress={() => removeImage(index)}
                      />
                    </Box>
                  ))}
                  {menuDetails.images.length < 5 && (
                    <Pressable onPress={pickImage}>
                      <Box
                        w="32"
                        h="32"
                        bg="gray.100"
                        rounded="lg"
                        justifyContent="center"
                        alignItems="center"
                        borderWidth={1}
                        borderStyle="dashed"
                        borderColor="gray.300"
                      >
                        <Icon
                          as={MaterialIcons}
                          name="add-photo-alternate"
                          size={8}
                          color="gray.400"
                        />
                        <Text color="gray.400" mt={2}>
                          Add Photo
                        </Text>
                      </Box>
                    </Pressable>
                  )}
                </HStack>
              </ScrollView>
            </Box>
          )}

          {/* Basic Information */}
          <Box bg="white" rounded="lg" shadow={1} p={4}>
            <VStack space={4}>
              <FormControl isRequired isInvalid={"name" in errors}>
                <FormControl.Label>Menu Name</FormControl.Label>
                <Input
                  value={menuDetails.name}
                  onChangeText={handleMenuNameChange}
                  placeholder="Enter menu name"
                  borderColor={
                    menuDetails.name && !errors.name ? "green.500" : 
                    errors.name ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: menuDetails.name && !errors.name ? "green.500" : 
                                errors.name ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
              </FormControl>

              {/* Category Selector */}
              <Pressable onPress={() => setCategoryModalVisible(true)}>
                <FormControl isRequired isInvalid={"menu_cat_id" in errors}>
                  <FormControl.Label>Category</FormControl.Label>
                  <Input
                    value={menuDetails.category_name || ""}
                    isReadOnly
                    rightElement={
                      <Icon
                        as={MaterialIcons}
                        name="arrow-drop-down"
                        size={6}
                        mr={2}
                      />
                    }
                  />
                  <FormControl.ErrorMessage>
                    {errors.menu_cat_id}
                  </FormControl.ErrorMessage>
                </FormControl>
              </Pressable>

              {/* Food Type Selector */}
              <Pressable onPress={() => setFoodTypeModalVisible(true)}>
                <FormControl isRequired isInvalid={"food_type" in errors}>
                  <FormControl.Label>Food Type</FormControl.Label>
                  <Input
                    value={
                      foodTypes.find(
                        (type) => type.id === menuDetails.food_type
                      )?.name || ""
                    }
                    isReadOnly
                    rightElement={
                      <Icon
                        as={MaterialIcons}
                        name="arrow-drop-down"
                        size={6}
                        mr={2}
                      />
                    }
                  />
                  <FormControl.ErrorMessage>
                    {errors.food_type}
                  </FormControl.ErrorMessage>
                </FormControl>
              </Pressable>
            </VStack>
          </Box>

          {/* Pricing */}
          <Box bg="white" rounded="lg" shadow={1} p={4}>
            <VStack space={4}>
              <FormControl isRequired isInvalid={"full_price" in errors}>
                <FormControl.Label>Full Price</FormControl.Label>
                <Input
                  value={menuDetails.full_price}
                  onChangeText={handleFullPriceChange}
                  keyboardType="numeric"
                  placeholder="Enter full price"
                  borderColor={
                    menuDetails.full_price && !errors.full_price ? "green.500" : 
                    errors.full_price ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: menuDetails.full_price && !errors.full_price ? "green.500" : 
                                errors.full_price ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>{errors.full_price}</FormControl.ErrorMessage>
              </FormControl>

              

              <FormControl isInvalid={"offer" in errors}>
                <FormControl.Label>Offer (%)</FormControl.Label>
                <Input
                  value={menuDetails.offer}
                  onChangeText={handleOfferChange}
                  keyboardType="numeric"
                  placeholder="Enter offer percentage"
                  borderColor={
                    menuDetails.offer ? "green.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: menuDetails.offer ? "green.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.offer}
                </FormControl.ErrorMessage>
              </FormControl>
            </VStack>
          </Box>

          {/* Details */}
          <Box bg="white" rounded="lg" shadow={1} p={4}>
            <VStack space={4}>
              <FormControl>
                <FormControl.Label>Description</FormControl.Label>
                <TextArea
                  value={menuDetails.description}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, description: value }))
                  }
                  autoCompleteType={false}
                  h={20}
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Ingredients</FormControl.Label>
                <TextArea
                  value={menuDetails.ingredients}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, ingredients: value }))
                  }
                  autoCompleteType={false}
                  h={20}
                />
              </FormControl>

              {/* Spicy Level Selector */}
              <Pressable onPress={() => setSpicyModalVisible(true)}>
                <FormControl>
                  <FormControl.Label>Spicy Level</FormControl.Label>
                  <Input
                    value={
                      spicyLevels.find(
                        (level) => level.id === menuDetails.spicy_index
                      )?.name || ""
                    }
                    isReadOnly
                    rightElement={
                      <Icon
                        as={MaterialIcons}
                        name="arrow-drop-down"
                        size={6}
                        mr={2}
                      />
                    }
                  />
                </FormControl>
              </Pressable>

              {/* Rating Selector */}
              <FormControl>
                <FormControl.Label>Rating</FormControl.Label>
                <Pressable onPress={() => setRatingModalVisible(true)}>
                  <Input
                    value={ratingList.find((item) => parseFloat(item.key) === parseFloat(menuDetails.rating))?.name || ""}
                    isReadOnly
                    placeholder="Select Rating"
                    rightElement={
                      <Icon
                        as={MaterialIcons}
                        name="arrow-drop-down"
                        size={6}
                        mr={2}
                      />
                    }
                  />
                </Pressable>
                <FormControl.ErrorMessage>{errors.rating}</FormControl.ErrorMessage>
              </FormControl>

              {/* Special Toggle */}
              <HStack
                alignItems="center"
                justifyContent="space-between"
                py={2}
                bg="white"
                rounded="lg"
              >
                <Text fontSize="md">Mark as Special</Text>
                <Switch
                  isChecked={menuDetails.is_special}
                  onToggle={handleSpecialToggle}
                  isDisabled={isSpecialLoading}
                />
              </HStack>

              {/* Active/Inactive Toggle - Add this below Special Toggle */}
              {/* <HStack
                alignItems="center"
                justifyContent="space-between"
                py={2}
                bg="white"
                rounded="lg"
              >
                <VStack>
                  <Text fontSize="md">Menu Status</Text>
                  <Text fontSize="xs" color={menuDetails.is_active ? "green.500" : "red.500"}>
                    {menuDetails.is_active ? "Active" : "Inactive"}
                  </Text>
                </VStack>
                <Switch
                  isChecked={menuDetails.is_active}
                  onToggle={handleActiveToggle}
                  isDisabled={isActiveLoading}
                  trackColor={{ false: "red.200", true: "green.200" }}
                  thumbColor={menuDetails.is_active ? "green.500" : "red.500"}
                />
              </HStack> */}
            </VStack>
          </Box>
        </VStack>

        {/* Update Button */}
        <Button
          mx={4}
          mb={4}
          mt={2}
          colorScheme="primary"
          onPress={handleUpdate}
          isLoading={submitting}
          isLoadingText="Updating..."
        >
          Update Menu
        </Button>
      </ScrollView>

      {/* Category Modal */}
      <Modal
        isOpen={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
      >
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton />
          <Modal.Header>Select Category</Modal.Header>
          <Modal.Body>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.menu_cat_id?.toString()}
              renderItem={({ item }) => (
                <Pressable
                  p={3}
                  bg={
                    menuDetails.menu_cat_id === item.menu_cat_id?.toString()
                      ? "primary.100"
                      : "white"
                  }
                  onPress={() => {
                    setMenuDetails((prev) => ({
                      ...prev,
                      menu_cat_id: item.menu_cat_id?.toString(),
                      category_name: item.category_name,
                    }));
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text>{item.category_name}</Text>
                </Pressable>
              )}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      <Modal
        isOpen={foodTypeModalVisible}
        onClose={() => setFoodTypeModalVisible(false)}
      >
        <Modal.Content maxWidth="90%">
          <Modal.CloseButton />
          <Modal.Header>Select Food Type</Modal.Header>
          <Modal.Body>
            <FlatList
              data={foodTypes}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={({ item }) => (
                <Pressable
                  p={3}
                  bg={
                    menuDetails.food_type === item.id ? "primary.100" : "white"
                  }
                  onPress={() => {
                    setMenuDetails((prev) => ({
                      ...prev,
                      food_type: item.id,
                    }));
                    setFoodTypeModalVisible(false);
                  }}
                >
                  <Text>{item.name}</Text>
                </Pressable>
              )}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      <Modal
        isOpen={spicyModalVisible}
        onClose={() => setSpicyModalVisible(false)}
      >
        <Modal.Content maxWidth="90%">
          <Modal.CloseButton />
          <Modal.Header>Select Spicy Level</Modal.Header>
          <Modal.Body>
            <FlatList
              data={spicyLevels}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={({ item }) => (
                <Pressable
                  p={3}
                  bg={
                    menuDetails.spicy_index === item.id
                      ? "primary.100"
                      : "white"
                  }
                  onPress={() => {
                    setMenuDetails((prev) => ({
                      ...prev,
                      spicy_index: item.id,
                    }));
                    setSpicyModalVisible(false);
                  }}
                >
                  <Text>{item.name}</Text>
                </Pressable>
              )}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      <Modal
        isOpen={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
      >
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton />
          <Modal.Header>Select Rating</Modal.Header>
          <Modal.Body>
            <FlatList
              data={ratingList}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Pressable
                  p={3}
                  bg={parseFloat(menuDetails.rating).toFixed(1) === parseFloat(item.key).toFixed(1) ? "primary.100" : "white"}
                  onPress={() => {
                    handleRatingSelect(item.key);
                    setRatingModalVisible(false);
                  }}
                >
                  <Text>{item.name}</Text>
                </Pressable>
              )}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
}
