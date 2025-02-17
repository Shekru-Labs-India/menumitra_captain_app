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
import { getBaseUrl } from "../../../config/api.config";
import Header from "../../components/Header";

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
    spicy_index: "1",
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
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(`${getBaseUrl()}/menu_category_listview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ outlet_id: outletId }),
      });
      const data = await response.json();
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
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${getBaseUrl()}/get_food_type_list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
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
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${getBaseUrl()}/get_spicy_index_list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
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
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${getBaseUrl()}/rating_list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      if (data.st === 1) {
        const ratingList = Object.entries(data.rating_list).map(
          ([key, value]) => ({
            name: value,
            key: key,
          })
        );
        setRatingList(ratingList);
        if (!rating) {
          setRating("0.0");
        }
      } else {
        Alert.alert("Error", "Failed to fetch rating list.");
      }
    } catch (error) {
      Alert.alert("Error", "Unable to fetch rating list. Please try again.");
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
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
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

    if (!menuDetails.rating) {
      newErrors.rating = "Rating is required";
    }

    // Update errors state
    setErrors(newErrors);

    // If there are errors, stop form submission
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");
      const accessToken = await AsyncStorage.getItem("access");

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
      formData.append("rating", menuDetails.rating || "");
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

      const response = await fetch(`${getBaseUrl()}/menu_create`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.st === 1) {
        toast.show({
          description: "Menu created successfully",
          status: "success",
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
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuNameChange = (text) => {
    // Only allow letters and spaces
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setMenuDetails((prev) => ({ ...prev, name: sanitizedText }));

    // Validate and show error if needed
    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, name: "Menu name is required" }));
    } else if (sanitizedText.length < 2) {
      setErrors((prev) => ({
        ...prev,
        name: "Menu name must be at least 2 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleFullPriceChange = (text) => {
    // Remove leading zeros and non-numeric/non-decimal characters
    let sanitizedText = text.replace(/[^0-9.]/g, "").replace(/^0+/, "");

    // Handle decimal numbers starting with 0
    if (text.startsWith("0.")) {
      sanitizedText = "0" + sanitizedText;
    }

    // Prevent multiple decimal points
    const parts = sanitizedText.split(".");
    const formattedText = parts[0] + (parts[1] ? "." + parts[1] : "");

    setMenuDetails((prev) => ({ ...prev, full_price: formattedText }));
  };

  const handleHalfPriceChange = (text) => {
    // Remove leading zeros and non-numeric/non-decimal characters
    let sanitizedText = text.replace(/[^0-9.]/g, "").replace(/^0+/, "");

    // Handle decimal numbers starting with 0
    if (text.startsWith("0.")) {
      sanitizedText = "0" + sanitizedText;
    }

    // Prevent multiple decimal points
    const parts = sanitizedText.split(".");
    const formattedText = parts[0] + (parts[1] ? "." + parts[1] : "");

    setMenuDetails((prev) => ({ ...prev, half_price: formattedText }));
  };

  const handleOfferChange = (text) => {
    // Only allow numbers, remove leading zeros and non-numeric characters
    let sanitizedText = text.replace(/[^0-9]/g, "").replace(/^0+/, "");

    // Validate offer percentage (0-100)
    if (sanitizedText && Number(sanitizedText) > 100) {
      sanitizedText = "100";
    }

    setMenuDetails((prev) => ({ ...prev, offer: sanitizedText }));
  };

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Create Menu" showBackButton />

      <ScrollView flex={1} bg="white">
        <VStack space={4} p={4}>
          {/* Image Gallery */}
          <Box>
            <HStack mb={2} justifyContent="space-between" alignItems="center">
              <Text fontSize="md" fontWeight="bold">
                Menu Images ({menuDetails.images.length}/5)
              </Text>
              <Button
                size="sm"
                onPress={pickImage}
                isDisabled={menuDetails.images.length >= 5}
                leftIcon={
                  <Icon
                    as={MaterialIcons}
                    name="add-photo-alternate"
                    size="sm"
                  />
                }
              >
                Add Image
              </Button>
            </HStack>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack space={2}>
                {menuDetails.images.map((uri, index) => (
                  <Box key={index} position="relative">
                    <Image
                      source={{ uri }}
                      alt={`Menu Image ${index + 1}`}
                      size="xl"
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
                {menuDetails.images.length === 0 && (
                  <Box
                    w="150"
                    h="150"
                    bg="gray.200"
                    rounded="lg"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Icon
                      as={MaterialIcons}
                      name="add-photo-alternate"
                      size={8}
                      color="gray.400"
                    />
                    <Text color="gray.400" mt={2}>
                      Add Photos
                    </Text>
                  </Box>
                )}
              </HStack>
            </ScrollView>
          </Box>

          {/* Form Fields */}
          <VStack space={4} bg="white" p={4} rounded="lg">
            <FormControl isRequired isInvalid={"name" in errors}>
              <FormControl.Label>Menu Name</FormControl.Label>
              <Input
                value={menuDetails.name}
                onChangeText={handleMenuNameChange}
                placeholder="Enter menu name"
              />
              <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
            </FormControl>

            <HStack space={4} justifyContent="space-between">
              <FormControl
                flex={1}
                isRequired
                isInvalid={"full_price" in errors}
              >
                <FormControl.Label>Full Price</FormControl.Label>
                <Input
                  value={menuDetails.full_price}
                  onChangeText={handleFullPriceChange}
                  keyboardType="numeric"
                  placeholder="Enter full price"
                />
                <FormControl.ErrorMessage>
                  {errors.full_price}
                </FormControl.ErrorMessage>
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

            <FormControl isRequired isInvalid={"menu_cat_id" in errors}>
              <FormControl.Label>Category</FormControl.Label>
              <Pressable onPress={() => setModalVisible(true)}>
                <Input
                  value={
                    categories.find(
                      (cat) => cat.menu_cat_id === menuDetails.menu_cat_id
                    )?.category_name || ""
                  }
                  isReadOnly
                  placeholder="Select category"
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
              <FormControl.ErrorMessage>
                {errors.menu_cat_id}
              </FormControl.ErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={"food_type" in errors}>
              <FormControl.Label>Food Type</FormControl.Label>
              <Pressable onPress={() => setFoodTypeModalVisible(true)}>
                <Input
                  value={
                    foodTypes.find((type) => type.id === menuDetails.food_type)
                      ?.name || ""
                  }
                  isReadOnly
                  placeholder="Select food type"
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
              <FormControl.ErrorMessage>
                {errors.food_type}
              </FormControl.ErrorMessage>
            </FormControl>

            <FormControl isRequired>
              <FormControl.Label>Spicy Level</FormControl.Label>
              <Pressable onPress={() => setSpicyModalVisible(true)}>
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
                  placeholder="Select spicy level"
                />
              </Pressable>
            </FormControl>

            <FormControl>
              <FormControl.Label>Description</FormControl.Label>
              <Input
                value={menuDetails.description}
                onChangeText={(value) =>
                  setMenuDetails((prev) => ({ ...prev, description: value }))
                }
                placeholder="Enter description"
                multiline
                numberOfLines={3}
                height={20}
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
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Offer (%)</FormControl.Label>
              <Input
                value={menuDetails.offer}
                onChangeText={handleOfferChange}
                keyboardType="numeric"
                placeholder="Enter offer percentage"
              />
            </FormControl>

            <FormControl isRequired isInvalid={"rating" in errors}>
              <FormControl.Label>Rating</FormControl.Label>
              <Pressable onPress={() => setRatingModalVisible(true)}>
                <Input
                  value={
                    ratingList.find((item) => item.key === menuDetails.rating)
                      ?.name || ""
                  }
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
              <FormControl.ErrorMessage>
                {errors.rating}
              </FormControl.ErrorMessage>
            </FormControl>

            <Box bg="white" rounded="lg" shadow={1} p={4}>
              <HStack alignItems="center" justifyContent="space-between">
                <Text fontSize="md">Mark as Special</Text>
                <Switch
                  isChecked={menuDetails.is_special}
                  onToggle={handleSpecialToggle}
                  isDisabled={isSpecialLoading}
                />
              </HStack>
            </Box>
          </VStack>

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
                  bg={
                    menuDetails.menu_cat_id === item.menu_cat_id
                      ? "primary.100"
                      : "white"
                  }
                  onPress={() => {
                    setMenuDetails((prev) => ({
                      ...prev,
                      menu_cat_id: item.menu_cat_id,
                    }));
                    setModalVisible(false);
                  }}
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
                  onPress={() => {
                    setMenuDetails((prev) => ({ ...prev, rating: item.key }));
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
