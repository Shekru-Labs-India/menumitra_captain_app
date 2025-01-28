import React, { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  VStack,
  HStack,
  Text,
  Image,
  Icon,
  IconButton,
  useToast,
  Spinner,
  Pressable,
  AlertDialog,
  Button,
  Fab,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";

export default function CategoryDetailsView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const cancelRef = React.useRef(null);

  useEffect(() => {
    fetchCategoryDetails();
  }, [params.categoryId]);

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
        setCategoryData(data.data);
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
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: "/screens/categories/EditCategoryView",
      params: { categoryId: params.categoryId },
    });
  };

  const handleDelete = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const response = await fetch(
        "https://men4u.xyz/common_api/menu_category_delete",
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
        toast.show({
          description: "Category deleted successfully",
          status: "success",
        });
        // Navigate back to category list with refresh parameter
        router.push({
          pathname: "/screens/categories/CategoryListView",
          params: { refresh: Date.now() },
        });
      } else {
        throw new Error(data.msg || "Failed to delete category");
      }
    } catch (error) {
      console.error("Delete Category Error:", error);
      toast.show({
        description: "Failed to delete category",
        status: "error",
      });
    }
  };

  if (loading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Category Details" showBackButton />
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header
        title="Category Details"
        showBackButton
        rightElements={
          <HStack space={2} alignItems="center" mr={2}>
            <IconButton
              icon={
                <Icon
                  as={MaterialIcons}
                  name="edit"
                  size="md"
                  color="coolGray.600"
                />
              }
              variant="ghost"
              onPress={handleEdit}
            />
            <IconButton
              icon={
                <Icon
                  as={MaterialIcons}
                  name="delete"
                  size="md"
                  color="red.500"
                />
              }
              variant="ghost"
              onPress={() => setIsDeleteDialogOpen(true)}
            />
          </HStack>
        }
      />

      <ScrollView>
        <VStack space={4} p={4}>
          {/* Category Image */}
          <Box bg="white" rounded="lg" overflow="hidden" shadow={1}>
            {categoryData.image ? (
              <Image
                source={{ uri: `https://men4u.xyz${categoryData.image}` }}
                alt={categoryData.name}
                h={200}
                w="100%"
                resizeMode="cover"
              />
            ) : (
              <Box
                h={200}
                bg="gray.200"
                justifyContent="center"
                alignItems="center"
              >
                <Icon
                  as={MaterialIcons}
                  name="category"
                  size={12}
                  color="gray.400"
                />
              </Box>
            )}
          </Box>

          {/* Category Details */}
          <Box bg="white" rounded="lg" p={4} shadow={1}>
            <VStack space={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="xl" fontWeight="bold">
                  {categoryData.name}
                </Text>
                <HStack space={1} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="restaurant-menu"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="md" color="coolGray.500">
                    {categoryData.menu_count}{" "}
                    {categoryData.menu_count === 1 ? "Menu" : "Menus"}
                  </Text>
                </HStack>
              </HStack>

              <VStack space={2}>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="event"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Created on: {categoryData.created_on}
                  </Text>
                </HStack>

                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="update"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Last updated: {categoryData.updated_on}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>

      {/* Add Edit FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<Icon color="white" as={MaterialIcons} name="edit" size="sm" />}
        onPress={handleEdit}
        position="absolute"
        bottom={100}
        right={6}
        bg="primary.600"
        _pressed={{
          bg: "primary.700",
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Category</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this category? This action cannot be
            undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={() => setIsDeleteDialogOpen(false)}
                ref={cancelRef}
              >
                Cancel
              </Button>
              <Button colorScheme="danger" onPress={handleDelete}>
                Delete
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Box>
  );
}
