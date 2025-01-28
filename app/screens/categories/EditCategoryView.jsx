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
  Select,
  CheckIcon,
  Spinner,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";

export default function EditCategoryView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [imageSelected, setImageSelected] = useState(false);

  const [categoryDetails, setCategoryDetails] = useState({
    category_name: "",
    image: null,
    food_type: "",
    existing_image: null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategoryDetails();
  }, []);

  const fetchCategoryDetails = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const response = await fetch(
        "https://men4u.xyz/common_api/menu_category_view",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId,
            menu_cat_id: params.categoryId,
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        setCategoryDetails({
          category_name: data.data.name,
          image: null,
          existing_image: data.data.image,
          food_type: data.data.food_type || "",
        });
      } else {
        throw new Error(data.msg || "Failed to fetch category details");
      }
    } catch (error) {
      console.error("Fetch Category Details Error:", error);
      toast.show({
        description: "Failed to load category details",
        status: "error",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setCategoryDetails((prev) => ({
          ...prev,
          image: result.assets[0].uri,
        }));
        setImageSelected(true);
      }
    } catch (error) {
      console.error("Image picking error:", error);
      toast.show({
        description: "Failed to pick image",
        status: "error",
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!categoryDetails.category_name) {
      newErrors.category_name = "Category name is required";
    }
    if (!categoryDetails.food_type) {
      newErrors.food_type = "Food type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");

      const formData = new FormData();
      formData.append("outlet_id", outletId);
      formData.append("user_id", userId);
      formData.append("menu_cat_id", params.categoryId);
      formData.append("category_name", categoryDetails.category_name);
      formData.append("food_type", categoryDetails.food_type);

      if (categoryDetails.image) {
        const imageUri = categoryDetails.image;
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("image", {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      const response = await fetch(
        "https://men4u.xyz/common_api/menu_category_update",
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        toast.show({
          description: "Category updated successfully",
          status: "success",
        });
        router.push({
          pathname: "/screens/categories/CategoryListView",
          params: { refresh: Date.now() },
        });
      } else {
        throw new Error(data.msg || "Failed to update category");
      }
    } catch (error) {
      console.error("Update Category Error:", error);
      toast.show({
        description: error.message || "Failed to update category",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Edit Category" showBackButton />
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Edit Category" showBackButton />

      <ScrollView>
        <VStack space={4} p={4}>
          {/* Category Image */}
          <Box bg="white" rounded="lg" p={4} shadow={1}>
            <Pressable onPress={pickImage}>
              {(imageSelected && categoryDetails.image) ||
              categoryDetails.existing_image ? (
                <Box alignItems="center">
                  <Image
                    source={{
                      uri: categoryDetails.image
                        ? categoryDetails.image
                        : `https://men4u.xyz${categoryDetails.existing_image}`,
                    }}
                    alt="Category Image"
                    size="2xl"
                    rounded="lg"
                  />
                  <Text mt={2} color="coolGray.500">
                    Tap to change image
                  </Text>
                </Box>
              ) : (
                <Box
                  borderWidth={2}
                  borderStyle="dashed"
                  borderColor="coolGray.300"
                  rounded="lg"
                  p={10}
                  alignItems="center"
                >
                  <Icon
                    as={MaterialIcons}
                    name="add-photo-alternate"
                    size={12}
                    color="coolGray.400"
                  />
                  <Text mt={2} color="coolGray.500">
                    Tap to add image
                  </Text>
                </Box>
              )}
            </Pressable>
          </Box>

          {/* Category Details Form */}
          <Box bg="white" rounded="lg" p={4} shadow={1}>
            <VStack space={4}>
              <FormControl isRequired isInvalid={"category_name" in errors}>
                <FormControl.Label>Category Name</FormControl.Label>
                <Input
                  value={categoryDetails.category_name}
                  onChangeText={(value) =>
                    setCategoryDetails((prev) => ({
                      ...prev,
                      category_name: value,
                    }))
                  }
                  placeholder="Enter category name"
                />
                <FormControl.ErrorMessage>
                  {errors.category_name}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={"food_type" in errors}>
                <FormControl.Label>Food Type</FormControl.Label>
                <Select
                  selectedValue={categoryDetails.food_type}
                  minWidth="200"
                  accessibilityLabel="Choose food type"
                  placeholder="Choose food type"
                  _selectedItem={{
                    bg: "primary.100",
                    endIcon: <CheckIcon size="5" />,
                  }}
                  mt={1}
                  onValueChange={(value) =>
                    setCategoryDetails((prev) => ({
                      ...prev,
                      food_type: value,
                    }))
                  }
                >
                  <Select.Item label="Veg" value="veg" />
                  <Select.Item label="Non-Veg" value="nonveg" />
                  <Select.Item label="Vegan" value="vegan" />
                  <Select.Item label="Egg" value="egg" />
                </Select>
                <FormControl.ErrorMessage>
                  {errors.food_type}
                </FormControl.ErrorMessage>
              </FormControl>
            </VStack>
          </Box>

          <Button
            onPress={handleUpdate}
            isLoading={loading}
            isLoadingText="Updating..."
            bg="primary.600"
            _pressed={{ bg: "primary.700" }}
            mb={6}
          >
            Update Category
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
