import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Box,
  FlatList,
  HStack,
  VStack,
  Text,
  Image,
  Pressable,
  Icon,
  Spinner,
  useToast,
  Input,
  IconButton,
  Fab,
  Switch,
  Flex,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import BottomNavigation from "../../components/BottomNavigation";

export default function CategoryListView() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [restaurantName, setRestaurantName] = useState("");
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const outletIdRef = useRef(null);
  
  // Load outlet ID once when component mounts
  useEffect(() => {
    const loadOutletId = async () => {
      const id = await AsyncStorage.getItem("outlet_id");
      outletIdRef.current = id;
    };
    loadOutletId();
  }, []);

  // Get restaurant name from AsyncStorage
  const getRestaurantName = useCallback(async () => {
    try {
      const name = await AsyncStorage.getItem("outlet_name");
      if (name) {
        setRestaurantName(name);
      }
    } catch (error) {
      console.error("Error getting restaurant name:", error);
    }
  }, []);

  // Call getRestaurantName when component mounts
  useEffect(() => {
    getRestaurantName();
  }, [getRestaurantName]);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  useEffect(() => {
    if (params.refresh) {
      fetchCategories();
    }
  }, [params.refresh]);

  useEffect(() => {
    filterCategories();
  }, [searchQuery, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Use stored outletId if available
      if (!outletIdRef.current) {
        outletIdRef.current = await AsyncStorage.getItem("outlet_id");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_category_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletIdRef.current,
        }),
      });

      if (data.st === 1) {
        const validCategories = data.menucat_details.filter(
          (cat) =>
            cat && cat.menu_cat_id !== null && cat.category_name !== "all"
        );
        setCategories(validCategories);
      } else {
        throw new Error(data.msg || "Failed to fetch categories");
      }
    } catch (error) {
      console.error("Fetch Categories Error:", error);
      toast.show({
        description: "Failed to load categories",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = useCallback(() => {
    if (!categories || categories.length === 0) {
      setFilteredCategories([]);
      return;
    }
    
    const filtered = categories.filter((category) =>
      category.category_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCategories(filtered);
  }, [categories, searchQuery]);

  const handleCategoryPress = useCallback((categoryId) => {
    router.push({
      pathname: "/screens/categories/CategoryDetailsView",
      params: { categoryId },
    });
  }, [router]);

  const handleAddCategory = useCallback(() => {
    router.push({
      pathname: "/screens/categories/CreateCategoryView",
    });
  }, [router]);

  // Update the server with the status change
  const updateCategoryStatus = useCallback(async (categoryId, newStatus) => {
    try {
      // Use stored outletId if available
      if (!outletIdRef.current) {
        outletIdRef.current = await AsyncStorage.getItem("outlet_id");
      }

      const response = await fetchWithAuth(`${getBaseUrl()}/update_active_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletIdRef.current,
          type: "menu_category",
          id: categoryId.toString(),
          is_active: newStatus
        }),
      });

      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }, []);

  const handleToggleStatus = useCallback(async (categoryId, currentStatus) => {
    // Don't allow toggle if an update is already pending for this category
    if (pendingUpdates[categoryId]) return;
    
    // Calculate the target status (opposite of current status)
    const targetStatus = !currentStatus;
    
    // Mark this category as having a pending update
    setPendingUpdates(prev => ({
      ...prev,
      [categoryId]: true
    }));
    
    // Optimistically update the UI
    setCategories(prev => 
      prev.map(category => 
        category.menu_cat_id === categoryId 
          ? { ...category, is_active: targetStatus }
          : category
      )
    );
    
    try {
      // Make the API call
      const response = await updateCategoryStatus(categoryId, targetStatus);
      
      if (response.st === 1) {
        // On success, just show a toast
        toast.show({
          description: `Category ${targetStatus ? 'activated' : 'deactivated'}`,
          status: "success",
          duration: 2000,
        });
      } else {
        // On API error, revert the UI change
        setCategories(prev => 
          prev.map(category => 
            category.menu_cat_id === categoryId 
              ? { ...category, is_active: currentStatus }
              : category
          )
        );
        throw new Error(response.msg || "Server error");
      }
    } catch (error) {
      // On exception, revert the UI change and show an error
      setCategories(prev => 
        prev.map(category => 
          category.menu_cat_id === categoryId 
            ? { ...category, is_active: currentStatus }
            : category
        )
      );
      
      toast.show({
        description: "Failed to update status",
        status: "error",
        duration: 3000,
      });
    } finally {
      // Clear the pending status with a small delay
      setTimeout(() => {
        setPendingUpdates(prev => ({
          ...prev,
          [categoryId]: false
        }));
      }, 300);
    }
  }, [pendingUpdates, toast, updateCategoryStatus]);

  const renderCategoryItem = useCallback(({ item }) => {
    const isUpdating = !!pendingUpdates[item.menu_cat_id];
    
    return (
      <Pressable 
        onPress={() => handleCategoryPress(item.menu_cat_id)} 
        mb={3}
        disabled={isUpdating}
      >
        <Box bg="white" rounded="lg" shadow={1} overflow="hidden">
          <HStack space={3} p={3} alignItems="center">
            <Box>
              {item.image ? (
                <Image
                  source={{
                    uri: item.image,
                  }}
                  alt={item.category_name}
                  size="sm"
                  w="70px"
                  h="70px"
                  rounded="md"
                  resizeMode="cover"
                  fallbackElement={
                    <Box
                      w="70px"
                      h="70px"
                      bg="gray.200"
                      rounded="md"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Icon
                        as={MaterialIcons}
                        name="category"
                        size={6}
                        color="gray.400"
                      />
                    </Box>
                  }
                />
              ) : (
                <Box
                  w="70px"
                  h="70px"
                  rounded="md"
                  bg="gray.200"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Icon
                    as={MaterialIcons}
                    name="category"
                    size={6}
                    color="gray.400"
                  />
                </Box>
              )}
            </Box>

            <VStack flex={1} space={1}>
              <Text fontSize="md" fontWeight="bold">
                {item.category_name}
              </Text>
              <HStack space={2} alignItems="center">
                <Icon
                  as={MaterialIcons}
                  name="restaurant-menu"
                  size={4}
                  color="gray.500"
                />
                <Text fontSize="sm" color="gray.500">
                  {item.menu_count} {item.menu_count === 1 ? "Menu" : "Menus"}
                </Text>
              </HStack>
            </VStack>

            <Flex direction="row" alignItems="center">
              {isUpdating && (
                <Spinner size="sm" color="primary.500" mr={2} />
              )}
              <Switch
                size="md"
                // NativeBase Switch doesn't pass an event object, so don't use it
                onToggle={() => handleToggleStatus(item.menu_cat_id, item.is_active)}
                isChecked={item.is_active}
                isDisabled={isUpdating}
                colorScheme="primary"
                _light={{
                  onTrackColor: "primary.500",
                  onThumbColor: "white",
                  offTrackColor: "coolGray.200",
                  offThumbColor: "coolGray.400",
                }}
              />
            </Flex>
          </HStack>
        </Box>
      </Pressable>
    );
  }, [handleCategoryPress, handleToggleStatus, pendingUpdates]);

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Categories" showBackButton />

      {/* Restaurant Name Display */}
      <Box bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
        <Pressable>
          <HStack 
            alignItems="center" 
            justifyContent="space-between" 
            bg="white"
            rounded="md" 
            p={2}
          >
            <HStack alignItems="center" space={2}>
              <Icon as={MaterialIcons} name="store" size={5} color="gray.600" />
              <Text fontWeight="medium" fontSize="md">{restaurantName || ""}</Text>
            </HStack>
          </HStack>
        </Pressable>
      </Box>

      {/* Search Bar */}
      <Box px={4} py={2} bg="white" shadow={1}>
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          bg="coolGray.100"
          borderRadius="lg"
          py={2}
          px={4}
          fontSize="md"
          InputLeftElement={
            <Icon
              as={MaterialIcons}
              name="search"
              size={5}
              ml={2}
              color="gray.400"
            />
          }
          InputRightElement={
            searchQuery ? (
              <IconButton
                icon={
                  <Icon
                    as={MaterialIcons}
                    name="close"
                    size={5}
                    color="gray.400"
                  />
                }
                onPress={() => setSearchQuery("")}
              />
            ) : null
          }
        />
      </Box>

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.menu_cat_id.toString()}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
              <Text color="coolGray.400">No categories found</Text>
            </Box>
          }
        />
      )}

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<Icon color="white" as={MaterialIcons} name="add" size="md" />}
        onPress={handleAddCategory}
        position="absolute"
        bottom={100}
        right={6}
      />
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </Box>
  );
}
