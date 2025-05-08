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
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import Header from "../../components/Header";
import BottomNavigation from "../../components/BottomNavigation";

export default function CategoryDetailsView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const cancelRef = React.useRef(null);
  const [menuItems, setMenuItems] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (params.categoryId) {
      fetchCategoryDetails();
    }
  }, [params.categoryId]);

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
      setDeleteLoading(true);
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");
      
      if (!outletId) {
        throw new Error("Outlet ID not found");
      }
      
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      console.log("Deleting category:", params.categoryId);
      
      try {
        const data = await fetchWithAuth(`${getBaseUrl()}/menu_category_delete`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            outlet_id: outletId,
            user_id: userId,
            menu_cat_id: params.categoryId,
          }),
        });
        
        console.log("Delete response:", data);
        
        if (data && data.st === 1) {
          // Successful deletion
          handleSuccessfulDeletion();
        } else {
          throw new Error(data?.msg || "Failed to delete category");
        }
      } catch (apiError) {
        console.error("API Error:", apiError);
        
        // Check if we need to verify if deletion was successful
        // Try to fetch the category to see if it still exists
        try {
          // Try to fetch the category details to check if it still exists
          const checkData = await fetchWithAuth(`${getBaseUrl()}/menu_category_view`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              outlet_id: outletId,
              menu_cat_id: params.categoryId,
            }),
          });
          
          // If we can fetch the category details, it still exists
          if (checkData && checkData.st === 1) {
            // Category still exists, show error
            throw apiError;
          } else {
            // Category no longer exists, likely deleted successfully
            console.log("Category not found after delete attempt, assuming successful deletion");
            handleSuccessfulDeletion();
          }
        } catch (checkError) {
          // If we get here with a 'not found' error, the category was deleted
          if (checkError.message && (
              checkError.message.includes("not found") || 
              checkError.message.includes("does not exist") || 
              checkError.message.includes("Invalid category"))) {
            console.log("Confirmed category was deleted despite API error");
            handleSuccessfulDeletion();
          } else {
            // Re-throw original error
            throw apiError;
          }
        }
      }
    } catch (error) {
      console.error("Delete Category Error:", error);
      setIsDeleteDialogOpen(false);
      
      // Don't show error if navigating away (category was deleted)
      if (!isNavigating) {
        toast.show({
          description: error.message || "Failed to delete category. Please try again.",
          status: "error",
          duration: 3000,
          placement: "bottom",
        });
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle successful deletion
  const handleSuccessfulDeletion = () => {
    // Close the delete dialog
    setIsDeleteDialogOpen(false);
    
    // Set navigating flag to prevent error messages while navigating
    setIsNavigating(true);
    
    // Show success message
    toast.show({
      description: "Category deleted successfully",
      status: "success",
      duration: 2000,
      placement: "bottom",
    });
    
    // Navigate to category list view after a short delay
    setTimeout(() => {
      router.push({
        pathname: "/screens/categories/CategoryListview",
        params: { refresh: Date.now() },
      });
    }, 500);
  };

  if (loading || !categoryData) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header 
          title="Category Details" 
          showBackButton 
        />
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
        rightComponent={
          <Pressable onPress={() => setIsDeleteDialogOpen(true)}>
            <Icon
              as={MaterialIcons}
              name="delete-outline"
              size={6}
              color="red.500"
            />
          </Pressable>
        }
      />

      <ScrollView>
        <Box mx={4} mt={4} bg="white" rounded="xl" shadow={2} overflow="hidden">
          {/* Category Image */}
          {categoryData?.image ? (
            <Image
              source={{ uri: categoryData.image }}
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

          {/* Category Name */}
          <Box py={3} px={4} alignItems="center">
            <Text fontSize="xl" fontWeight="bold">
              {categoryData.name}
            </Text>
          </Box>

          {/* Category Details */}
          <Box p={4} borderTopWidth={1} borderTopColor="coolGray.200">
            <VStack space={3}>
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Created On:</Text>
                <Text fontWeight="medium">{categoryData.created_on || ""}</Text>
              </HStack>
              
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Created By:</Text>
                <Text fontWeight="medium">{categoryData.created_by || ""}</Text>
              </HStack>
              
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Updated On:</Text>
                <Text fontWeight="medium">{categoryData.updated_on || ""}</Text>
              </HStack>
              
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Updated By:</Text>
                <Text fontWeight="medium">{categoryData.updated_by || ""}</Text>
              </HStack>
              
              <HStack justifyContent="space-between">
                <Text color="coolGray.600">Status</Text>
                <Text fontWeight="medium" color={categoryData.is_active ? "green.600" : "red.500"}>
                  {categoryData.is_active ? "Active" : "Inactive"}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </Box>

        {/* Menu Items Section - Only show if there are menu items */}
        {menuItems && menuItems.length > 0 && (
          <Box mx={4} my={4} bg="white" rounded="xl" p={4} shadow={2}>
            <Text fontSize="lg" fontWeight="bold" color="coolGray.700" mb={4}>
              Menu Items ({menuItems.length})
            </Text>
            <VStack space={4} divider={<Box h="1px" bg="coolGray.200" />}>
              {menuItems.map((item, index) => (
                <Box key={item.menu_id || index}>
                  <HStack space={3} alignItems="center">
                    {item.image && (
                      <Image
                        source={{ uri: item.image }}
                        alt={item.menu_name || "Menu Item"}
                        size="sm"
                        rounded="md"
                      />
                    )}
                    <VStack flex={1} space={1}>
                      <Text fontSize="md" fontWeight="bold">
                        {item.menu_name}
                      </Text>
                      {item.description && (
                        <Text fontSize="sm" color="coolGray.600" numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                      <HStack space={2} mt={1}>
                        {item.food_type && (
                          <Box px={2} py={0.5} bg={item.food_type === "veg" ? "green.100" : "red.100"} rounded="full">
                            <Text fontSize="2xs" color={item.food_type === "veg" ? "green.600" : "red.600"}>
                              {item.food_type}
                            </Text>
                          </Box>
                        )}
                        <Text fontSize="sm" fontWeight="medium">
                          ₹{item.full_price}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>
        )}
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
        onClose={() => !deleteLoading && setIsDeleteDialogOpen(false)}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton isDisabled={deleteLoading} />
          <AlertDialog.Header>Delete Category</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this category? This action cannot be
            undone.
            {categoryData?.menu_count > 0 && (
              <Text color="red.500" mt={2}>
                Warning: This category contains {categoryData.menu_count} menu items that will also be affected.
              </Text>
            )}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={() => setIsDeleteDialogOpen(false)}
                ref={cancelRef}
                isDisabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button 
                colorScheme="danger" 
                onPress={handleDelete}
                isLoading={deleteLoading}
                isLoadingText="Deleting..."
              >
                Delete
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </Box>
  );
}
