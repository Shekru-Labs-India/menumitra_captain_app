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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import Header from "../../components/Header";
import * as ImagePicker from "expo-image-picker";
import { getBaseUrl } from "../../../config/api.config";

export default function EditMenuView() {
  const params = useLocalSearchParams();
  const menuId = params?.menuId;
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    category_name: "",
  });

  const [categories, setCategories] = useState([]);
  const [foodTypes, setFoodTypes] = useState([]);
  const [spicyLevels, setSpicyLevels] = useState([]);
  const [ratingList, setRatingList] = useState([]);

  // Define fetchInitialData function
  const fetchInitialData = async () => {
    if (!menuId) {
      toast.show({
        description: "Menu ID is missing",
        status: "error",
      });
      router.back();
      return;
    }

    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      if (!outletId) {
        throw new Error("Outlet ID not found");
      }

      // Fetch menu details
      const menuResponse = await fetch(`${getBaseUrl()}/menu_view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outletId,
          menu_id: menuId,
        }),
      });

      const data = await menuResponse.json();
      console.log("Menu Data:", data);

      if (data.st === 1 && data.data) {
        const menuData = data.data;
        setMenuDetails({
          ...menuDetails,
          name: menuData.name || "",
          full_price: menuData.full_price?.toString() || "",
          half_price: menuData.half_price?.toString() || "",
          food_type: menuData.food_type || "",
          menu_cat_id: menuData.menu_cat_id?.toString() || "",
          category_name: menuData.category_name || "",
          spicy_index: menuData.spicy_index?.toString() || "1",
          offer: menuData.offer?.toString() || "",
          description: menuData.description || "",
          ingredients: menuData.ingredients || "",
          rating: menuData.rating?.toString() || "",
          images: menuData.images || [],
          is_special: Boolean(Number(menuData.is_special)),
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
      const accessToken = await AsyncStorage.getItem("access");

      // Fetch Categories
      const categoryResponse = await fetch(
        `${getBaseUrl()}/menu_category_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ outlet_id: outletId }),
        }
      );
      const categoryData = await categoryResponse.json();
      if (categoryData.st === 1) {
        setCategories(categoryData.menucat_details);
      }

      // Fetch Food Types
      const foodTypeResponse = await fetch(
        `${getBaseUrl()}/get_food_type_list`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const foodTypeData = await foodTypeResponse.json();
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
      const spicyResponse = await fetch(
        `${getBaseUrl()}/get_spicy_index_list`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const spicyData = await spicyResponse.json();
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
      const ratingResponse = await fetch(`${getBaseUrl()}/rating_list`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const ratingData = await ratingResponse.json();
      if (ratingData.st === 1) {
        const ratingArray = Object.entries(ratingData.rating_list).map(
          ([key, value]) => ({
            id: key,
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
    try {
      setSubmitting(true);
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");
      const accessToken = await AsyncStorage.getItem("access");

      console.log("Sending update request with:", {
        menu_id: menuId,
        outlet_id: outletId,
        user_id: userId,
        ...menuDetails,
      });

      const response = await fetch(`${getBaseUrl()}/menu_update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          menu_id: menuId,
          outlet_id: outletId,
          user_id: userId,
          ...menuDetails,
        }),
      });

      const data = await response.json();
      console.log("Update Response:", data);

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Menu updated successfully",
          status: "success",
        });
        router.push({
          pathname: "/screens/menus/MenuListView",
          params: { refresh: Date.now() },
        });
      } else {
        throw new Error(data.msg || "Failed to update menu");
      }
    } catch (error) {
      console.error("Update Error:", error);
      toast.show({
        description: error.message || "Failed to update menu",
        status: "error",
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
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(
        `${getBaseUrl()}/make_menu_special_non_special`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            outlet_id: outletId,
            menu_id: menuId,
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        setMenuDetails((prev) => ({
          ...prev,
          is_special: !prev.is_special,
        }));
        toast.show({
          description: data.msg || "Special status updated successfully",
          status: "success",
        });
      } else {
        throw new Error(data.msg || "Failed to update special status");
      }
    } catch (error) {
      console.error("Special toggle error:", error);
      toast.show({
        description: error.message,
        status: "error",
      });
    } finally {
      setIsSpecialLoading(false);
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
    setMenuDetails((prev) => ({
      ...prev,
      rating: rating,
    }));
  };

  // Add image picker function
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

      if (!result.canceled) {
        setMenuDetails((prev) => ({
          ...prev,
          images: [...prev.images, result.assets[0].uri],
        }));
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.show({
        description: "Failed to pick image",
        status: "error",
      });
    }
  };

  // Add remove image function
  const removeImage = (index) => {
    setMenuDetails((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
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
          {/* Image Gallery */}
          <Box>
            <Text fontSize="md" mb={2}>
              Menu Images ({menuDetails.images.length}/5)
            </Text>
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

          {/* Basic Information */}
          <Box bg="white" rounded="lg" shadow={1} p={4}>
            <VStack space={4}>
              <FormControl isRequired>
                <FormControl.Label>Menu Name</FormControl.Label>
                <Input
                  value={menuDetails.name}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, name: value }))
                  }
                  placeholder="Enter menu name"
                />
              </FormControl>

              {/* Category Selector */}
              <Pressable onPress={() => setCategoryModalVisible(true)}>
                <FormControl isRequired>
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
                </FormControl>
              </Pressable>

              {/* Food Type Selector */}
              <Pressable onPress={() => setFoodTypeModalVisible(true)}>
                <FormControl isRequired>
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
                </FormControl>
              </Pressable>
            </VStack>
          </Box>

          {/* Pricing */}
          <Box bg="white" rounded="lg" shadow={1} p={4}>
            <VStack space={4}>
              <FormControl isRequired>
                <FormControl.Label>Full Price</FormControl.Label>
                <Input
                  value={menuDetails.full_price}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, full_price: value }))
                  }
                  keyboardType="numeric"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Half Price</FormControl.Label>
                <Input
                  value={menuDetails.half_price}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, half_price: value }))
                  }
                  keyboardType="numeric"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Offer (%)</FormControl.Label>
                <Input
                  value={menuDetails.offer}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, offer: value }))
                  }
                  keyboardType="numeric"
                />
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
        <Modal.Content maxWidth="90%">
          <Modal.CloseButton />
          <Modal.Header>Select Rating</Modal.Header>
          <Modal.Body>
            <FlatList
              data={ratingList}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={({ item }) => (
                <Pressable
                  p={3}
                  bg={menuDetails.rating === item.id ? "primary.100" : "white"}
                  onPress={() => {
                    setMenuDetails((prev) => ({
                      ...prev,
                      rating: item.id,
                    }));
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
