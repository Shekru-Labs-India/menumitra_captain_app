import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  FlatList,
  HStack,
  VStack,
  Text,
  Image,
  Pressable,
  Icon,
  Badge,
  Spinner,
  useToast,
  Input,
  IconButton,
  Fab,
  Switch,
  Modal,
  Divider,
  Flex,
  Center,
  Button,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { useFocusEffect } from "@react-navigation/native";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

export default function MenuListView() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMenus, setFilteredMenus] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [settings, setSettings] = useState({ POS_show_menu_image: true });
  const [restaurantName, setRestaurantName] = useState("");
  
  // Add new states for category functionality
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  
  // Add new states for food type filter
  const [foodTypes, setFoodTypes] = useState([]);
  const [selectedFoodType, setSelectedFoodType] = useState(null);
  const [foodTypeModalVisible, setFoodTypeModalVisible] = useState(false);
  
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();

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
    React.useCallback(() => {
      Promise.all([
        fetchMenus(),
        fetchCategories(),
        fetchFoodTypes()
      ]);
    }, [params?.refresh])
  );

  useEffect(() => {
    filterMenus();
  }, [searchQuery, menus, selectedCategory, selectedFoodType]);

  useEffect(() => {
    if (params.refresh) {
      fetchMenus();
    }
  }, [params.refresh]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem("app_settings");
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        console.log("Loaded settings in MenuListView:", parsedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const outletId = await AsyncStorage.getItem("outlet_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
        }),
      });

      if (data.st === 1) {
        setMenus(data.lists);
        setFilteredMenus(data.lists);
      } else {
        throw new Error(data.msg || "Failed to fetch menus");
      }
    } catch (error) {
      console.error("Fetch Menus Error:", error);
      toast.show({
        description: "Failed to load menus",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add fetchCategories function
  const fetchCategories = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const deviceToken = await AsyncStorage.getItem("device_token");
      
      const response = await fetchWithAuth(`${getBaseUrl()}/menu_category_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          device_token: deviceToken
        }),
      });
      
      if (response.st === 1) {
        console.log("Categories fetched successfully");
        const categoriesData = response.menucat_details || [];
        
        const formattedCategories = categoriesData
          .filter(cat => cat && cat.menu_cat_id !== null)
          .map(cat => ({
            category_id: cat.menu_cat_id,
            name: cat.category_name || "Unknown"
          }));
        
        const allOption = { category_id: null, name: "All Categories" };
        setCategories([allOption, ...formattedCategories]);
      } else {
        console.error("Error fetching categories:", response.msg);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Add fetchFoodTypes function
  const fetchFoodTypes = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const deviceToken = await AsyncStorage.getItem("device_token");
      
      const response = await fetchWithAuth(`${getBaseUrl()}/get_food_type_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          device_token: deviceToken
        }),
      });
      
      if (response.st === 1) {
        const foodTypeList = Object.entries(response.food_type_list).map(
          ([key, value]) => ({
            id: key,
            name: value,
          })
        );
        const allOption = { id: null, name: "All Types" };
        setFoodTypes([allOption, ...foodTypeList]);
      } else {
        console.error("Error fetching food types:", response.msg);
        if (response.msg === "Unauthorized access. Please login again.") {
          toast.show({
            description: "Session expired. Please login again.",
            status: "error",
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching food types:", error);
      // Don't show toast for this error to avoid duplicate errors
    }
  };

  const filterMenus = () => {
    if (!menus || menus.length === 0) {
      setFilteredMenus([]);
      return;
    }

    let filtered = [...menus];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(menu => 
        menu.name.toLowerCase().includes(query) ||
        menu.category_name.toLowerCase().includes(query)
      );
      
      // Sort the filtered results based on priority
      filtered.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        
        // Priority 1: Exact match at the start of the name
        if (nameA.startsWith(query) && !nameB.startsWith(query)) return -1;
        if (!nameA.startsWith(query) && nameB.startsWith(query)) return 1;
        
        // Priority 2: Partial match in the name
        const nameMatchA = nameA.includes(query);
        const nameMatchB = nameB.includes(query);
        if (nameMatchA && !nameMatchB) return -1;
        if (!nameMatchA && nameMatchB) return 1;
        
        // Priority 3: Category match (only if no name match)
        if (!nameMatchA && !nameMatchB) {
          const catA = a.category_name.toLowerCase();
          const catB = b.category_name.toLowerCase();
          if (catA.includes(query) && !catB.includes(query)) return -1;
          if (!catA.includes(query) && catB.includes(query)) return 1;
        }
        
        return 0;
      });
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(menu => menu.menu_cat_id === selectedCategory);
    }

    // Apply food type filter
    if (selectedFoodType) {
      filtered = filtered.filter(menu => menu.food_type === selectedFoodType);
    }

    setFilteredMenus(filtered);
  };

  const handleMenuPress = (menuId) => {
    console.log("Navigating to menu details:", menuId);
    try {
      router.push({
        pathname: "/screens/menus/MenuDetailsView",
        params: { menuId: menuId.toString() },
      });
    } catch (error) {
      console.error("Navigation error:", error);
      toast.show({
        description: "Error navigating to menu details",
        status: "error",
      });
    }
  };

  const handleToggleStatus = async (menuId, currentStatus) => {
    try {
      setUpdatingStatus(true);
      const outletId = await AsyncStorage.getItem("outlet_id");

      const response = await fetchWithAuth(`${getBaseUrl()}/update_active_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          type: "menu",
          id: menuId.toString(),
          is_active: !currentStatus
        }),
      });

      if (response.st === 1) {
        // Update the local state
        setMenus(prevMenus => 
          prevMenus.map(menu => 
            menu.menu_id === menuId 
              ? { ...menu, is_active: !currentStatus }
              : menu
          )
        );
        
        toast.show({
          description: `Menu ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
          status: "success",
        });
      } else {
        throw new Error(response.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Update Status Error:", error);
      toast.show({
        description: "Failed to update menu status",
        status: "error",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedFoodType(null);
  };

  const renderSpicyLevel = (level) => {
    const spicyLevel = parseInt(level);
    return (
      <HStack space={1}>
        {[...Array(5)].map((_, index) => (
          <Icon
            key={index}
            as={MaterialIcons}
            name="whatshot"
            size="xs"
            color={index < spicyLevel ? "red.500" : "gray.300"}
          />
        ))}
      </HStack>
    );
  };

  const renderRating = (rating) => {
    const ratingValue = parseFloat(rating);
    if (ratingValue === 0) return null;
    
    return (
      <HStack space={1} alignItems="center">
        <Icon as={MaterialIcons} name="star" size="sm" color="amber.400" />
        <Text fontSize="sm" color="coolGray.600">
          {ratingValue.toFixed(1)}
        </Text>
      </HStack>
    );
  };

  const renderMenuItem = ({ item }) => (
    <Pressable onPress={() => handleMenuPress(item.menu_id)} mb={3}>
      <Box bg="white" rounded="lg" shadow={1} overflow="hidden">
        <HStack space={3} p={3} alignItems="center">
          <Box>
            {settings.POS_show_menu_image && item.image ? (
              <Image
                source={{ uri: item.image }}
                alt={item.name}
                size="sm"
                w="70px"
                h="70px"
                rounded="md"
              />
            ) : (
              <Box
                w="70px"
                h="70px"
                rounded="md"
                bg="coolGray.100"
                justifyContent="center"
                alignItems="center"
              >
                <Icon
                  as={MaterialIcons}
                  name="restaurant"
                  size={5}
                  color="coolGray.400"
                />
                {!settings.POS_show_menu_image && item.image && (
                  <Text fontSize="2xs" color="coolGray.500" textAlign="center" mt={1}>
                    Hidden
                  </Text>
                )}
              </Box>
            )}
          </Box>

          <VStack flex={1} space={1}>
            <Text fontSize="md" fontWeight="bold">
              {item.name}
            </Text>

            <Text fontSize="sm" color="coolGray.600" textTransform="capitalize">
              {item.category_name}
            </Text>

            <HStack justifyContent="space-between" alignItems="center" mt={1}>
              {item.half_price > 0 && (
                <Text fontSize="sm" color="coolGray.600">
                  Half: ₹{item.half_price}
                </Text>
              )}
              <Text fontSize="md" fontWeight="bold" color="primary.600">
                 ₹{item.full_price}
              </Text>
            </HStack>
          </VStack>

          <Switch
            size="md"
            onToggle={() => {
              handleToggleStatus(item.menu_id, item.is_active);
            }}
            isChecked={item.is_active}
            isDisabled={updatingStatus}
            colorScheme="primary"
            _light={{
              onTrackColor: "primary.500",
              onThumbColor: "white",
              offTrackColor: "coolGray.200",
              offThumbColor: "coolGray.400",
            }}
          />
        </HStack>
      </Box>
    </Pressable>
  );

  // Category Modal Component
  const CategoryModal = () => (
    <Modal isOpen={categoryModalVisible} onClose={() => setCategoryModalVisible(false)} size="xl">
      <Modal.Content maxH="80%">
        <Modal.CloseButton />
        <Modal.Header>Select Category</Modal.Header>
        <Modal.Body>
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <Pressable
                py={3}
                px={2}
                bg={selectedCategory === item.category_id ? "primary.100" : "white"}
                _pressed={{ bg: "primary.100" }}
                onPress={() => {
                  setSelectedCategory(item.category_id);
                  setCategoryModalVisible(false);
                }}
                borderBottomWidth={1}
                borderBottomColor="coolGray.200"
              >
                <Text
                  color={selectedCategory === item.category_id ? "primary.600" : "coolGray.800"}
                  fontWeight={selectedCategory === item.category_id ? "bold" : "normal"}
                >
                  {item.name}
                </Text>
              </Pressable>
            )}
            keyExtractor={(item) => (item.category_id?.toString() || "all")}
          />
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );

  // Food Type Modal Component
  const FoodTypeModal = () => (
    <Modal isOpen={foodTypeModalVisible} onClose={() => setFoodTypeModalVisible(false)} size="xl">
      <Modal.Content maxH="80%">
        <Modal.CloseButton />
        <Modal.Header>Select Food Type</Modal.Header>
        <Modal.Body>
          <FlatList
            data={foodTypes}
            renderItem={({ item }) => (
              <Pressable
                py={3}
                px={2}
                bg={selectedFoodType === item.id ? "primary.100" : "white"}
                _pressed={{ bg: "primary.100" }}
                onPress={() => {
                  setSelectedFoodType(item.id);
                  setFoodTypeModalVisible(false);
                }}
                borderBottomWidth={1}
                borderBottomColor="coolGray.200"
              >
                <Text
                  color={selectedFoodType === item.id ? "primary.600" : "coolGray.800"}
                  fontWeight={selectedFoodType === item.id ? "bold" : "normal"}
                >
                  {item.name}
                </Text>
              </Pressable>
            )}
            keyExtractor={(item) => (item.id?.toString() || "all")}
          />
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Menu List" showBackButton />

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
              <Icon as={MaterialIcons} name="restaurant" size={5} color="gray.600" />
              <Text fontWeight="medium" fontSize="md">{restaurantName || "Select Restaurant"}</Text>
            </HStack>
          </HStack>
        </Pressable>
      </Box>

      {/* Search Bar */}
      <Box px={4} py={2} bg="white" shadow={1}>
        <Input
          placeholder="Search menus..."
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

        {/* Filter Section */}
        <HStack space={2} mt={3} alignItems="center">
          <Pressable 
            flex={1}
            onPress={() => setCategoryModalVisible(true)}
            bg={selectedCategory ? "primary.500" : "white"}
            py={2}
            px={3}
            rounded="md"
            borderWidth={1}
            borderColor="coolGray.300"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text 
              color={selectedCategory ? "white" : "coolGray.600"}
              numberOfLines={1}
              flex={1}
            >
              {selectedCategory 
                ? categories.find(c => c.category_id === selectedCategory)?.name 
                : "All Categories"}
            </Text>
            <Icon 
              as={MaterialIcons} 
              name="arrow-drop-down" 
              size="sm" 
              color={selectedCategory ? "white" : "coolGray.500"}
            />
          </Pressable>
          
          <Pressable 
            flex={1}
            onPress={() => setFoodTypeModalVisible(true)}
            bg={selectedFoodType ? "primary.500" : "white"}
            py={2}
            px={3}
            rounded="md"
            borderWidth={1}
            borderColor="coolGray.300"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text 
              color={selectedFoodType ? "white" : "coolGray.600"}
              numberOfLines={1}
              flex={1}
            >
              {selectedFoodType 
                ? foodTypes.find(t => t.id === selectedFoodType)?.name 
                : "All Types"}
            </Text>
            <Icon 
              as={MaterialIcons} 
              name="arrow-drop-down" 
              size="sm" 
              color={selectedFoodType ? "white" : "coolGray.500"}
            />
          </Pressable>
          
          {(selectedCategory || selectedFoodType) && (
            <IconButton
              icon={<Icon as={MaterialIcons} name="refresh" size="sm" color="coolGray.500" />}
              onPress={resetFilters}
              variant="outline"
              colorScheme="coolGray"
              size="sm"
              rounded="full"
              borderColor="coolGray.300"
            />
          )}
        </HStack>
      </Box>

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      ) : (
        <FlatList
          data={filteredMenus}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.menu_id.toString()}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Center flex={1} p={10}>
              <Icon 
                as={MaterialIcons} 
                name="search-off" 
                size="5xl" 
                color="coolGray.300" 
                mb={4}
              />
              <Text color="coolGray.400">No menu items found</Text>
              {(selectedCategory || selectedFoodType) && (
                <Button mt={4} variant="subtle" onPress={resetFilters}>
                  Clear Filters
                </Button>
              )}
            </Center>
          }
        />
      )}

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<Icon color="white" as={MaterialIcons} name="add" size="md" />}
        onPress={() => router.push("/screens/menus/CreateMenuView")}
        position="absolute"
        bottom={100}
        right={6}
      />

      {/* Render Modals */}
      <CategoryModal />
      <FoodTypeModal />
    </Box>
  );
}
