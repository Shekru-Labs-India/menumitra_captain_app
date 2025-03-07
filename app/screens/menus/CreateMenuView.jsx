import React, { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  VStack,
  FormControl,
  Input,
  Button,
  Text,
  Pressable,
  Icon,
  useToast,
  Modal,
  FlatList,
  HStack,
  Switch,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  IconButton,
  StatusBar,
  Spinner,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl, HUGGING_FACE_TOKEN, STABILITY_API_KEY } from "../../../config/api.config";
import Header from "../../components/Header";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import { Modal as NativeModal } from 'react-native';
import { Image } from 'expo-image';
import { Buffer } from 'buffer';
import { Animated, Easing } from 'react-native';

export default function CreateMenuView() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  const [isSpecialLoading, setIsSpecialLoading] = useState(false);

  // States for form data
  const [menuDetails, setMenuDetails] = useState({
    name: "",
    full_price: "",
    half_price: "",
    food_type: "",
    menu_cat_id: "",
    spicy_index: "",
    offer: "",
    description: "",
    ingredients: "",
    rating: "",
    images: [],
    is_special: false,
    outlet_id: "",
  });

  // States for dropdowns
  const [categories, setCategories] = useState([]);
  const [foodTypes, setFoodTypes] = useState([]);
  const [spicyLevels, setSpicyLevels] = useState([]);
  const [ratingList, setRatingList] = useState([]);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [foodTypeModalVisible, setFoodTypeModalVisible] = useState(false);
  const [spicyModalVisible, setSpicyModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  const [userId, setUserId] = useState(null);
  const [errors, setErrors] = useState({});

  // Add new state to track form mode
  const [formMode, setFormMode] = useState('initial'); // 'initial', 'ai', 'manual'

  // Add new state for animation
  const [showAIAnimation, setShowAIAnimation] = useState(false);

  // Add new state for image generation loading
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  // Add this style at the top of your component
  const [buttonStyle, setButtonStyle] = useState({});

  // Inside your component, add these states
  const [rotateValue] = useState(new Animated.Value(0));
  const [borderColors, setBorderColors] = useState([
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#EC4899', // Pink
  ]);

  useEffect(() => {
    fetchCategories();
    fetchVegNonvegList();
    fetchSpicyIndexList();
    fetchRatingList();
    getUserData();
  }, []);

  const getUserData = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      const outletId = await AsyncStorage.getItem("outlet_id");
      setUserId(userId);
      setMenuDetails((prev) => ({ ...prev, outlet_id: outletId }));
    } catch (error) {
      console.error("Error getting user data:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_category_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id: outletId }),
      });
      
      if (data.st === 1) {
        setCategories(
          data.menucat_details.filter((cat) => cat.menu_cat_id !== null)
        );
      } else {
        toast.show({
          description: "Failed to fetch categories",
          status: "error",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.show({
        description: "Error loading categories",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    }
  };

  const fetchVegNonvegList = async () => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/get_food_type_list`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (data.st === 1) {
        const foodTypeArray = Object.entries(data.food_type_list).map(
          ([key, value]) => ({
            id: key,
            name: value,
          })
        );
        setFoodTypes(foodTypeArray);
      } else {
        toast.show({
          description: "Failed to fetch food types",
          status: "error",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching food types:", error);
      toast.show({
        description: "Error loading food types",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    }
  };

  const fetchSpicyIndexList = async () => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/get_spicy_index_list`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (data.st === 1) {
        const spicyArray = Object.entries(data.spicy_index_list).map(
          ([key, value]) => ({
            id: key,
            name: value,
          })
        );
        setSpicyLevels(spicyArray);
      } else {
        toast.show({
          description: "Failed to fetch spicy levels",
          status: "error",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching spicy levels:", error);
      toast.show({
        description: "Error loading spicy levels",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    }
  };

  const fetchRatingList = async () => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/rating_list`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (data.st === 1) {
        const ratingList = Object.entries(data.rating_list).map(
          ([key, value]) => ({
            name: value,
            key: key,
          })
        );
        setRatingList(ratingList);
        if (!menuDetails.rating) {
          setMenuDetails(prev => ({ ...prev, rating: "" }));
        }
      } else {
        toast.show({
          description: "Failed to fetch rating list",
          status: "error",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching rating list:", error);
      toast.show({
        description: "Unable to fetch rating list. Please try again",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    }
  };

  const pickImage = async () => {
    try {
      if (menuDetails.images.length >= 5) {
        toast.show({
          description: "Maximum 5 images allowed",
          status: "warning",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Add size validation
        const response = await fetch(selectedImage.uri);
        const blob = await response.blob();
        const fileSizeInMB = blob.size / (1024 * 1024);

        if (fileSizeInMB > 3) {
          toast.show({
            description: "Image size should not exceed 3MB",
            status: "error",
            duration: 3000,
            placement: "bottom",
            isClosable: true,
          });
          return;
        }

        if (selectedImage.uri) {
          setMenuDetails((prev) => ({
            ...prev,
            images: [...prev.images, selectedImage.uri],
          }));
          setImageSelected(true);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.show({
        description: "Failed to pick image",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    }
  };

  const removeImage = (index) => {
    setMenuDetails((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    if (menuDetails.images.length === 1) {
      setImageSelected(false);
    }
  };

  const handleSpecialToggle = () => {
    setMenuDetails((prev) => ({
      ...prev,
      is_special: !prev.is_special,
    }));
  };

  const handleCreateMenu = async () => {
    if (!validateRequiredFields()) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("outlet_id", menuDetails.outlet_id);
      formData.append("user_id", userId);
      formData.append("name", menuDetails.name);
      formData.append("full_price", menuDetails.full_price);
      formData.append("half_price", menuDetails.half_price || "");
      formData.append("food_type", menuDetails.food_type);
      formData.append("menu_cat_id", menuDetails.menu_cat_id);
      formData.append("spicy_index", menuDetails.spicy_index || "1");
      formData.append("offer", menuDetails.offer || "0");
      formData.append("description", menuDetails.description);
      formData.append("ingredients", menuDetails.ingredients);
      formData.append("is_special", menuDetails.is_special ? "1" : "0");

      // Handle multiple images with proper naming
      if (menuDetails.images.length > 0) {
        for (const [index, imageUri] of menuDetails.images.entries()) {
          if (imageUri.startsWith('data:image')) {
            // For AI-generated images, use a short, unique name
            formData.append('images', {
              uri: imageUri,
              type: 'image/jpeg',
              name: `ai_${index}.jpg`  // Simple, short name
            });
          } else {
            // For uploaded images, keep original name but ensure it's not too long
            let filename = imageUri.split('/').pop();
            if (filename.length > 32) {  // Limit filename length
              const ext = filename.split('.').pop();
              filename = `img_${index}.${ext}`;
            }
            formData.append('images', {
              uri: imageUri,
              type: 'image/jpeg',
              name: filename
            });
          }
        }
      }

      console.log("Form Data being sent:", formData._parts);

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_create`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (data.st === 1) {
        toast.show({
          description: "Menu created successfully",
          status: "success",
          duration: 3000,
          placement: "top",
          isClosable: true,
        });
        router.push("/screens/menus/MenuListView");
      } else {
        throw new Error(data.msg || "Failed to create menu");
      }
    } catch (error) {
      console.error("Create Menu Error:", error);
      toast.show({
        description: error.message || "Failed to create menu",
        status: "error",
        duration: 3000,
        placement: "top",
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleHalfPriceChange = (text) => {
    let sanitizedText = text.replace(/[^0-9.]/g, "").replace(/^0+/, "");
    
    if (text.startsWith("0.")) {
      sanitizedText = "0" + sanitizedText;
    }

    const parts = sanitizedText.split(".");
    const formattedText = parts[0] + (parts[1] ? "." + parts[1] : "");

    setMenuDetails((prev) => ({ ...prev, half_price: formattedText }));

    // Validate half price is less than full price if both exist
    if (formattedText && menuDetails.full_price) {
      const halfPrice = parseFloat(formattedText);
      const fullPrice = parseFloat(menuDetails.full_price);
      
      if (halfPrice >= fullPrice) {
        setErrors((prev) => ({ 
          ...prev, 
          half_price: "Half price must be less than full price" 
        }));
      } else {
        setErrors((prev) => {
          const { half_price, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleOfferChange = (text) => {
    // If empty, set to "0" since API expects integer
    if (!text) {
      setMenuDetails((prev) => ({ ...prev, offer: "0" }));
      return;
    }

    // Allow only numbers
    let sanitizedText = text.replace(/[^0-9]/g, "");

    // Validate offer percentage (0-100) only if there's a value
    if (sanitizedText && Number(sanitizedText) > 100) {
      sanitizedText = "100";
    }

    setMenuDetails((prev) => ({ ...prev, offer: sanitizedText }));
  };

  const handleCategorySelect = (categoryId) => {
    setMenuDetails((prev) => ({
      ...prev,
      menu_cat_id: categoryId,
    }));
    // Clear error when valid selection is made
    setErrors((prev) => {
      const { menu_cat_id, ...rest } = prev;
      return rest;
    });
    setModalVisible(false);
  };

  const handleFoodTypeSelect = (foodTypeId) => {
    setMenuDetails((prev) => ({
      ...prev,
      food_type: foodTypeId,
    }));
    // Clear error when valid selection is made
    setErrors((prev) => {
      const { food_type, ...rest } = prev;
      return rest;
    });
    setFoodTypeModalVisible(false);
  };

  const handleSpicyLevelSelect = (spicyId) => {
    setMenuDetails((prev) => ({
      ...prev,
      spicy_index: spicyId,
    }));
    setSpicyModalVisible(false);
  };

  const handleRatingSelect = (ratingKey) => {
    setMenuDetails((prev) => ({
      ...prev,
      rating: ratingKey,
    }));
    // Clear error when valid selection is made
    setErrors((prev) => {
      const { rating, ...rest } = prev;
      return rest;
    });
    setRatingModalVisible(false);
  };

  // Modify the handleManualFill function
  const handleManualFill = () => {
    setFormMode('manual');
  };

  // First, add the validation function for required fields
  const validateRequiredFields = () => {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Modify the handleGenerateAI function
  const handleGenerateAI = async () => {
    // Only validate menu name
    if (!menuDetails.name.trim()) {
      toast.show({
        description: "Please enter menu name",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
      return;
    }

    setShowAIAnimation(true);
    
    try {
      const response = await fetchWithAuth(`${getBaseUrl()}/ai_genrate_menu_details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outlet_id: menuDetails.outlet_id,
          name: menuDetails.name
        })
      });

      console.log("AI Response:", response);

      // Check if response has the required fields with uppercase keys
      if (response && response.Description) {  // Changed from lowercase to uppercase
        // Update menu details with AI generated content
        setMenuDetails(prev => ({
          ...prev,
          description: response.Description,      // Changed from lowercase
          ingredients: response.Ingredients,      // Changed from lowercase
          food_type: response["Food Type"].toLowerCase(),  // Handle space in key name
          spicy_index: response["Spicy Index"].toString() // Handle space in key name
        }));

        // Set form mode only after successful response
        setFormMode('ai');

        toast.show({
          description: "Menu details generated successfully!",
          status: "success",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
      } else {
        throw new Error("Invalid or empty response from AI");
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      toast.show({
        description: error.message || "Failed to generate menu details",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
      // Reset form mode on error
      setFormMode('initial');
    } finally {
      setShowAIAnimation(false);
    }
  };

  // Update the generateImages function
  const generateImages = async () => {
    try {
      setIsGeneratingImages(true);
      
      const response = await fetchWithAuth(`${getBaseUrl()}/ai_genrate_image_details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: menuDetails.name,
          description: menuDetails.description,
        }),
      });

      if (response.st === 1 && response.images?.length > 0) {
        // Convert base64 images to URLs with proper MIME type
        const newImages = response.images.map(base64String => {
          return `data:image/jpeg;base64,${base64String}`;  // Changed to image/jpeg
        });
        
        setMenuDetails(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
        setImageSelected(true);

        toast.show({
          description: "Images generated successfully!",
          status: "success",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });
      } else {
        throw new Error("Failed to generate images");
      }
    } catch (error) {
      console.error("Error generating images:", error);
      toast.show({
        description: error.message || "Failed to generate images. Please try again.",
        status: "error", 
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Update the animation function
  const startBorderAnimation = () => {
    // Rotate colors in array instead of rotating the border
    const rotateColors = () => {
      setBorderColors(prevColors => {
        const newColors = [...prevColors];
        const firstColor = newColors.shift();
        newColors.push(firstColor);
        return newColors;
      });
    };

    // Start color rotation interval
    const interval = setInterval(rotateColors, 200); // Adjust speed as needed

    return () => clearInterval(interval);
  };

  // Update the useEffect for animation
  useEffect(() => {
    let cleanup;
    if (showAIAnimation) {
      cleanup = startBorderAnimation();
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [showAIAnimation]);

  // Create the rotating border style
  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Create Menu" showBackButton />

      <ScrollView flex={1} bg="white">
        <VStack space={2} p={2}>
          {/* Initial Form Fields */}
          <VStack space={3} bg="white" p={3} rounded="lg">
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

            <HStack space={4} justifyContent="space-between">
              <FormControl flex={1} isRequired isInvalid={"full_price" in errors}>
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

              <FormControl flex={1}>
                <FormControl.Label>Half Price</FormControl.Label>
                <Input
                  value={menuDetails.half_price}
                  onChangeText={handleHalfPriceChange}
                  keyboardType="numeric"
                  placeholder="Enter half price"
                />
              </FormControl>
            </HStack>

            {formMode === 'initial' ? (
              <HStack space={8} justifyContent="space-between" alignItems="center" mt={2}>
                {/* Left text */}
                <Pressable 
                  onPress={handleManualFill}
                  disabled={showAIAnimation}
                  flex={1}
                >
                  <Text 
                    color="coolGray.600" 
                    fontSize="md"
                    fontWeight="medium"
                  >
                    Fill Manually
                  </Text>
                </Pressable>

                {/* Right rounded button */}
                <Box position="relative">
                  {showAIAnimation && (
                    <>
                      {/* Create multiple borders with different colors - reduced width and spacing */}
                      <Box
                        position="absolute"
                        top={-2}
                        left={-2}
                        right={-2}
                        bottom={-2}
                        borderRadius="full"
                        borderWidth={2}
                        borderColor={borderColors[0]}
                      />
                      <Box
                        position="absolute"
                        top={-2}
                        left={-2}
                        right={-2}
                        bottom={-2}
                        borderRadius="full"
                        borderWidth={2}
                        borderColor={borderColors[1]}
                        opacity={0.8}
                      />
                      <Box
                        position="absolute"
                        top={-2}
                        left={-2}
                        right={-2}
                        bottom={-2}
                        borderRadius="full"
                        borderWidth={2}
                        borderColor={borderColors[2]}
                        opacity={0.6}
                      />
                      <Box
                        position="absolute"
                        top={-2}
                        left={-2}
                        right={-2}
                        bottom={-2}
                        borderRadius="full"
                        borderWidth={2}
                        borderColor={borderColors[3]}
                        opacity={0.4}
                      />
                      <Box
                        position="absolute"
                        top={-2}
                        left={-2}
                        right={-2}
                        bottom={-2}
                        borderRadius="full"
                        borderWidth={2}
                        borderColor={borderColors[4]}
                        opacity={0.2}
                      />
                    </>
                  )}
                  <Button
                    onPress={handleGenerateAI}
                    disabled={showAIAnimation}
                    variant="outline"
                    borderRadius="full"
                    borderColor={showAIAnimation ? "transparent" : "primary.600"}
                    borderWidth={1}
                    _pressed={{ 
                      bg: "transparent"
                    }}
                    flex={1}
                    h="40px"
                    overflow="hidden"
                    px={3}
                    style={{
                      backgroundColor: 'transparent',
                    }}
                  >
                    <HStack space={1.5} alignItems="center" justifyContent="center">
                      {showAIAnimation ? (
                        <>
                          <Image
                            source={require('../../../assets/animations/AI-animation-unscreen.gif')}
                            alt="AI Generating"
                            style={{
                              width: 16,
                              height: 16,
                              resizeMode: 'contain'
                            }}
                            contentFit="contain"
                            transition={0}
                          />
                          <Text color="primary.600" fontSize="sm" fontWeight="medium">
                            Generate by AI
                          </Text>
                        </>
                      ) : (
                        <>
                          <Icon 
                            as={MaterialIcons} 
                            name="auto-awesome" 
                            size={4}
                            color="primary.600" 
                          />
                          <Text color="primary.600" fontSize="sm" fontWeight="medium">
                            Generate by AI
                          </Text>
                        </>
                      )}
                    </HStack>
                  </Button>
                </Box>
              </HStack>
            ) : (
              // Additional Fields
              <VStack space={3} bg="white" p={3} rounded="lg">
                <HStack space={4} justifyContent="space-between">
                  <FormControl flex={1}>
                    <FormControl.Label>Spicy Level</FormControl.Label>
                    <Pressable onPress={() => setSpicyModalVisible(true)}>
                      <Input
                        value={spicyLevels.find((level) => level.id === menuDetails.spicy_index)?.name || ""}
                        isReadOnly
                        placeholder="Select Spicy Level"
                        rightElement={
                          <Icon as={MaterialIcons} name="arrow-drop-down" size={6} mr={2} />
                        }
                      />
                    </Pressable>
                  </FormControl>

                  <FormControl flex={1}>
                    <FormControl.Label>Offer (%)</FormControl.Label>
                    <Input
                      value={menuDetails.offer}
                      onChangeText={handleOfferChange}
                      keyboardType="numeric"
                      placeholder="Enter offer percentage"
                    />
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormControl.Label>
                    Description
                    <Text fontSize="xs" color="coolGray.500" ml={1}>
                      ({menuDetails.description.length}/500 characters)
                    </Text>
                  </FormControl.Label>
                  <Input
                    value={menuDetails.description}
                    onChangeText={(value) => {
                      if (value.length <= 500) {
                        setMenuDetails((prev) => ({ ...prev, description: value }))
                      }
                    }}
                    placeholder="Enter description"
                    multiline
                    numberOfLines={4}
                    height={24}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </FormControl>

                <FormControl>
                  <FormControl.Label>Ingredients</FormControl.Label>
                  <Input
                    value={menuDetails.ingredients}
                    onChangeText={(value) =>
                      setMenuDetails((prev) => ({ ...prev, ingredients: value }))
                    }
                    placeholder="Enter ingredients"
                    multiline
                    numberOfLines={3}
                    height={20}
                    textAlignVertical="top"
                  />
                </FormControl>

               

                {/* Mark as Special without card */}
                <HStack py={2} alignItems="center" justifyContent="flex-end" >
                  <Text fontSize="md" mr={4}>Mark as Special</Text>
                  <Switch
                    isChecked={menuDetails.is_special}
                    onToggle={handleSpecialToggle}
                    isDisabled={isSpecialLoading}
                  />
                </HStack>

                {/* Image Gallery moved to bottom */}
                <Box>
                  <HStack mb={2} justifyContent="space-between" alignItems="center">
                    <Text fontSize="md" fontWeight="bold">
                      Menu Images ({menuDetails.images.length}/5)
                    </Text>
                    {formMode === 'ai' && (  // Only show generate button in AI mode
                      <Button
                        onPress={generateImages}
                        isDisabled={!menuDetails.name || loading}
                        bg="primary.600"
                        _pressed={{ bg: "primary.700" }}
                        leftIcon={<Icon as={MaterialIcons} name="image" size="sm" />}
                        isLoading={isGeneratingImages}
                        isLoadingText="Generating..."
                      >
                        Generate Images
                      </Button>
                    )}
                  </HStack>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <HStack space={2}>
                      {menuDetails.images.map((uri, index) => (
                        <Box key={index} position="relative">
                          <Image
                            source={{ uri }}
                            alt={`Menu Image ${index + 1}`}
                            style={{  // Changed to style prop
                              width: 128,
                              height: 128,
                              borderRadius: 8
                            }}
                            contentFit="cover"  // Changed to cover
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
                        <Pressable 
                          onPress={pickImage}
                          disabled={isGeneratingImages}  // Disable during generation
                        >
                          <Box
                            w="32"
                            h="32"
                            bg="white"
                            rounded="lg"
                            justifyContent="center"
                            alignItems="center"
                            borderWidth={1}
                            borderStyle={isGeneratingImages ? "solid" : "dashed"}
                            borderColor={isGeneratingImages ? "primary.500" : "gray.300"}
                            overflow="hidden"  // Added to contain the GIF
                          >
                            {isGeneratingImages ? (
                              <VStack space={2} alignItems="center">
                                <Image
                                  source={require('../../../assets/animations/AI-animation-unscreen.gif')}
                                  alt="AI Generating"
                                  style={{
                                    width: 100,  // Adjusted size
                                    height: 100,
                                    resizeMode: 'contain'
                                  }}
                                  contentFit="contain"
                                  transition={0}
                                />
                               
                              </VStack>
                            ) : (
                              <Icon
                                as={MaterialIcons}
                                name="add"
                                size={8}
                                color="gray.400"
                              />
                            )}
                          </Box>
                        </Pressable>
                      )}
                    </HStack>
                  </ScrollView>
                </Box>

                <Button
                  onPress={handleCreateMenu}
                  isLoading={loading}
                  isLoadingText="Creating..."
                  bg="primary.600"
                  _pressed={{ bg: "primary.700" }}
                  mb={6}
                >
                  Create Menu
                </Button>
              </VStack>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Category Modal */}
      <Modal isOpen={modalVisible} onClose={() => setModalVisible(false)}>
        <Modal.Content maxWidth="90%">
          <Modal.CloseButton />
          <Modal.Header>Select Category</Modal.Header>
          <Modal.Body>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.menu_cat_id?.toString()}
              renderItem={({ item }) => (
                <Pressable
                  p={3}
                  bg={menuDetails.menu_cat_id === item.menu_cat_id ? "primary.100" : "white"}
                  onPress={() => handleCategorySelect(item.menu_cat_id)}
                >
                  <Text>{item.category_name}</Text>
                </Pressable>
              )}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Food Type Modal */}
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
                  bg={menuDetails.food_type === item.id ? "primary.100" : "white"}
                  onPress={() => handleFoodTypeSelect(item.id)}
                >
                  <Text>{item.name}</Text>
                </Pressable>
              )}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Spicy Level Modal */}
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
                  onPress={() => handleSpicyLevelSelect(item.id)}
                >
                  <Text>{item.name}</Text>
                </Pressable>
              )}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Rating Modal */}
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
                  bg={menuDetails.rating === item.key ? "primary.100" : "white"}
                  onPress={() => handleRatingSelect(item.key)}
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
