import React, { useState } from "react";
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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import Header from "../../components/Header";

export default function CreateCategoryView() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);

  const [categoryDetails, setCategoryDetails] = useState({
    category_name: "",
    image: null,
  });

  const [errors, setErrors] = useState({});

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
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
      formData.append("category_name", categoryDetails.category_name);

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
        "https://men4u.xyz/common_api/menu_category_create",
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
          description: "Category created successfully",
          status: "success",
        });
        router.push({
          pathname: "/screens/categories/CategoryListView",
          params: { refresh: Date.now() },
        });
      } else {
        throw new Error(data.msg || "Failed to create category");
      }
    } catch (error) {
      console.error("Create Category Error:", error);
      toast.show({
        description: error.message || "Failed to create category",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Create Category" showBackButton />

      <ScrollView>
        <VStack space={4} p={4}>
          {/* Category Image */}
          <Box bg="white" rounded="lg" p={4} shadow={1}>
            <Pressable onPress={pickImage}>
              {imageSelected && categoryDetails.image ? (
                <Box alignItems="center">
                  <Image
                    source={{ uri: categoryDetails.image }}
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
            </VStack>
          </Box>

          <Button
            onPress={handleCreate}
            isLoading={loading}
            isLoadingText="Creating..."
            bg="primary.600"
            _pressed={{ bg: "primary.700" }}
            mb={6}
          >
            Create Category
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
