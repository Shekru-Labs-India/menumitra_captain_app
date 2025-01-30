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
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    if (params.categoryId) {
      fetchCategoryDetails();
    }
  }, [params.categoryId]);

  const fetchCategoryDetails = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(
        "https://men4u.xyz/common_api/menu_category_view",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            outlet_id: outletId,
            menu_cat_id: params.categoryId,
          }),
        }
      );

      const data = await response.json();
      console.log("Category Details Response:", data);
      if (data.st === 1) {
        setCategoryData(data.data);
        console.log("Menu List:", data.data.menu_list);
        setMenuItems(data.data.menu_list || []);
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
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(
        "https://men4u.xyz/common_api/menu_category_delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
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

  if (loading || !categoryData) {
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
            {categoryData?.image ? (
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
                    {categoryData.menu_count || 0}{" "}
                    {categoryData.menu_count === 1 ? "Menu" : "Menus"}
                  </Text>
                </HStack>
              </HStack>

              {/* Creation Details */}
              <VStack
                space={2}
                borderBottomWidth={1}
                borderBottomColor="coolGray.200"
                pb={2}
              >
                <Text fontSize="md" fontWeight="bold" color="coolGray.700">
                  Creation Details
                </Text>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="person"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Created by: {categoryData.created_by || "N/A"}
                  </Text>
                </HStack>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="event"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Created on: {categoryData.created_on || "N/A"}
                  </Text>
                </HStack>
              </VStack>

              {/* Update Details */}
              <VStack space={2}>
                <Text fontSize="md" fontWeight="bold" color="coolGray.700">
                  Last Update Details
                </Text>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="person"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Updated by: {categoryData.updated_by || "N/A"}
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
                    Updated on: {categoryData.updated_on || "N/A"}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          {/* Menu Items Section */}
          {menuItems && menuItems.length > 0 && (
            <Box bg="white" rounded="lg" p={4} shadow={1}>
              <VStack space={4}>
                <Text fontSize="lg" fontWeight="bold" color="coolGray.700">
                  Menu Items ({menuItems.length})
                </Text>
                {menuItems.map((item, index) => (
                  <Box
                    key={item.menu_id || index}
                    py={3}
                    borderBottomWidth={index < menuItems.length - 1 ? 1 : 0}
                    borderBottomColor="coolGray.200"
                  >
                    <HStack space={3} alignItems="center">
                      {item.image && (
                        <Image
                          source={{ uri: `https://men4u.xyz${item.image}` }}
                          alt={item.menu_name || "Menu Item"}
                          size="md"
                          rounded="md"
                        />
                      )}
                      <VStack flex={1} space={2}>
                        {/* Menu Name and Food Type */}
                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text fontSize="md" fontWeight="bold">
                            {item.menu_name}
                          </Text>
                          <HStack
                            space={1}
                            alignItems="center"
                            bg={
                              item.food_type === "veg" ? "green.100" : "red.100"
                            }
                            px={2}
                            py={1}
                            rounded="full"
                          >
                            <Icon
                              as={MaterialIcons}
                              name="restaurant"
                              size={4}
                              color={
                                item.food_type === "veg"
                                  ? "green.600"
                                  : "red.600"
                              }
                            />
                            <Text
                              fontSize="xs"
                              color={
                                item.food_type === "veg"
                                  ? "green.600"
                                  : "red.600"
                              }
                              textTransform="capitalize"
                            >
                              {item.food_type}
                            </Text>
                          </HStack>
                        </HStack>

                        {/* Price Details */}
                        <VStack space={1}>
                          {item.full_price > 0 && (
                            <HStack justifyContent="space-between">
                              <Text fontSize="sm" color="coolGray.600">
                                {item.half_price > 0 ? "Full Price" : "Price"}
                              </Text>
                              <Text fontSize="sm" fontWeight="semibold">
                                ₹{item.full_price}
                              </Text>
                            </HStack>
                          )}
                          {item.half_price > 0 && (
                            <HStack justifyContent="space-between">
                              <Text fontSize="sm" color="coolGray.600">
                                Half Price
                              </Text>
                              <Text fontSize="sm" fontWeight="semibold">
                                ₹{item.half_price}
                              </Text>
                            </HStack>
                          )}
                        </VStack>

                        {/* Description if available */}
                        {item.description && (
                          <Text
                            fontSize="sm"
                            color="coolGray.600"
                            numberOfLines={2}
                          >
                            {item.description}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
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
