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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    image: null,
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
      const response = await fetch(
        "https://men4u.xyz/common_api/menu_category_listview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outlet_id: outletId }),
        }
      );
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
      const response = await fetch(
        "https://men4u.xyz/common_api/get_food_type_list"
      );
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
      const response = await fetch(
        "https://men4u.xyz/common_api/get_spicy_index_list"
      );
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
      const response = await fetch("https://men4u.xyz/common_api/rating_list");
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setMenuDetails((prev) => ({ ...prev, image: result.assets[0].uri }));
      setImageSelected(true);
    }
  };

  const handleSpecialToggle = () => {
    setMenuDetails((prev) => ({
      ...prev,
      is_special: !prev.is_special,
    }));
  };

  const handleCreateMenu = async () => {
    if (
      !menuDetails.name ||
      !menuDetails.full_price ||
      !menuDetails.food_type ||
      !menuDetails.spicy_index ||
      !menuDetails.menu_cat_id
    ) {
      toast.show({
        description: "Please fill all required fields",
        status: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");

      // Append all menu details
      const menuData = {
        ...menuDetails,
        outlet_id: outletId,
        user_id: userId,
        is_special: menuDetails.is_special ? 1 : 0, // Convert boolean to number
      };

      // Append all fields to formData
      Object.keys(menuData).forEach((key) => {
        if (key !== "image") {
          formData.append(key, menuData[key]);
        }
      });

      // Append image if selected
      if (menuDetails.image) {
        const imageUri = menuDetails.image;
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("images", {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      const response = await fetch("https://men4u.xyz/common_api/menu_create", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();
      if (data.st === 1) {
        toast.show({
          description: "Menu created successfully",
          status: "success",
        });

        // Navigate back to MenuListView with refresh parameter
        router.push({
          pathname: "/screens/menus/MenuListView",
          params: { refresh: Date.now() },
        });
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

  return (
    <Box flex={1} bg="gray.100">
      <ScrollView>
        <VStack space={4} p={4}>
          {/* Image Picker */}
          <Pressable onPress={pickImage}>
            <Box
              h={200}
              bg="white"
              rounded="lg"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
              borderWidth={1}
              borderColor="gray.200"
            >
              {menuDetails.image ? (
                <Image
                  source={{ uri: menuDetails.image }}
                  alt="Menu Image"
                  size="full"
                  resizeMode="cover"
                />
              ) : (
                <VStack alignItems="center" space={2}>
                  <Icon
                    as={MaterialIcons}
                    name="add-photo-alternate"
                    size={8}
                    color="coolGray.400"
                  />
                  <Text color="coolGray.400">Add Photo</Text>
                </VStack>
              )}
            </Box>
          </Pressable>

          {/* Form Fields */}
          <VStack space={4} bg="white" p={4} rounded="lg">
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

            <HStack space={4} justifyContent="space-between">
              <FormControl flex={1} isRequired>
                <FormControl.Label>Full Price</FormControl.Label>
                <Input
                  value={menuDetails.full_price}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, full_price: value }))
                  }
                  keyboardType="numeric"
                  placeholder="Enter full price"
                />
              </FormControl>

              <FormControl flex={1}>
                <FormControl.Label>Half Price</FormControl.Label>
                <Input
                  value={menuDetails.half_price}
                  onChangeText={(value) =>
                    setMenuDetails((prev) => ({ ...prev, half_price: value }))
                  }
                  keyboardType="numeric"
                  placeholder="Enter half price"
                />
              </FormControl>
            </HStack>

            <FormControl isRequired>
              <FormControl.Label>Category</FormControl.Label>
              <Pressable onPress={() => setModalVisible(true)}>
                <Input
                  value={
                    categories.find(
                      (cat) => cat.menu_cat_id === menuDetails.menu_cat_id
                    )?.category_name || ""
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
                  placeholder="Select category"
                />
              </Pressable>
            </FormControl>

            <FormControl isRequired>
              <FormControl.Label>Food Type</FormControl.Label>
              <Pressable onPress={() => setFoodTypeModalVisible(true)}>
                <Input
                  value={
                    foodTypes.find((type) => type.id === menuDetails.food_type)
                      ?.name || ""
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
                  placeholder="Select food type"
                />
              </Pressable>
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
                onChangeText={(value) =>
                  setMenuDetails((prev) => ({ ...prev, offer: value }))
                }
                keyboardType="numeric"
                placeholder="Enter offer percentage"
              />
            </FormControl>

            <FormControl isRequired>
              <FormControl.Label>Rating</FormControl.Label>
              <Pressable
                onPress={() => setRatingModalVisible(true)}
                borderWidth={1}
                borderColor="gray.300"
                p={3}
                rounded="md"
              >
                <Text color={menuDetails.rating ? "black" : "gray.400"}>
                  {menuDetails.rating
                    ? ratingList.find((item) => item.key === menuDetails.rating)
                        ?.name
                    : "Select Rating"}
                </Text>
              </Pressable>
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
