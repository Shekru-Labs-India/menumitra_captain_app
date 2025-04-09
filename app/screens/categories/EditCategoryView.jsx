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
  Switch,
  HStack,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
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
    existing_image: null,
    is_active: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategoryDetails();
  }, []);

  const fetchCategoryDetails = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_category_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          menu_cat_id: params.categoryId,
        }),
      });

      if (data.st === 1) {
        setCategoryDetails({
          category_name: data.data.name,
          image: null,
          existing_image: data.data.image,
          is_active: data.data.is_active === "1" || data.data.is_active === 1,
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
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        // Get file size in MB
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const fileSizeInMB = blob.size / (1024 * 1024);

        if (fileSizeInMB > 3) {
          setErrors(prev => ({
            ...prev,
            image: "Image size should not exceed 3MB"
          }));
          return;
        }

        setCategoryDetails(prev => ({ ...prev, image: result.assets[0].uri }));
        setImageSelected(true);
        // Clear image error if exists
        setErrors(prev => {
          const { image, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error("Image picking error:", error);
      toast.show({
        description: "Failed to pick image",
        status: "error",
        duration: 3000,
        placement: "top",
        isClosable: true,
      });
    }
  };

  const removeImage = () => {
    setCategoryDetails(prev => ({ 
      ...prev, 
      image: null,
      existing_image: null // Also clear existing image to indicate removal
    }));
    setImageSelected(false);
    setErrors(prev => {
      const { image, ...rest } = prev;
      return rest;
    });
    
    // Add toast notification to confirm image removal
    toast.show({
      description: "Image removed. Save to apply changes.",
      status: "info",
      duration: 2000,
      placement: "top",
    });
  };

  const handleCategoryNameChange = (text) => {
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setCategoryDetails((prev) => ({ ...prev, category_name: sanitizedText }));

    if (!sanitizedText.trim()) {
      setErrors((prev) => ({
        ...prev,
        category_name: "Category name is required"
      }));
    } else if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({
        ...prev,
        category_name: "Category name must be at least 2 characters"
      }));
    } else {
      // Properly clear the error when input is valid
      setErrors((prev) => {
        const { category_name, ...rest } = prev;
        return rest;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!categoryDetails.category_name) {
      newErrors.category_name = "Category name is required";
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
      formData.append("is_active", categoryDetails.is_active ? "1" : "0");

      // Handle image cases
      if (categoryDetails.image) {
        // New image selected
        const imageUri = categoryDetails.image;
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("image", {
          uri: imageUri,
          name: filename,
          type,
        });
      } else if (categoryDetails.existing_image === null) {
        // Image was explicitly removed (existing_image is null)
        formData.append("remove_image", "1");
      }
      // If neither condition is met, keep existing image

      console.log("Form data for update:", {
        category_name: categoryDetails.category_name,
        has_new_image: !!categoryDetails.image,
        existing_image: categoryDetails.existing_image,
        remove_image: categoryDetails.existing_image === null ? "1" : undefined,
        is_active: categoryDetails.is_active ? "1" : "0"
      });

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_category_update`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      if (data.st === 1) {
        toast.show({
          description: "Category updated successfully",
          status: "success",
          duration: 3000,
          placement: "bottom",
          isClosable: true,
        });

        // First navigate to list view with refresh parameter
        router.push({
          pathname: "/screens/categories/CategoryListview",
          params: { refresh: Date.now() },
        });

        // Then navigate to details view
        router.push({
          pathname: "/screens/categories/CategoryDetailsView",
          params: {
            categoryId: params.categoryId,
            refresh: Date.now(),
          },
        });
      } else {
        throw new Error(data.msg || "Failed to update category");
      }
    } catch (error) {
      console.error("Update Category Error:", error);
      toast.show({
        description: error.message || "Failed to update category",
        status: "error",
        duration: 3000,
        placement: "top",
        isClosable: true,
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
            <FormControl isInvalid={"image" in errors}>
              <Pressable onPress={pickImage}>
                {(imageSelected && categoryDetails.image) ||
                categoryDetails.existing_image ? (
                  <Box alignItems="center" position="relative">
                    <Image
                      source={{
                        uri: categoryDetails.image || categoryDetails.existing_image,
                      }}
                      alt="Category Image"
                      size="2xl"
                      rounded="lg"
                    />
                    <Pressable
                      position="absolute"
                      top={2}
                      right={2}
                      bg="rgba(0,0,0,0.5)"
                      rounded="full"
                      p={1}
                      onPress={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                    >
                      <Icon
                        as={MaterialIcons}
                        name="close"
                        size="sm"
                        color="white"
                      />
                    </Pressable>
                    <Text mt={2} color="coolGray.500">
                      Tap image to change
                    </Text>
                  </Box>
                ) : (
                  <Box
                    borderWidth={2}
                    borderStyle="dashed"
                    borderColor={errors.image ? "red.500" : "coolGray.300"}
                    rounded="lg"
                    p={10}
                    alignItems="center"
                  >
                    <Icon
                      as={MaterialIcons}
                      name="add-photo-alternate"
                      size={12}
                      color={errors.image ? "red.500" : "coolGray.400"}
                    />
                    <Text mt={2} color={errors.image ? "red.500" : "coolGray.500"}>
                      Tap to add image (Max 3MB)
                    </Text>
                  </Box>
                )}
              </Pressable>
              <FormControl.ErrorMessage>
                {errors.image}
              </FormControl.ErrorMessage>
            </FormControl>
          </Box>

          {/* Category Details Form */}
          <Box bg="white" rounded="lg" p={4} shadow={1}>
            <VStack space={4}>
              <FormControl isRequired isInvalid={"category_name" in errors}>
                <FormControl.Label>Category Name</FormControl.Label>
                <Input
                  value={categoryDetails.category_name}
                  onChangeText={handleCategoryNameChange}
                  placeholder="Enter category name"
                  borderColor={
                    categoryDetails.category_name && !errors.category_name ? "green.500" : 
                    errors.category_name ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: categoryDetails.category_name && !errors.category_name ? "green.500" : 
                                errors.category_name ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.category_name}
                </FormControl.ErrorMessage>
              </FormControl>
              
              {/* Active/Inactive Toggle */}
              <FormControl>
                <FormControl.Label>Category Status</FormControl.Label>
                <HStack alignItems="center" space={2}>
                  <Switch
                    isChecked={categoryDetails.is_active}
                    onToggle={() => setCategoryDetails(prev => ({ ...prev, is_active: !prev.is_active }))}
                    colorScheme={categoryDetails.is_active ? "green" : "red"}
                  />
                  <Text color={categoryDetails.is_active ? "green.600" : "red.600"}>
                    {categoryDetails.is_active ? "Active" : "Inactive"}
                  </Text>
                </HStack>
                <FormControl.HelperText>
                  {categoryDetails.is_active 
                    ? "Active categories will be visible to customers" 
                    : "Inactive categories will be hidden from customers"}
                </FormControl.HelperText>
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
            isDisabled={
              // Only check for category name errors and emptiness
              ("category_name" in errors) || !categoryDetails.category_name.trim()
            }
          >
            Update Category
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
