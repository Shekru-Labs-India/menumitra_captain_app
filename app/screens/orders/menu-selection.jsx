import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { 
  Box, 
  HStack, 
  VStack, 
  Text, 
  Pressable, 
  ScrollView, 
  Center,
  useToast,
  Spinner
} from "native-base";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import Header from "../../../app/components/Header";
import { SafeAreaView } from "react-native-safe-area-context";

// Main component - renamed from DemoScreen to MenuSelectionScreen
export default function MenuSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  
  // Parse params passed from the tables screen
  const tableData = useMemo(() => {
    if (params.tableId && params.tableNumber && params.sectionId) {
      return {
        table_id: params.tableId,
        table_number: params.tableNumber,
        section_id: params.sectionId,
        section_name: params.sectionName,
        outlet_id: params.outletId,
        is_occupied: params.isOccupied === "1",
        order_id: params.orderId,
        order_number: params.orderNumber
      };
    }
    return null;
  }, [params]);
  
  const orderType = params.orderType || "dine-in";
  const orderDetailsString = params.orderDetails || "{}";
  const orderDetails = useMemo(() => {
    try {
      return JSON.parse(orderDetailsString);
    } catch (error) {
      console.error("Error parsing order details:", error);
      return {};
    }
  }, [orderDetailsString]);

  // State variables
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [existingOrderDetails, setExistingOrderDetails] = useState(null);
  const [existingMenuQuantities, setExistingMenuQuantities] = useState({});
  const [isReserved, setIsReserved] = useState(false);
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  // Add new state variables for table switching
  const [showTableSwitcher, setShowTableSwitcher] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Initialize cart from existing order if available
  useEffect(() => {
    if (orderDetails?.menu_items && orderDetails.menu_items.length > 0) {
      // Create a map of menu_id to quantity from existing order
      const quantityMap = {};
      orderDetails.menu_items.forEach(item => {
        quantityMap[item.menu_id] = parseInt(item.quantity) || 0;
      });
      setExistingMenuQuantities(quantityMap);
      
      // Initialize cart with existing menu items
      const cartItems = orderDetails.menu_items.map(item => ({
        menu_id: item.menu_id,
        name: item.menu_name || item.name,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        total_price: parseFloat(item.total_price) || parseFloat(item.price) * (parseInt(item.quantity) || 1),
        offer: parseFloat(item.offer) || 0,
        specialInstructions: item.specialInstructions || "",
        category_name: item.category_name || "",
        food_type: item.food_type || "",
        isNewItem: false
      }));
      setCart(cartItems);
    }
  }, [orderDetails]);

  // Fetch existing order details if orderId exists
  useEffect(() => {
    if (params.orderId) {
      fetchExistingOrder();
    }
  }, [params.orderId]);

  // Fetch menu data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Add this function after the existing useEffect hooks
  const checkTableReservationStatus = async () => {
    try {
      const response = await fetchWithAuth(`${getBaseUrl()}/check_table_is_reserved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: parseInt(tableData.outlet_id),
          table_id: parseInt(tableData.table_id),
          table_number: parseInt(tableData.table_number)
        }),
      });

      if (response.st === 1) {
        setIsReserved(response.is_reserved);
      }
    } catch (error) {
      console.error("Error checking table reservation:", error);
    }
  };

  // Add this useEffect to check reservation status when component mounts
  useEffect(() => {
    if (tableData?.table_id) {
      checkTableReservationStatus();
    }
  }, [tableData]);

  // Function to fetch menu categories and items
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      
      const response = await fetchWithAuth(`${getBaseUrl()}/get_all_menu_list_by_category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId
        }),
      });

      if (response.st === 1) {
        // Process categories
        const categoriesData = response.data.category || [];
        const allCategories = [
          {
            menu_cat_id: 0,
            category_name: "ALL",
            menu_count: response.data.menus?.length || 0,
          },
          ...categoriesData,
        ];
        
        setCategories(allCategories);
        
        // Process menu items
        const menusData = response.data.menus || [];
        const formattedMenuItems = menusData.map(item => ({
          menu_id: item.menu_id,
          name: item.menu_name,
          price: parseFloat(item.price) || 0,
          full_price: parseFloat(item.price) || 0,
          image: item.image,
          category_id: item.menu_cat_id,
          category_name: item.category_name,
          offer: item.offer,
          food_type: item.menu_food_type,
          quantity: 1,
          total_price: parseFloat(item.price) || 0,
        }));
        
        setMenuItems(formattedMenuItems);
        setFilteredMenuItems(formattedMenuItems);
      } else {
        toast.show({
          description: "Failed to load menu data",
          status: "error"
        });
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
      toast.show({
        description: "Error loading menu data",
        status: "error"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to fetch existing order
  const fetchExistingOrder = async () => {
    try {
      const response = await fetchWithAuth(`${getBaseUrl()}/order_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: params.orderId
        }),
      });

      if (response.st === 1 && response.lists) {
        setExistingOrderDetails(response.lists.order_details);
        
        // Create a map of menu_id to quantity from existing order
        const quantityMap = {};
        response.lists.menu_details.forEach(item => {
          quantityMap[item.menu_id] = item.quantity;
        });
        setExistingMenuQuantities(quantityMap);
        
        // Initialize cart with existing menu items
        const cartItems = response.lists.menu_details.map(item => ({
          menu_id: item.menu_id,
          name: item.menu_name,
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          total_price: parseFloat(item.price) * (parseInt(item.quantity) || 1),
          offer: parseFloat(item.offer) || 0,
          specialInstructions: item.comment || "",
          isNewItem: false
        }));
        setCart(cartItems);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.show({
        description: "Error loading order details",
        status: "error"
      });
    }
  };

  // Handle search input
  const handleSearch = (text) => {
    setSearchQuery(text);
    
    if (text.trim() === "") {
      // If search is cleared, show items from selected category only
      if (selectedCategory === "ALL") {
        setFilteredMenuItems(menuItems);
      } else {
        const categoryFiltered = menuItems.filter(item => 
          item.category_name.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
        );
        setFilteredMenuItems(categoryFiltered);
      }
    } else {
      // When searching, search across ALL menu items regardless of selected category
      const searchResults = menuItems.filter(item =>
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredMenuItems(searchResults);
    }
  };
  
  // Filter menu items by category
  const filterByCategory = (category) => {
    setSelectedCategory(category);
    
    if (searchQuery.trim() !== "") {
      const searchResults = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMenuItems(searchResults);
      return;
    }
  
    if (category === "ALL") {
      setFilteredMenuItems(menuItems);
    } else {
      const filtered = menuItems.filter(
        (item) => item.category_name.toLowerCase().trim() === category.toLowerCase().trim()
      );
      setFilteredMenuItems(filtered);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Add item to cart
  const addToCart = (item) => {
    const existingItemIndex = cart.findIndex(
      (cartItem) => cartItem.menu_id === item.menu_id
    );

    if (existingItemIndex !== -1) {
      // Update existing item
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: updatedCart[existingItemIndex].quantity + 1,
        total_price:
          (updatedCart[existingItemIndex].price || 0) *
          (updatedCart[existingItemIndex].quantity + 1),
      };
      setCart(updatedCart);
    } else {
      // Add new item
      const newItem = {
        ...item,
        quantity: 1,
        total_price: item.price || 0,
        isNewItem: true, // Mark as new item
      };
      setCart((prev) => [...prev, newItem]);
    }
  };

  // Handle adding to cart with half/full portion option
  const handleAddToCart = (item) => {
    if (item.half_price > 0 && item.full_price > 0) {
      setSelectedItem(item);
      setModalVisible(true); // Show modal if both prices are available
    } else {
      // For items with only full price
      addToCart({ 
        ...item, 
        price: item.full_price,
        portion: 'full',
        isNewItem: true
      }); 
    }
  };

  // Confirm portion selection and add to cart
  const confirmAddToCart = (priceType) => {
    if (selectedItem) {
      const itemToAdd = {
        ...selectedItem,
        price: priceType === "full" ? selectedItem.full_price : selectedItem.half_price,
        portion: priceType,
        isNewItem: true
      };
      addToCart(itemToAdd);
      setModalVisible(false);
      setSelectedItem(null);
    }
  };

  // Navigate to create order screen with cart items
  const navigateToCreateOrder = () => {
    // Format cart items with consistent structure to match create-order expectations
    const formattedCartItems = cart.map(item => ({
      menu_id: item.menu_id,
      name: item.name,
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1,
      total_price: parseFloat(item.price) * (parseInt(item.quantity) || 1),
      portion: item.portion || 'full',
      offer: parseFloat(item.offer) || 0,
      specialInstructions: item.specialInstructions || "",
      isNewItem: true,
      half_price: item.half_price || 0,
      full_price: item.full_price || item.price,
      category_name: item.category_name || "",
      food_type: item.food_type || ""
    }));

    // Log the data being passed
    console.log("Navigating to create-order with cart items:", formattedCartItems.length);
    console.log("Cart items details:", JSON.stringify(formattedCartItems));
    console.log("New items in cart:", formattedCartItems.filter(item => item.isNewItem).length);

    router.push({
      pathname: "/screens/orders/create-order",
      params: {
        tableId: tableData?.table_id,
        tableNumber: tableData?.table_number,
        sectionId: tableData?.section_id,
        sectionName: tableData?.section_name,
        outletId: tableData?.outlet_id,
        isOccupied: tableData?.is_occupied ? "1" : "0",
        orderId: tableData?.order_id,
        orderNumber: tableData?.order_number,
        orderType: orderType,
        orderDetails: JSON.stringify({
          ...orderDetails,
          menu_items: formattedCartItems
        })
      }
    });
  };

  // Get food type color for indicators
  const getFoodTypeColor = (foodType) => {
    switch(foodType?.toLowerCase()) {
      case 'veg':
        return '#2ecc71'; // Green for veg
      case 'nonveg':
      case 'non-veg':
      case 'non veg':
        return '#e74c3c'; // Red for non-veg
      case 'egg':
        return '#95a5a6'; // Grey for egg
      case 'vegan':
        return '#f1c40f'; // Yellow for vegan
      default:
        return '#bbb'; // Default grey
    }
  };

  // Render category item
  const renderCategoryItem = ({ item }) => {
    // Calculate badge count (items in cart from this category)
    const badgeCount = cart.reduce((total, cartItem) => {
      // For ALL category, show total quantity of all items
      if (item.category_name === "ALL") {
        return total + (parseInt(cartItem.quantity) || 0);
      }
      
      // For specific categories, only count items from that category
      if (cartItem.category_name.toLowerCase().trim() === item.category_name.toLowerCase().trim()) {
        return total + (parseInt(cartItem.quantity) || 0);
      }
      return total;
    }, 0);

    // Also check existingMenuQuantities for the category if it's a new session
    if (!badgeCount && item.category_name !== "ALL") {
      // Get all menu items for this category
      const categoryMenuIds = menuItems
        .filter(menuItem => menuItem.category_name.toLowerCase().trim() === item.category_name.toLowerCase().trim())
        .map(menuItem => menuItem.menu_id);

      // Sum up quantities from existingMenuQuantities for this category's items
      const existingCount = Object.entries(existingMenuQuantities)
        .reduce((total, [menuId, quantity]) => {
          if (categoryMenuIds.includes(parseInt(menuId))) {
            return total + (parseInt(quantity) || 0);
          }
          return total;
        }, 0);

      if (existingCount > 0) {
        return (
          <Pressable
            style={[
              styles.categoryItem,
              selectedCategory === item.category_name && styles.activeCategoryItem,
            ]}
            onPress={() => filterByCategory(item.category_name)}
          >
            <Box alignItems="center" position="relative">
              <Box w={50} h={50} bg="gray.200" borderRadius={25} mb={1} justifyContent="center" alignItems="center">
                <MaterialIcons name="restaurant" size={24} color="#999" />
              </Box>
              <Text fontSize="sm" fontWeight="bold" textAlign="center">{item.category_name}</Text>
              
              <Box 
                position="absolute" 
                top={-5} 
                right={-5} 
                bg="red.500" 
                w={5} 
                h={5} 
                borderRadius={10} 
                justifyContent="center" 
                alignItems="center"
                shadow={2}
              >
                <Text color="white" fontSize="2xs" fontWeight="bold">{existingCount}</Text>
              </Box>
            </Box>
          </Pressable>
        );
      }
    }
    
    return (
      <Pressable
        style={[
          styles.categoryItem,
          selectedCategory === item.category_name && styles.activeCategoryItem,
        ]}
        onPress={() => filterByCategory(item.category_name)}
      >
        <Box alignItems="center" position="relative">
          <Box w={50} h={50} bg="gray.200" borderRadius={25} mb={1} justifyContent="center" alignItems="center">
            <MaterialIcons name="restaurant" size={24} color="#999" />
          </Box>
          <Text fontSize="sm" fontWeight="bold" textAlign="center">{item.category_name}</Text>
          
          {(badgeCount > 0 || (item.category_name === "ALL" && Object.values(existingMenuQuantities).reduce((a, b) => a + (parseInt(b) || 0), 0) > 0)) && (
            <Box 
              position="absolute" 
              top={-5} 
              right={-5} 
              bg="red.500" 
              w={5} 
              h={5} 
              borderRadius={10} 
              justifyContent="center" 
              alignItems="center"
              shadow={2}
            >
              <Text color="white" fontSize="2xs" fontWeight="bold">
                {item.category_name === "ALL" 
                  ? Object.values(existingMenuQuantities).reduce((a, b) => a + (parseInt(b) || 0), 0) + badgeCount
                  : badgeCount || 0}
              </Text>
            </Box>
          )}
        </Box>
      </Pressable>
    );
  };

  // Render menu item with quantity badge
  const renderMenuItem = ({ item }) => {
    const cartItem = cart.find(cartItem => cartItem.menu_id === item.menu_id);
    const existingQuantity = existingMenuQuantities[item.menu_id] || 0;
    const quantity = cartItem ? cartItem.quantity : existingQuantity;
    const foodTypeColor = getFoodTypeColor(item.food_type);

    return (
      <Pressable 
        style={[styles.menuItem, isReserved && styles.disabledMenuItem]}
        onPress={() => {
          if (isReserved) {
            toast.show({
              description: "Cannot add items to a reserved table",
              status: "warning",
              duration: 2000
            });
            return;
          }

          if (cartItem) {
            if (cartItem.quantity >= 20) {
              toast.show({
                description: "Maximum 20 items allowed per menu",
                status: "warning",
                duration: 2000
              });
              return;
            }
            const updatedCart = cart.map(ci => 
              ci.menu_id === item.menu_id 
                ? {...ci, quantity: ci.quantity + 1}
                : ci
            );
            setCart(updatedCart);
          } else {
            addToCart({
              ...item,
              price: item.price,
              portion: 'full',
              isNewItem: true
            });
          }
        }}
      >
        <Box position="absolute" bottom={0} left={0} right={0} h={1} bg={foodTypeColor} />
        
        <Box w="100%" h={120} bg={isReserved ? "gray.200" : "gray.100"} borderRadius={8} mb={1} justifyContent="center" alignItems="center" overflow="hidden" position="relative">
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={[styles.menuImage, isReserved && styles.disabledImage]}
              onError={() => console.log('Image failed to load:', item.image)}
            />
          ) : (
            <Center h="100%" w="100%">
              <MaterialIcons name="restaurant" size={40} color={isReserved ? "#999" : "#666"} />
            </Center>
          )}
          
          {quantity > 0 && (
            <Box 
              position="absolute" 
              top={2} 
              right={2} 
              bg="cyan.500" 
              w={6} 
              h={6} 
              borderRadius={12} 
              justifyContent="center" 
              alignItems="center"
              shadow={2}
            >
              <Text color="white" fontSize="xs" fontWeight="bold">{quantity}</Text>
            </Box>
          )}

          {item.offer > 0 && (
            <Box
              position="absolute"
              left={2}
              top={2}
              bg="red.500"
              px={1}
              py={0.5}
              rounded="sm"
              zIndex={1}
            >
              <Text color="white" fontSize="2xs" fontWeight="bold">
                {item.offer}% OFF
              </Text>
            </Box>
          )}
        </Box>
        
        <Text fontSize="sm" numberOfLines={2} mb={1} color={isReserved ? "#999" : "#000"}>{item.name}</Text>
        
        <HStack justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold" color={isReserved ? "gray.400" : "cyan.500"}>₹{item.price}</Text>
        </HStack>
        
        {item.category_name && item.category_name.toLowerCase().trim() !== selectedCategory.toLowerCase().trim() && (
          <Text fontSize="2xs" color={isReserved ? "gray.400" : "gray.500"} fontStyle="italic" mt={1}>
            From: {item.category_name}
          </Text>
        )}
      </Pressable>
    );
  };

  // Render floating cart button
  const renderFloatingCart = () => {
    if (cart.length === 0) return null;

    return (
      <Pressable
        style={styles.floatingCart}
        onPress={navigateToCreateOrder}
      >
        <HStack alignItems="center">
          <MaterialIcons name="shopping-cart" size={24} color="#0dcaf0" />
          <Text ml={2} fontSize="md" fontWeight="bold" color="#0dcaf0">{cart.length}</Text>
          <Text ml={2} fontWeight="bold" color="#0dcaf0">View Cart</Text>
        </HStack>
      </Pressable>
    );
  };

  // Get header title
  const getHeaderTitle = () => {
    if (orderType === "dine-in" && tableData) {
      return `Table ${tableData.table_number} - ${tableData.section_name}`;
    }
    return `New ${toTitleCase(orderType)} Order`;
  };

  // Add fetchAvailableTables function
  const fetchAvailableTables = async () => {
    try {
      setLoadingTables(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedOutletId || !tableData || !storedUserId) {
        throw new Error("Missing outlet, user, or table data");
      }
      
      const response = await fetchWithAuth(`${getBaseUrl()}/get_available_tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId,
          section_id: tableData.section_id,
          current_table_id: tableData.table_id,
          user_id: storedUserId.toString()
        }),
      });
      
      if (response.st === 1 && response.tables) {
        // Filter out the current table
        const tables = response.tables.filter(
          (table) => table.table_id !== tableData.table_id
        );
        setAvailableTables(tables);
      } else {
        toast.show({
          description: response.msg || "No available tables found",
          status: "warning"
        });
      }
    } catch (error) {
      console.error("Error fetching available tables:", error);
      toast.show({
        description: "Failed to load available tables",
        status: "error"
      });
    } finally {
      setLoadingTables(false);
    }
  };

  // Add switchTable function
  const switchTable = async (newTableId, newTableNumber) => {
    try {
      // First, close the modal immediately
      setShowTableSwitcher(false);
      
      // Then show loading
      setLoadingTables(true);
      
      const storedUserId = await AsyncStorage.getItem("user_id");
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      
      if (!storedUserId || !storedOutletId || !tableData) {
        throw new Error("Missing user, outlet, or table data");
      }
      
      const response = await fetchWithAuth(`${getBaseUrl()}/update_table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: tableData.table_number.toString(),
          new_table_number: newTableNumber.toString(),
          section_id: tableData.section_id,
          outlet_id: storedOutletId,
          order_id: tableData.order_id,
          user_id: storedUserId
        }),
      });
      
      if (response.st === 1) {
        toast.show({
          description: response.msg || `Table switched from ${tableData.table_number} to ${newTableNumber}`,
          status: "success"
        });
        
        // Navigate back to tables screen to refresh
        router.replace({
          pathname: "/(tabs)/tables",
          params: { 
            refresh: Date.now().toString(),
            status: "completed"
          }
        });
      } else {
        toast.show({
          description: response.msg || "Failed to switch table",
          status: "error"
        });
      }
    } catch (error) {
      console.error("Error switching table:", error);
      toast.show({
        description: "Failed to switch table. Please try again.",
        status: "error"
      });
    } finally {
      setLoadingTables(false);
    }
  };

  // Add TableSwitcherModal component
  const renderTableSwitcherModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTableSwitcher}
        onRequestClose={() => setShowTableSwitcher(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTableSwitcher(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.tableSwitcherContainer}>
                <View style={styles.tableSwitcherHeader}>
                  <Text style={styles.tableSwitcherTitle}>
                    Available Tables
                  </Text>
                  <Pressable onPress={() => setShowTableSwitcher(false)}>
                    <MaterialIcons name="close" size={24} color="#333" />
                  </Pressable>
                </View>
                
                {loadingTables ? (
                  <Center py={5}>
                    <Spinner size="lg" color="cyan.500" />
                    <Text mt={3} color="gray.600">Loading available tables...</Text>
                  </Center>
                ) : availableTables.length === 0 ? (
                  <Center py={5}>
                    <MaterialIcons name="error-outline" size={44} color="#999" />
                    <Text style={styles.noTablesText}>No available tables in this section</Text>
                  </Center>
                ) : (
                  <FlatList
                    data={availableTables}
                    keyExtractor={(item) => item.table_id.toString()}
                    style={{ maxHeight: 300 }}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.tableItem}
                        onPress={() => switchTable(item.table_id, item.table_number)}
                      >
                        <Text style={styles.tableItemText}>Table {item.table_number}</Text>
                        <MaterialIcons name="arrow-forward-ios" size={20} color="#0dcaf0" />
                      </Pressable>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                )}
                
                {/* <Pressable
                  style={styles.refreshButton}
                  onPress={fetchAvailableTables}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </Pressable> */}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header 
        title={getHeaderTitle()} 
        rightComponent={
          orderType === "dine-in" && tableData ? (
            <HStack space={2}>
              {/* Add Table Switch Button */}
              {tableData.order_id && (
                <Pressable
                  onPress={() => {
                    setShowTableSwitcher(true);
                    fetchAvailableTables();
                  }}
                  bg="cyan.500"
                  px={3}
                  py={1.5}
                  rounded="md"
                  _pressed={{
                    bg: "cyan.600"
                  }}
                >
                  <HStack space={1} alignItems="center">
                    <MaterialIcons name="swap-horiz" size={20} color="white" />
                    <Text color="white" fontWeight="medium">Switch</Text>
                  </HStack>
                </Pressable>
              )}
              
              {isReserved ? (
                <Pressable
                  onPress={async () => {
                    try {
                      const response = await fetchWithAuth(`${getBaseUrl()}/table_is_reserved`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          table_id: parseInt(tableData.table_id),
                          table_number: parseInt(tableData.table_number),
                          outlet_id: parseInt(tableData.outlet_id),
                          is_reserved: false
                        }),
                      });

                      if (response.st === 1) {
                        setIsReserved(false);
                        toast.show({
                          description: "Table has been unreserved",
                          status: "success"
                        });
                        router.replace({
                          pathname: "/(tabs)/tables",
                          params: { 
                            refresh: Date.now().toString(),
                            status: "completed"
                          }
                        });
                      } else {
                        toast.show({
                          description: response.msg || "Failed to unreserve table",
                          status: "error"
                        });
                      }
                    } catch (error) {
                      console.error("Error unreserving table:", error);
                      toast.show({
                        description: "Failed to unreserve table",
                        status: "error"
                      });
                    }
                  }}
                  bg="red.500"
                  px={3}
                  py={1.5}
                  rounded="md"
                  _pressed={{
                    bg: "red.600"
                  }}
                >
                  <HStack space={1} alignItems="center">
                    <MaterialIcons name="event-busy" size={20} color="white" />
                    <Text color="white" fontWeight="medium">Unreserve</Text>
                  </HStack>
                </Pressable>
              ) : !tableData.is_occupied && !tableData.order_id ? (
                <Pressable
                  onPress={async () => {
                    try {
                      const response = await fetchWithAuth(`${getBaseUrl()}/table_is_reserved`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          table_id: parseInt(tableData.table_id),
                          table_number: parseInt(tableData.table_number),
                          outlet_id: parseInt(tableData.outlet_id),
                          is_reserved: true
                        }),
                      });

                      if (response.st === 1) {
                        setReserveModalVisible(true);
                        setIsReserved(true);
                        toast.show({
                          description: "Table has been reserved",
                          status: "success"
                        });
                        router.replace({
                          pathname: "/(tabs)/tables",
                          params: { 
                            refresh: Date.now().toString(),
                            status: "completed"
                          }
                        });
                      } else {
                        toast.show({
                          description: response.msg || "Failed to reserve table",
                          status: "error"
                        });
                      }
                    } catch (error) {
                      console.error("Error reserving table:", error);
                      toast.show({
                        description: "Failed to reserve table",
                        status: "error"
                      });
                    }
                  }}
                  bg="green.500"
                  px={3}
                  py={1.5}
                  rounded="md"
                  _pressed={{
                    bg: "green.600"
                  }}
                >
                  <HStack space={1} alignItems="center">
                    <MaterialIcons name="event-available" size={20} color="white" />
                    <Text color="white" fontWeight="medium">Reserve</Text>
                  </HStack>
                </Pressable>
              ) : null}
            </HStack>
          ) : null
        }
      />
      
      <Box px={3} py={2}>
        <HStack space={3} alignItems="center" bg="white" borderRadius={8} px={3} borderWidth={1} borderColor="gray.200">
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery ? (
            <Pressable onPress={() => handleSearch("")}>
              <MaterialIcons name="close" size={20} color="#666" />
            </Pressable>
          ) : null}
        </HStack>
      </Box>

      {isReserved && orderType === "dine-in" && (
        <Box px={3} mb={2}>
          <HStack space={2} alignItems="center" bg="red.50" p={3} borderRadius={8} borderWidth={1} borderColor="red.200">
            <MaterialIcons name="lock" size={24} color="#e74c3c" />
            <Text color="red.700" fontWeight="medium">This table is reserved</Text>
          </HStack>
        </Box>
      )}
      
      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="cyan.500" />
        </Center>
      ) : (
        <HStack flex={1}>
          <Box w="25%" borderRightWidth={1} borderColor="gray.200">
            <Text fontSize="md" fontWeight="bold" p={2} textAlign="center" bg="white">
              Category
            </Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.menu_cat_id.toString()}
              renderItem={renderCategoryItem}
              showsVerticalScrollIndicator={false}
            />
          </Box>
          
          <Box w="75%" pl={2}>
            <Text fontSize="md" fontWeight="bold" p={2} textAlign="center" bg="white">
              Menu Items
            </Text>
            <FlatList
              data={filteredMenuItems}
              renderItem={renderMenuItem}
              keyExtractor={(item) => item.menu_id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.menuItemsRow}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={() => (
                <Center py={10}>
                  <Text color="gray.500">No items found in this category</Text>
                </Center>
              )}
            />
          </Box>
        </HStack>
      )}
      
      {/* Floating cart button */}
      {renderFloatingCart()}
      
      {/* Portion selection modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => confirmAddToCart("full")}
                >
                  <Text style={styles.modalButtonText}>
                    Full Price: <Text style={styles.priceText}>₹{selectedItem?.full_price}</Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => confirmAddToCart("half")}
                >
                  <Text style={styles.modalButtonText}>
                    Half Price: <Text style={styles.priceText}>₹{selectedItem?.half_price}</Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Reserve Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reserveModalVisible}
        onRequestClose={() => setReserveModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setReserveModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { width: '90%' }]}>
                <HStack space={2} alignItems="center" mb={4}>
                  <MaterialIcons name="lock" size={24} color="#e74c3c" />
                  <Text style={styles.modalTitle}>This table is reserved</Text>
                </HStack>
                <Text style={styles.modalText}>
                  The table has been successfully reserved. You can un-reserve it at any time.
                </Text>
                <Pressable
                  onPress={() => {
                    setIsReserved(false);
                    setReserveModalVisible(false);
                    toast.show({
                      description: "Table has been un-reserved",
                      status: "info"
                    });
                  }}
                  bg="red.500"
                  px={4}
                  py={2}
                  rounded="md"
                  mt={4}
                  _pressed={{
                    bg: "red.600"
                  }}
                >
                  <Text color="white" fontWeight="medium">Un-reserve Table</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Render Table Switcher Modal */}
      {renderTableSwitcherModal()}

      {/* Floating un-reserve button */}
      {isReserved && orderType === "dine-in" && (
        <Pressable
          style={[styles.floatingCart, { bottom: 80 }]}
          onPress={async () => {
            try {
              const response = await fetchWithAuth(`${getBaseUrl()}/table_is_reserved`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  table_id: parseInt(tableData.table_id),
                  table_number: parseInt(tableData.table_number),
                  outlet_id: parseInt(tableData.outlet_id),
                  is_reserved: false
                }),
              });

              if (response.st === 1) {
                setIsReserved(false);
                toast.show({
                  description: "Table has been unreserved",
                  status: "success"
                });
                router.replace({
                  pathname: "/(tabs)/tables",
                  params: { 
                    refresh: Date.now().toString(),
                    status: "completed"
                  }
                });
              } else {
                toast.show({
                  description: response.msg || "Failed to unreserve table",
                  status: "error"
                });
              }
            } catch (error) {
              console.error("Error unreserving table:", error);
              toast.show({
                description: "Failed to unreserve table",
                status: "error"
              });
            }
          }}
        >
          <HStack alignItems="center">
            <MaterialIcons name="lock-open" size={24} color="#e74c3c" />
            <Text ml={2} fontSize="md" fontWeight="bold" color="#e74c3c">Un-reserve Table</Text>
          </HStack>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  categoryItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  activeCategoryItem: {
    backgroundColor: "#e6f7fa",
    borderLeftWidth: 4,
    borderLeftColor: "#0dcaf0",
  },
  menuItem: {
    flex: 1,
    margin: 5,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "48%",
    position: 'relative',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  menuImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  menuItemsRow: {
    justifyContent: 'space-between',
  },
  floatingCart: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  modalButton: {
    backgroundColor: "#0dcaf0",
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'medium',
  },
  cancelButton: {
    marginTop: 10,
  },
  cancelButtonText: {
    color: "red",
    fontSize: 16,
  },
  priceText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  disabledMenuItem: {
    opacity: 0.7,
  },
  disabledImage: {
    opacity: 0.5,
  },
  tableSwitcherContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tableSwitcherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tableSwitcherTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  noTablesText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#e1e1e1',
    width: '100%',
  },
  tableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tableItemText: {
    fontSize: 16,
    color: '#333',
  },
  refreshButton: {
    backgroundColor: "#0dcaf0",
    padding: 12,
    borderRadius: 5,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
});

const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}; 