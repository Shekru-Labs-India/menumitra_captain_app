import React, { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  VStack,
  FormControl,
  Input,
  Button,
  Image,
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
import LottieView from 'lottie-react-native';
import { Modal as NativeModal } from 'react-native';
import { Buffer } from 'buffer';

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
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.show({
        description: "Error loading categories",
        status: "error",
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
        });
      }
    } catch (error) {
      console.error("Error fetching food types:", error);
      toast.show({
        description: "Error loading food types",
        status: "error",
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
        });
      }
    } catch (error) {
      console.error("Error fetching spicy levels:", error);
      toast.show({
        description: "Error loading spicy levels",
        status: "error",
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
        });
      }
    } catch (error) {
      console.error("Error fetching rating list:", error);
      toast.show({
        description: "Unable to fetch rating list. Please try again",
        status: "error",
      });
    }
  };

  const pickImage = async () => {
    try {
      if (menuDetails.images.length >= 5) {
        toast.show({
          description: "Maximum 5 images allowed",
          status: "warning",
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
      // Add a toast to show validation errors
      toast.show({
        description: "Please fill all required fields",
        status: "error",
        duration: 3000,
        placement: "top",
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");

      // Append all required fields
      formData.append("outlet_id", outletId);
      formData.append("user_id", userId);
      formData.append("name", menuDetails.name);
      formData.append("full_price", menuDetails.full_price);
      formData.append("half_price", menuDetails.half_price || "");
      formData.append("food_type", menuDetails.food_type);
      formData.append("menu_cat_id", menuDetails.menu_cat_id);
      formData.append("spicy_index", menuDetails.spicy_index || "1");
      formData.append("offer", menuDetails.offer || "");
      formData.append("description", menuDetails.description || "");
      formData.append("ingredients", menuDetails.ingredients || "");
      formData.append("is_special", menuDetails.is_special ? "1" : "0");

      // Handle multiple images with sequential numbering
      if (menuDetails.images.length > 0) {
        menuDetails.images.forEach((imageUri, index) => {
          const filename = imageUri.split("/").pop();
          formData.append(`images`, {
            uri: imageUri,
            type: "image/jpeg",
            name: filename,
          });
        });
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
    // Allow 0 at the start and only numbers
    let sanitizedText = text.replace(/[^0-9]/g, "");

    // Validate offer percentage (0-100)
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
    // First validate required fields
    if (!validateRequiredFields()) {
      toast.show({
        description: "Please fill name, price and category first",
        status: "error",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
      return;
    }

    setShowAIAnimation(true);
    
    try {
      const response = await fetchWithAuth(`${getBaseUrl()}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outlet_id: menuDetails.outlet_id,
          menu_cat_id: menuDetails.menu_cat_id,
          name: menuDetails.name,
          category: categories.find(cat => cat.menu_cat_id === menuDetails.menu_cat_id)?.category_name || "",
          full_price: menuDetails.full_price,
          half_price: menuDetails.half_price || ""
        })
      });

      console.log("AI Response:", response);

      // Check if response is valid and has the required fields
      if (response && response.Description) {
        // Update menu details with AI generated content
        setMenuDetails(prev => ({
          ...prev,
          description: response.Description,
          ingredients: response.Ingredients,
          food_type: foodTypes.find(type => 
            type.name.toLowerCase() === response["Food Type"].toLowerCase()
          )?.id || "",
          spicy_index: response["Spicy Index"].toString()
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

  // Modify the generateImages function
  const generateImages = async () => {
    try {
      setLoading(true);
      const basePrompt = `A professional food photography of ${menuDetails.name}, ${menuDetails.description}`;
      
      const prompts = [
        `${basePrompt}, top view, on a rustic wooden table with garnish`,
        `${basePrompt}, side angle view, on a modern plate with restaurant presentation`
      ];
      
      const imagePromises = prompts.map(prompt => 
        fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${STABILITY_API_KEY}`,
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: prompt,
                weight: 1
              },
              {
                text: "text, watermark, logo, label, cartoon, anime, illustration, drawing, painting, blurry, low quality",
                weight: -1
              }
            ],
            cfg_scale: 7,
            height: 1024,
            width: 1024,
            samples: 1,
            steps: 30,
          }),
        })
      );

      const responses = await Promise.all(imagePromises);
      
      // Handle API responses
      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `API request failed with status ${response.status}`);
        }
      }

      // Process the responses and directly add to menuDetails
      const base64Images = await Promise.all(
        responses.map(async (response) => {
          const data = await response.json();
          return `data:image/png;base64,${data.artifacts[0].base64}`;
        })
      );

      // Add both images directly to menuDetails
      setMenuDetails(prev => ({
        ...prev,
        images: [...prev.images, ...base64Images]
      }));
      setImageSelected(true);

      toast.show({
        description: "Images generated successfully!",
        status: "success",
        duration: 3000,
        placement: "bottom",
        isClosable: true,
      });
    } catch (error) {
      console.error("Error generating images:", error);
      toast.show({
        description: error.message || "Failed to generate images. Please try again.",
        status: "error",
        duration: 5000,
        placement: "bottom",
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

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
              // Only show category in initial mode
              <FormControl isRequired isInvalid={"menu_cat_id" in errors}>
                <FormControl.Label>Category</FormControl.Label>
                <Pressable onPress={() => setModalVisible(true)}>
                  <Input
                    value={categories.find((cat) => cat.menu_cat_id === menuDetails.menu_cat_id)?.category_name || ""}
                    isReadOnly
                    placeholder="Select category"
                    borderColor={
                      menuDetails.menu_cat_id && !errors.menu_cat_id ? "green.500" : 
                      errors.menu_cat_id ? "red.500" : "coolGray.200"
                    }
                    _focus={{
                      borderColor: menuDetails.menu_cat_id && !errors.menu_cat_id ? "green.500" : 
                                  errors.menu_cat_id ? "red.500" : "blue.500",
                    }}
                    rightElement={
                      <Icon as={MaterialIcons} name="arrow-drop-down" size={6} mr={2} />
                    }
                  />
                </Pressable>
                <FormControl.ErrorMessage>{errors.menu_cat_id}</FormControl.ErrorMessage>
              </FormControl>
            ) : (
              // Show category and food type side by side after selection
              <HStack space={4} justifyContent="space-between">
                <FormControl flex={1} isRequired isInvalid={"menu_cat_id" in errors}>
                  <FormControl.Label>Category</FormControl.Label>
                  <Pressable onPress={() => setModalVisible(true)}>
                    <Input
                      value={categories.find((cat) => cat.menu_cat_id === menuDetails.menu_cat_id)?.category_name || ""}
                      isReadOnly
                      placeholder="Select category"
                      borderColor={
                        menuDetails.menu_cat_id && !errors.menu_cat_id ? "green.500" : 
                        errors.menu_cat_id ? "red.500" : "coolGray.200"
                      }
                      _focus={{
                        borderColor: menuDetails.menu_cat_id && !errors.menu_cat_id ? "green.500" : 
                                    errors.menu_cat_id ? "red.500" : "blue.500",
                      }}
                      rightElement={
                        <Icon as={MaterialIcons} name="arrow-drop-down" size={6} mr={2} />
                      }
                    />
                  </Pressable>
                  <FormControl.ErrorMessage>{errors.menu_cat_id}</FormControl.ErrorMessage>
                </FormControl>

                <FormControl flex={1} isRequired isInvalid={"food_type" in errors}>
                  <FormControl.Label>Food Type</FormControl.Label>
                  <Pressable onPress={() => setFoodTypeModalVisible(true)}>
                    <Input
                      value={foodTypes.find((type) => type.id === menuDetails.food_type)?.name || ""}
                      isReadOnly
                      placeholder="Select Food Type"
                      borderColor={
                        menuDetails.food_type && !errors.food_type ? "green.500" : 
                        errors.food_type ? "red.500" : "coolGray.200"
                      }
                      rightElement={
                        <Icon as={MaterialIcons} name="arrow-drop-down" size={6} mr={2} />
                      }
                    />
                  </Pressable>
                  <FormControl.ErrorMessage>{errors.food_type}</FormControl.ErrorMessage>
                </FormControl>
              </HStack>
            )}
          </VStack>

          {formMode === 'initial' ? (
            // Action Buttons
            <HStack space={4} justifyContent="center">
              <Button
                flex={1}
                onPress={handleGenerateAI}
                bg="primary.600"
                _pressed={{ bg: "primary.700" }}
              >
                Generate by AI
              </Button>
              <Button
                flex={1}
                onPress={handleManualFill}
                bg="secondary.600"
                _pressed={{ bg: "secondary.700" }}
              >
                Fill Manually
              </Button>
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
                      size="sm"
                      leftIcon={<Icon as={MaterialIcons} name="auto-awesome" size="sm" />}
                      onPress={generateImages}
                      isLoading={loading}
                      isLoadingText="Generating..."
                      bg="primary.600"
                      _pressed={{ bg: "primary.700" }}
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
                          size="32"
                          w="32"
                          h="32"
                          rounded="lg"
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
                            name="add"
                            size={8}
                            color="gray.400"
                          />
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
      </ScrollView>

      {/* AI Animation Modal */}
      {showAIAnimation && (
        <NativeModal
          transparent={true}
          animationType="fade"
          visible={showAIAnimation}
        >
          <Box 
            flex={1} 
            bg="rgba(0,0,0,0.7)" 
            justifyContent="center" 
            alignItems="center"
          >
            <Box 
              bg="white" 
              p={6} 
              rounded="2xl" 
              width="80%" 
              alignItems="center"
              shadow={5}
              position="relative"
            >
              <IconButton
                position="absolute"
                right={2}
                top={2}
                zIndex={1}
                variant="ghost"
                _pressed={{ bg: 'coolGray.100' }}
                icon={
                  <Icon 
                    as={MaterialIcons} 
                    name="close" 
                    size={6} 
                    color="coolGray.500"
                  />
                }
                onPress={() => {
                  setShowAIAnimation(false);
                  setFormMode('initial');
                }}
              />
              <LottieView
                source={require('../../../assets/animations/ai-loading.json')}
                autoPlay
                loop
                style={{ 
                  width: 200, 
                  height: 200,
                  backgroundColor: 'transparent'
                }}
                renderMode="AUTOMATIC"
                speed={0.8}
                
              />
              <Text 
                fontSize="lg" 
                fontWeight="bold" 
                color="primary.600" 
                mt={4}
                textAlign="center"
              >
                AI is analyzing your menu...
              </Text>
              <Text 
                fontSize="sm" 
                color="gray.500" 
                mt={2}
                textAlign="center"
              >
                Please wait while we generate the perfect menu details
              </Text>
            </Box>
          </Box>
        </NativeModal>
      )}

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
