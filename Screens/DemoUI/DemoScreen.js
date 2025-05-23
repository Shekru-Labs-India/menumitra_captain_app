import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native"; // Import useRoute
import CustomHeader from "../../components/CustomHeader"; // Import your header component
import { onGetProductionUrl } from "../utils/ConstantFunctions"; // Adjust the import based on your project structure
import { getRestaurantId, getUserId} from "../utils/getOwnerData"; // Adjust the import based on your project structure
import axiosInstance from "../../utils/axiosConfig"; // Import axiosInstance
import RemixIcon from 'react-native-remix-icon'; // Import RemixIcon
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSettings } from '../../utils/getSettings';

const DemoScreen = () => {
  const navigation = useNavigation(); // Initialize navigation
  const route = useRoute(); // Get the route object
  const { tableData, orderType = "dine-in" } = route.params || {}; // Access table data and order type from params
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [initialRender, setInitialRender] = useState(true);
  const [returnedCart, setReturnedCart] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [existingOrderDetails, setExistingOrderDetails] = useState(null);
  const insets = useSafeAreaInsets();
  const [showTableSwitcher, setShowTableSwitcher] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [settings, setSettings] = useState({
    reserve_table: true
  });

  // 1. First, add a constant for the maximum allowed quantity
  const MAX_ITEM_QUANTITY = 20;

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        try {
          console.log("Loading settings in DemoScreen");
          // Always get the latest settings from API
          const appSettings = await getSettings();
          console.log("Settings loaded in DemoScreen:", appSettings);
          setSettings(appSettings);
        } catch (error) {
          console.error("Error loading settings in DemoScreen:", error);
        }
      };
      
      loadSettings();
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Modified useFocusEffect to only clear cart when order is created
  useFocusEffect(
    React.useCallback(() => {
      // Skip on initial render
      if (initialRender) {
        setInitialRender(false);
        return;
      }

      // Only clear cart if order was successfully created
      if (orderCreated) {
        console.log("Clearing cart - Order was created");
        setCart([]);
        setOrderCreated(false);
      } else {
        console.log("Keeping cart - No order created");
        // Cart should be updated via updateCartOnReturn callback
      }
    }, [orderCreated, initialRender])
  );

  // Add this new useEffect to handle existingOrderDetails from navigation
  useEffect(() => {
    const handleExistingOrder = async () => {
      // Check if we have existingOrderDetails from navigation params
      const existingDetails = route.params?.existingOrderDetails;
      if (existingDetails && existingDetails.menu_details) {
        try {
          // Process menu items from existingOrderDetails
          const existingItems = existingDetails.menu_details.map((menu) => ({
            menu_id: menu.menu_id,
            name: menu.menu_name || menu.name,
            full_price: parseFloat(menu.price || 0),
            price: parseFloat(menu.price || 0),
            quantity: parseInt(menu.quantity || 0),
            originalQuantity: parseInt(menu.quantity || 0), // Store original quantity for comparison
            offer: parseFloat(menu.offer || 0),
            total_price: parseFloat(menu.menu_sub_total || 0),
            specialInstructions: menu.comment || "",
            portion: menu.half_or_full || "full",
            isExistingItem: true,
            category_id: menu.menu_cat_id,
            category_name: menu.category_name,
            food_type: menu.menu_food_type,
          }));

          // Set the cart with existing items
          setCart(existingItems);
          
          // Store order details
          setExistingOrderDetails(existingDetails);
        } catch (error) {
          console.error("Error processing existing order details:", error);
        }
      }
    };

    handleExistingOrder();
  }, [route.params?.existingOrderDetails]);

  // Keep the existing useEffect for fetching order details from API
  useEffect(() => {
    const fetchExistingOrderItems = async () => {
      if (tableData?.is_occupied && tableData?.order_id) {
        try {
          setLoading(true);
          const [restaurantId, accessToken] = await Promise.all([
            getRestaurantId(),
            AsyncStorage.getItem("access_token"),
          ]);
          
          // Ensure outlet_id is a string and not undefined/null
          const outletId = restaurantId ? restaurantId.toString() : "";
          
          if (!outletId) {
            console.error("No outlet ID available");
            Alert.alert("Error", "Restaurant ID not found");
            return;
          }

          const orderResponse = await axiosInstance.post(
            onGetProductionUrl() + "order_view",
            {
              order_number: tableData.order_number.toString(),
              outlet_id: outletId,
              order_id: tableData.order_id.toString(),
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (orderResponse.data.st === 1 && orderResponse.data.lists) {
            const { order_details, menu_details } = orderResponse.data.lists;
            
            if (order_details) {
              setExistingOrderDetails(order_details);
            }
            
            if (menu_details && menu_details.length > 0) {
              const existingItems = menu_details.map((menu) => ({
                menu_id: menu.menu_id,
                name: menu.menu_name || menu.name,
                full_price: parseFloat(menu.price || 0),
                half_price: parseFloat(menu.price / 2 || 0),
                price: parseFloat(menu.price || 0),
                quantity: parseInt(menu.quantity || 0),
                originalQuantity: parseInt(menu.quantity || 0),
                offer: parseFloat(menu.offer || 0),
                total_price: parseFloat(menu.menu_sub_total || 0),
                specialInstructions: menu.comment || "",
                portion: menu.half_or_full || "full",
                isExistingItem: true,
              }));
              setCart(existingItems);
            }
          } else {
            console.error("Invalid response from order_view:", orderResponse.data);
            Alert.alert("Error", orderResponse.data.msg || "Failed to load order details");
          }
        } catch (error) {
          console.error("Error fetching existing order items:", error);
          Alert.alert("Error", "Failed to load existing order items");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchExistingOrderItems();
  }, [tableData]);

  // Update DemoScreen to initialize cart from passed items and handle cart updates
  // First, update the useEffect to handle current cart passed from OrderCreate
  useEffect(() => {
    // Check if we received a cart from OrderCreate
    if (route.params?.currentCart && route.params.currentCart.length > 0) {
      console.log("Received cart from OrderCreate:", route.params.currentCart.length);
      // Initialize cart with items from OrderCreate
      setCart(route.params.currentCart);
    }
  }, [route.params?.currentCart]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_all_menu_list_by_category",
        {
          outlet_id: restaurantId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        console.log("All data fetch response:", response.data);
        
        // Process categories
        const categoriesData = response.data.data.category || [];
        // Add "All" category at the beginning
        const allCategories = [
          {
            menu_cat_id: 0,
            category_name: "ALL",
            menu_count: response.data.data.menus?.length || 0,
          },
          ...categoriesData,
        ];
        
        setCategories(allCategories);
        setSelectedCategory("ALL");
        
        // Process menu items - simply use price from API
        const menusData = response.data.data.menus || [];
        const formattedMenuItems = menusData.map(item => ({
          menu_id: item.menu_id,
          name: item.menu_name,
          price: parseFloat(item.price) || 0,
          full_price: parseFloat(item.price) || 0, // Set full_price to price for OrderCreate
          image: item.image,
          rating: item.rating,
          category_id: item.menu_cat_id,
          category_name: item.category_name,
          offer: item.offer,
          is_special: item.is_special,
          food_type: item.menu_food_type,
          quantity: 1,
          total_price: parseFloat(item.price) || 0,
        }));
        
        setMenuItems(formattedMenuItems);
        setFilteredMenuItems(formattedMenuItems);
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
      Alert.alert("Error", "Failed to load menu data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
  
  const filterByCategory = (category) => {
    setSelectedCategory(category);
    
    // If there's an active search, keep showing search results across all categories
    if (searchQuery.trim() !== "") {
      const searchResults = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMenuItems(searchResults);
      return;
    }
  
    // Otherwise filter by the selected category
    if (category === "ALL") {
      setFilteredMenuItems(menuItems);
    } else {
      const filtered = menuItems.filter(
        (item) => item.category_name.toLowerCase().trim() === category.toLowerCase().trim()
      );
      setFilteredMenuItems(filtered);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Refresh settings
      const appSettings = await getSettings();
      setSettings(appSettings);
      console.log("Settings refreshed on pull-to-refresh in DemoScreen");
      
      // Then refresh other data
      await fetchAllData();
    } catch (error) {
      console.error("Error during refresh in DemoScreen:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllData]);

  // 2. Update the addToCart function to check against the maximum quantity
  const addToCart = (item) => {
    const existingItemIndex = cart.findIndex(
      (cartItem) => cartItem.menu_id === item.menu_id
    );

    if (existingItemIndex !== -1) {
      // Check if adding one more would exceed the limit
      const currentQuantity = cart[existingItemIndex].quantity;
      if (currentQuantity >= MAX_ITEM_QUANTITY) {
        Alert.alert("Maximum Limit", `You can only add up to ${MAX_ITEM_QUANTITY} of any item.`);
        return;
      }
      
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
      // Add new item with offer information preserved
      const newItem = {
        ...item,
        quantity: 1,
        total_price: item.price || 0,
        offer: item.offer || 0, // Ensure offer percentage is preserved
        isNewItem: true, // Mark as new item
      };
      setCart((prev) => [...prev, newItem]);
    }
  };

  // 3. Update the incrementCartItem function to check against the maximum quantity
  const incrementCartItem = (menuId) => {
    const updatedCart = cart.map((item) => {
      if (item.menu_id === menuId) {
        // Check if adding one more would exceed the limit
        if (item.quantity >= MAX_ITEM_QUANTITY) {
          // Don't show alert here since we'll disable the button instead
          return item;
        }
        
        return {
          ...item,
          quantity: item.quantity + 1,
          total_price: (item.price || 0) * (item.quantity + 1),
        };
      }
      return item;
    });
    setCart(updatedCart);
  };

  // Update the navigateToOrderCreate function to ensure offers are passed
  const navigateToOrderCreate = () => {
    const updatedCart = cart.map(item => {
      // For new items
      if (!item.isExistingItem) {
        return {
          ...item,
          offer: item.offer || 0,
          isNewItem: true
        };
      }
      
      // For existing items, check if quantity has changed
      const originalQty = parseInt(item.originalQuantity) || 0;
      const currentQty = parseInt(item.quantity) || 0;
      
      if (currentQty > originalQty) {
        return {
          ...item,
          quantityChanged: true,
          originalQuantity: originalQty
        };
      }
      
      return item;
    });
    
    console.log("Navigating to OrderCreate with cart:", updatedCart.length);
    
    navigation.navigate("OrderCreate", {
      tableData,
      cartItems: updatedCart,
      orderType,
      onOrderCreated: () => {
        console.log("Order created callback triggered");
        setOrderCreated(true);
      },
      updateCartOnReturn: (cartFromOrderCreate) => {
        console.log("updateCartOnReturn called with cart:", cartFromOrderCreate?.length);
        if (cartFromOrderCreate) {
          setReturnedCart([...cartFromOrderCreate]);
        }
      }
    });
  };

  // Add an extra useEffect to verify the cart updates
  useEffect(() => {
    console.log("Cart updated in DemoScreen, items:", cart.length);
  }, [cart]);

  // Create a separate effect to process returned cart separately from the focus effect
  useEffect(() => {
    if (returnedCart) {
      console.log("Processing returned cart:", returnedCart.length);
      setCart(returnedCart);
      setReturnedCart(null); // Clear it after use
    }
  }, [returnedCart]);

  // Update the header to show "Back to Order" when coming from OrderCreate
  React.useLayoutEffect(() => {
    const headerTitle = route.params?.currentCart 
      ? "Add More Items" 
      : `${toTitleCase(orderType)} Order`;

    const showBackButton = !!route.params?.currentCart;

    navigation.setOptions({
      headerTitle: headerTitle,
      headerLeft: showBackButton 
        ? () => (
            <TouchableOpacity 
              style={{ marginLeft: 15 }}
              onPress={() => {
                // Always make a copy of the cart to avoid reference issues
                if (route.params?.onCartUpdated) {
                  console.log("onCartUpdated with cart:", cart.length);
                  route.params.onCartUpdated([...cart]);
                }
                navigation.goBack();
              }}
            >
              <RemixIcon name="arrow-left-line" size={24} color="#000" />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, cart, route.params]);

  // Update the header title layout to keep it centered
  const getHeaderTitle = () => {
    if (orderType === "dine-in" && tableData) {
      // Only show switch button for occupied tables with orders
      const showSwitchButton = tableData.is_occupied === 1 && tableData.order_id;
      
      return (
        <View style={styles.headerTitleContainer}>
          {/* Centered title container - no left spacer needed */}
          <View style={styles.titleWrapper}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Table {tableData.table_number} - {tableData.section_name || "Section"}
            </Text>
          </View>
          
          {/* Switch button or Reserve button positioned on the right */}
            {showSwitchButton ? (
              <TouchableOpacity 
                style={styles.tableSwitchButton}
                onPress={fetchAvailableTables}
            >
              <RemixIcon name="arrow-left-right-line" size={16} color="#0dcaf0" />
              <Text style={styles.tableSwitchText}>Switch</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    return `Create Order - ${toTitleCase(orderType)}`;
  };

  // Update calculateCategoryBadgeCounts to handle existing order items
  const calculateCategoryBadgeCounts = (cart, categories) => {
    const counts = {};
    
    // Initialize all categories with 0 count
    categories.forEach(category => {
      counts[category.category_name] = 0;
    });
    
    // Use a Set to track unique menu IDs per category
    const categoryMenuIds = {};
    categories.forEach(category => {
      categoryMenuIds[category.category_name] = new Set();
    });
    
    // Count unique items in cart by category
    cart.forEach(item => {
      // Handle existing items differently since they may not have category_name
      if (item.isExistingItem) {
        // For existing items, find the matching menu item to get its category
        const menuItem = menuItems.find(menu => menu.menu_id === item.menu_id);
        if (menuItem && menuItem.category_name) {
          // Add menu_id to the Set for this category
          categoryMenuIds[menuItem.category_name].add(item.menu_id);
        }
      } else {
        // For regular items, use the existing logic
        const categoryName = item.category_name;
        if (counts[categoryName] !== undefined) {
          // Add menu_id to the Set for this category
          categoryMenuIds[categoryName].add(item.menu_id);
        }
      }
    });
    
    // Convert Sets to counts
    Object.keys(categoryMenuIds).forEach(categoryName => {
      counts[categoryName] = categoryMenuIds[categoryName].size;
    });
    
    // Calculate total for ALL category (sum of all unique items)
    counts["ALL"] = cart.length > 0 ? 
      new Set(cart.map(item => item.menu_id)).size : 0;
    
    return counts;
  };

  const categoryBadgeCounts = useMemo(() => {
    return calculateCategoryBadgeCounts(cart, categories);
  }, [cart, categories, menuItems]);

  const renderCategoryItem = ({ item }) => {
    const badgeCount = categoryBadgeCounts[item.category_name] || 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item.category_name && styles.activeCategoryItem,
        ]}
        onPress={() => {
          filterByCategory(item.category_name);
        }}
      >
        <View style={styles.categoryContent}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.categoryImage}
            />
          ) : (
            <View style={[styles.categoryImage, styles.defaultCategoryImageContainer]}>
              <RemixIcon 
                name="ri-restaurant-fill"
                size={24}
                color="#999" 
              />
            </View>
          )}
          <Text style={styles.categoryName}>{item.category_name}</Text>
          
          {badgeCount > 0 && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{badgeCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Update the food type color function to correctly handle the API's food_type values
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

  // 4. Update the renderMenuItem function to disable items that have reached max quantity
  const renderMenuItem = ({ item }) => {
    // Determine if this item is already in the cart
    const cartItem = cart.find(cartItem => cartItem.menu_id === item.menu_id);
    const isInCart = !!cartItem;
    const isTableReserved = tableData?.is_reserved === true;
    
    // Get quantity if item is in cart
    const quantity = cartItem ? cartItem.quantity : 0;
    
    // Check if item has reached maximum quantity
    const hasReachedMaxQuantity = quantity >= MAX_ITEM_QUANTITY;
    
    // Get food type color
    const foodTypeColor = getFoodTypeColor(item.food_type);

    return (
      <TouchableOpacity 
        style={[
          styles.menuItem, 
          isTableReserved && styles.disabledMenuItem,
          hasReachedMaxQuantity && styles.maxQuantityMenuItem
        ]}
        onPress={() => {
          // Disable adding items when table is reserved or max quantity reached
          if (isTableReserved) {
            Alert.alert("Reserved Table", "This table is currently reserved. Please unreserve it first to place an order.");
            return;
          }
          
          if (hasReachedMaxQuantity) {
            Alert.alert("Maximum Limit", `You can only add up to ${MAX_ITEM_QUANTITY} of any item.`);
            return;
          }
          
          // If item is already in cart, increase quantity
          if (cartItem) {
            incrementCartItem(cartItem.menu_id);
          } else {
            addToCart(item);
          }
        }}
        disabled={isTableReserved || hasReachedMaxQuantity}
      >
        {/* Food type indicator at the bottom of the card */}
        <View style={[styles.foodTypeIndicator, { backgroundColor: foodTypeColor }]} />
        
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.menuImage}
            onError={() => console.log('Image failed to load:', item.image)}
          />
        ) : (
          <View style={[styles.menuImage, styles.defaultImageContainer]}>
            <RemixIcon 
              name="ri-restaurant-fill"
              size={40}
              color="#999" 
            />
          </View>
        )}
        
        {/* Quantity badge - moved to top right corner with hollow style */}
          {isInCart && (
          <View style={styles.hollowQuantityBadge}>
            <Text style={styles.hollowQuantityBadgeText}>{quantity}</Text>
            </View>
          )}
          
          {hasReachedMaxQuantity && (
            <View style={styles.maxQuantityIndicator}>
              <Text style={styles.maxQuantityText}>Max</Text>
            </View>
          )}
        
        <Text numberOfLines={2} style={styles.menuName}>
          {item.name}
          </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.menuPrice}>
            ₹{item.price}
          </Text>
        </View>
        
        {/* Existing item indicator */}
        {cartItem?.isExistingItem && (
          <View style={styles.existingItemContainer}>
            <Text style={styles.existingItemText}>
              Existing
            </Text>
          </View>
        )}

        {/* Add this code to display the discount badge */}
        {item.offer && parseInt(item.offer) > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.offer}% OFF</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Add helper function to increment cart item quantity
  

  // Add a clearSearch function
  const clearSearch = () => {
    setSearchQuery('');
    if (selectedCategory === "ALL") {
      setFilteredMenuItems(menuItems);
    } else {
      const categoryFiltered = menuItems.filter(item => 
        item.category_name.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
      );
      setFilteredMenuItems(categoryFiltered);
    }
  };

  const renderCartImage = (item, index) => {
    if (item.image && item.image.trim() !== '') {
      return (
        <Image
          source={{ uri: item.image }}
          style={styles.cartImage}
          onError={() => console.log('Image failed to load:', item.image)}
        />
      );
    }
    return (
      <View style={[styles.cartImage, styles.defaultImageContainer]}>
        <RemixIcon 
          name="ri-restaurant-fill" // Changed to a more reliable icon name
          size={24} 
          color="#999" 
        />
      </View>
    );
  };

  const renderFloatingCart = () => {
    if (cart.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.floatingCart}
        onPress={() => {
          navigation.navigate("OrderCreate", {
            tableData,
            cartItems: cart,
            orderType,
           
            existingOrderDetails: existingOrderDetails,
          });
        }}
      >
        <RemixIcon name="printer-line" size={24} color="#0dcaf0" />
        <Text style={styles.cartCount}>{cart.length}</Text>
        <Text style={styles.viewCartText}>
          {existingOrderDetails ? "Update Order" : "Create Order"}
        </Text>
      </TouchableOpacity>
    );
  };

  // Add this useEffect to handle cart updates from OrderCreate
  useEffect(() => {
    // Check if we received an updated cart from OrderCreate
    if (route.params?.updatedCart && route.params.updatedCart.length > 0) {
      console.log("Received updatedCart from OrderCreate:", route.params.updatedCart.length);
      // Create a new copy of the cart array to ensure state update
      setCart([...route.params.updatedCart]);
      
      // Clear the updatedCart param to avoid applying it multiple times
      // This needs to happen after we've used the data
      navigation.setParams({ updatedCart: undefined, timestamp: undefined });
    }
  }, [route.params?.timestamp]); // Using timestamp as dependency ensures this runs on each back navigation

  // Update the handleUnreserveTable function to stay on the same screen
 

  // Add insets for safe area
  
  
  // Add table reservation handler function
  
  

 

  // Add this function to fetch available tables
  const fetchAvailableTables = async () => {
    if (!tableData || !tableData.section_id) return;
    
    try {
      setLoadingTables(true);
      const [userId, restaurantId, accessToken] = await Promise.all([
        getUserId(),
        getRestaurantId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_available_tables",
        {
          user_id: userId,
          outlet_id: restaurantId,
          section_id: tableData.section_id
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data.st === 1) {
        setAvailableTables(response.data.tables);
        setShowTableSwitcher(true);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to fetch available tables");
      }
    } catch (error) {
      console.error("Error fetching available tables:", error);
      Alert.alert("Error", "Failed to fetch available tables. Please try again.");
    } finally {
      setLoadingTables(false);
    }
  };

  // Update the switchTable function to remove the setTableData call
  const switchTable = async (newTableId, newTableNumber) => {
    try {
      // First, close the modal immediately
      setShowTableSwitcher(false);
      
      // Then show loading
      setLoadingTables(true);
      
      const [userId, restaurantId, accessToken] = await Promise.all([
        getUserId(),
        getRestaurantId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_table",
        {
          table_number: tableData.table_number.toString(),
          new_table_number: newTableNumber.toString(),
          section_id: tableData.section_id,
          outlet_id: restaurantId,
          order_id: tableData.order_id,
          user_id: userId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data.st === 1) {
        // Show success message
        Alert.alert(
          "Success", 
          response.data.msg || `Table switched from ${tableData.table_number} to ${newTableNumber}`,
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate back to table screen to refresh
                navigation.navigate("RestaurantTables");
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", response.data.msg || "Failed to switch table");
      }
    } catch (error) {
      console.error("Error switching table:", error);
      Alert.alert("Error", "Failed to switch table. Please try again.");
    } finally {
      setLoadingTables(false);
    }
  };

  // Add a table switcher modal
  const renderTableSwitcherModal = () => {
    return (
      <Modal
        visible={showTableSwitcher}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTableSwitcher(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTableSwitcher(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.tableSwitcherContainer}>
                <View style={styles.tableSwitcherHeader}>
                  <Text style={styles.tableSwitcherTitle}>Available Tables</Text>
                  <TouchableOpacity onPress={() => setShowTableSwitcher(false)}>
                    <RemixIcon name="close-line" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                {loadingTables ? (
                  <ActivityIndicator size="large" color="#0dcaf0" style={styles.loader} />
                ) : availableTables.length === 0 ? (
                  <Text style={styles.noTablesText}>No available tables in this section</Text>
                ) : (
                  <FlatList
                    data={availableTables}
                    keyExtractor={(item) => item.table_id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.tableItem}
                        onPress={() => switchTable(item.table_id, item.table_number)}
                      >
                        <Text style={styles.tableItemText}>Table {item.table_number}</Text>
                        <RemixIcon name="arrow-right-line" size={20} color="#0dcaf0" />
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // Update order type handling
  const handleOrderTypeSelect = (type) => {
    if (!settings) return;

    switch (type) {
      case 'parcel':
        if (!settings.has_parcel) {
          Alert.alert('Feature Disabled', 'Parcel orders are currently disabled');
          return;
        }
        break;
      case 'counter':
        if (!settings.has_counter) {
          Alert.alert('Feature Disabled', 'Counter orders are currently disabled');
          return;
        }
        break;
      case 'drive-through':
        if (!settings.has_drive_through) {
          Alert.alert('Feature Disabled', 'Drive-through orders are currently disabled');
          return;
        }
        break;
    }

    // Continue with order type selection if enabled
    navigation.navigate('OrderCreate', {
      orderType: type,
      // ... other navigation params
    });
  };

  // Improve the useFocusEffect to ensure it handles empty carts properly
  useFocusEffect(
    React.useCallback(() => {
      // Check if we're returning from OrderCreate with cart data
      if (route.params?.returnedCart !== undefined) {
        const returnedCart = route.params.returnedCart || [];
        console.log("Received cart from OrderCreate:", returnedCart.length, "items");
        
        // Set the cart state directly from the returned cart
        setCart(returnedCart);
        
        // Clear the parameter to avoid applying it multiple times
        navigation.setParams({ returnedCart: undefined });
      }
    }, [route.params?.returnedCart, navigation])
  );

  // Modify this useEffect to log cart changes for debugging
  useEffect(() => {
    console.log("Cart in DemoScreen updated:", cart.length, "items");
  }, [cart]);

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title={getHeaderTitle()} />
      
      {/* Reserve button in top right corner */}
     
      
      {/* Show "Reserved" status at the top when table is reserved */}
      {tableData?.is_reserved && (
        <View style={styles.reservedBanner}>
          <RemixIcon name="lock-line" size={18} color="#ffffff" />
          <Text style={styles.reservedBannerText}>
            This table is currently reserved
          </Text>
        </View>
      )}
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={clearSearch} style={styles.closeButton}>
            <RemixIcon name="close-line" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0dcaf0" />
      ) : (
        <View style={styles.content}>
          <View style={styles.categoriesContainer}>
            <Text style={styles.sectionTitle}>Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.menu_cat_id.toString()}
              renderItem={renderCategoryItem}
              showsVerticalScrollIndicator={false}
              style={styles.categoryList}
            />
          </View>
          <View style={styles.menusContainer}>
            <Text style={styles.sectionTitle}>Menus</Text>
            <FlatList
              data={filteredMenuItems}
              renderItem={renderMenuItem}
              keyExtractor={(item) => item.menu_id.toString()}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No items found in this category</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.actionButtons}>
            {/* Only show Create Order button if table is not reserved */}
            {!tableData?.is_reserved && (
              <TouchableOpacity
                style={[styles.actionButton, styles.createOrderButton]}
                onPress={() => navigateToOrderCreate()}
              >
                <Text style={styles.actionButtonText}>Create Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Only show the cart button if table is NOT reserved */}
      {!tableData?.is_reserved && renderFloatingCart()}
      
      {/* Show the unreserve button if table IS reserved */}
      
      
      {/* Modal for selecting price type */}
    
      
      {renderTableSwitcherModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  content: {
    flexDirection: "row",
    flex: 1,
  },
  categoriesContainer: {
    width: "25%",
    borderRightWidth: 1,
    borderColor: "#ccc",
    paddingRight: 10,
  
  },
  categoryItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  activeCategoryItem: {
    backgroundColor: "#0dcaf0", // Active background color
  },
  categoryContent: {
    alignItems: "center", // Center items vertically
  },
  categoryImage: {
    width: 50,
    height: 50,
    borderRadius: 25, // Round image
    marginBottom: 5,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ccc", // Placeholder color
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000", // Default text color
    textAlign: "center", // Center the text
  },
  menusContainer: {
    width: "75%",
    paddingLeft: 10,
   
  },
  menuItem: {
    flex: 1,
    margin: 5,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "48%",
    position: 'relative',
    overflow: 'hidden', // To contain the food type indicator
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
    height: 120,
    borderRadius: 8,
    marginBottom: 5,
  },
  menuName: {
    fontSize: 13,
    marginBottom: 5,
    paddingHorizontal: 2,
    flexWrap: 'wrap',
    width: '100%',
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 5,
  },
  menuPrice: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0dcaf0",
  },
  addButton: {
    marginTop: 10,
    backgroundColor: "#0dcaf0",
    borderRadius: 5,
    padding: 5,
    alignItems: "center",
    width: "100%",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  floatingCart: {
    position: "absolute",
    bottom: 20,
    left: "45%",
    transform: [{ translateX: -50 }],
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 10,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cartCount: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#0dcaf0",
  },
  viewCartText: {
    fontWeight: "bold",
    color: "#0dcaf0",
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#0dcaf0",
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
    width: "90%",
    alignItems: "center", // Center align the button content
    justifyContent: "center", // Center the text vertically
},
modalButtonText: {
  color: '#fff',
  textAlign: 'center', // Center the text
  fontSize: 16,
  width: '100%', // Ensure it takes full width
},
  cancelButton: {
    marginTop: 10,
  },
  cancelButtonText: {
    color: "red",
    fontSize: 16,
  },
  offerText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
    paddingVertical: 8,
  },
  closeButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#000",
    fontSize: 16,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0dcaf0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  priceText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  defaultImageContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  defaultCategoryImageContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 10,
    backgroundColor: '#fff',
    textAlign: 'center', // Center the text
  },
  categoryList: {
    marginTop: 5,
  },
  existingItemBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(33, 158, 188, 0.8)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingItemText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4B4B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  differentCategoryItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#0dcaf0',
  },
  categoryLabel: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  menuContent: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: 'space-between',
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#0dcaf0',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  quantityBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  foodTypeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  reservedTableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    margin: 16,
    borderWidth: 1,
    borderColor: '#757575',
    borderStyle: 'dashed'
  },
  reservedTableText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 20,
    textAlign: 'center'
  },
  unreserveButton: {
    backgroundColor: '#757575',
    padding: 12,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center'
  },
  unreserveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  actionButtons: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#0dcaf0',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  createOrderButton: {
    backgroundColor: '#4CAF50',
  },
  reservedBanner: {
    backgroundColor: '#757575',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 8,
  },
  reservedBannerText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  floatingUnreserveButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#757575',
    borderRadius: 30,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  unreserveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledMenuItem: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  reserveButton: {
    position: 'absolute',
    right: 10,
    zIndex: 1000,
    backgroundColor: '#198754', // Green color
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4, // Smaller vertical padding
    paddingHorizontal: 10, // Smaller horizontal padding 
    borderRadius: 16, // Slightly smaller radius
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    marginTop: 6,
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reserveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    
    fontSize: 12, // Smaller font size
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // This will push items to edges
    width: '100%',
    paddingHorizontal: 16, // Add consistent padding
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 16, // Add some space between title and button
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  tableSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0dcaf0',
    position: 'absolute',
    right: -50, // Position at the rightmost edge
    
  },
  tableSwitchText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#0dcaf0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableSwitcherContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    elevation: 5,
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
  loader: {
    padding: 20,
  },
  noTablesText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
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
  maxQuantityMenuItem: {
    opacity: 0.7,
    borderColor: '#999',
  },
  maxQuantityIndicator: {
    backgroundColor: '#f39c12', // Orange-yellow warning color
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  maxQuantityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hollowQuantityBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#333',
    backgroundColor: 'grey',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  hollowQuantityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    left: 0, // Changed from 'right: 0' to position on left
    top: 10, // Keep some space from the top
    backgroundColor: '#ff3b30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 8, // Changed from borderTopLeftRadius
    borderBottomRightRadius: 8, // Changed from borderBottomLeftRadius
    zIndex: 1,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default DemoScreen;