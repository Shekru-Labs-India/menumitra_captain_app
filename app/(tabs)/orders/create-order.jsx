import React, { useState, useEffect } from "react";
import { TouchableWithoutFeedback, Keyboard, BackHandler } from "react-native";
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  useToast,
  ScrollView,
  Heading,
  FormControl,
  Badge,
  Divider,
  Spinner,
  Select,
  Pressable,
  Image,
  Modal,
  KeyboardAvoidingView,
  Center,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { sendNotificationToWaiter } from "../../../services/NotificationService";

const API_BASE_URL = "https://men4u.xyz/captain_api";

const getCurrentDate = () => {
  const date = new Date();
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, " ");
};

const formatTime = (dateTimeStr) => {
  if (!dateTimeStr) return "";

  try {
    // Split the datetime string to get date, time and meridiem
    const parts = dateTimeStr.split(" ");
    if (parts.length < 3) return dateTimeStr;

    // Get date, time part and meridiem
    const date = parts[0]; // "18-Dec-2024"
    const time = parts[1]; // "03:51:28"
    const meridiem = parts[2]; // "PM"

    // Split time to get hours and minutes
    const timeParts = time.split(":");
    if (timeParts.length < 2) return dateTimeStr;

    // Return formatted date and time
    return `${date} ${timeParts[0]}:${timeParts[1]} ${meridiem}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateTimeStr; // Return original string if formatting fails
  }
};

export default function CreateOrderScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();
  const {
    tableId,

    orderNumber,
    orderType: existingOrderType,
    existingItems,
  } = params;

  const [loading, setLoading] = useState(false);
  const [outletId, setOutletId] = useState(null);
  const [orderType, setOrderType] = useState("Dine In");
  const [orderItems, setOrderItems] = useState([
    {
      id: 1,
      menuItem: "",
      quantity: 1,
      specialInstructions: "",
      portionSize: "Full",
    },
  ]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [serviceCharges, setServiceCharges] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [orderDetails, setOrderDetails] = useState({
    order_number: "",
    table_number: "",
    total_bill: 0,
    datetime: "",
    order_type: "",
  });
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const isFocused = useIsFocused();
  const [tableNumber, setTableNumber] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [isOccupied, setIsOccupied] = useState("0");
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const initializeOrder = async () => {
      try {
        const {
          tableId,
          tableNumber: routeTableNumber,
          sectionId: routeSectionId,
          sectionName,
          isOccupied,
          orderId: routeOrderId,
          orderNumber,
          orderDetails,
        } = params;

        console.log("Raw params:", params);

        // Set basic details
        if (routeTableNumber) {
          setTableNumber(routeTableNumber);
        } else if (tableId) {
          setTableNumber(tableId);
        }

        setSectionId(routeSectionId || "");
        setSectionName(sectionName || "");
        setIsOccupied(isOccupied || "0");

        if (routeOrderId) {
          setOrderId(routeOrderId);
        }

        // Parse orderDetails if it's a string
        let parsedOrderDetails;
        if (orderDetails && typeof orderDetails === "string") {
          parsedOrderDetails = JSON.parse(orderDetails);
          console.log("Parsed Order Details:", parsedOrderDetails);
        }

        // Set order details
        setOrderDetails({
          order_number: orderNumber,
          table_number: routeTableNumber,
          total_bill: parsedOrderDetails?.grand_total || 0,
          datetime: new Date().toLocaleString(),
          order_type: "dine-in",
        });

        // Format menu items from parsed order details
        if (
          parsedOrderDetails?.menu_items &&
          Array.isArray(parsedOrderDetails.menu_items)
        ) {
          const formattedItems = parsedOrderDetails.menu_items.map((item) => ({
            menu_id: item.menu_id.toString(),
            menu_name: item.name,
            price: parseFloat(item.price || 0),
            quantity: parseInt(item.quantity || 1),
            portionSize: "Full",
            specialInstructions: "",
            menu_sub_total: parseFloat(item.total_price || 0),
          }));

          console.log("Formatted Menu Items:", formattedItems);
          setSelectedItems(formattedItems);
        }

        // Debug log
        console.log("Order Initialization Complete:", {
          tableNumber: routeTableNumber,
          sectionId: routeSectionId,
          isOccupied,
          orderId: routeOrderId,
          orderNumber,
          menuItems: parsedOrderDetails?.menu_items || [],
          grandTotal: parsedOrderDetails?.grand_total,
        });
      } catch (error) {
        console.error("Error initializing order:", error);
        toast.show({
          description: "Error initializing order",
          status: "error",
        });
      }
    };

    initializeOrder();
  }, []);

  useEffect(() => {
    const getStoredData = async () => {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      setOutletId(storedOutletId);
    };
    getStoredData();
  }, []);

  useEffect(() => {
    if (outletId) {
      fetchMenuItems();
    }
  }, [outletId]);

  const fetchMenuItems = async () => {
    if (!outletId) return;

    setLoading(true);
    try {
      const response = await fetch(
        "https://men4u.xyz/captain_api/get_all_menu_list_by_category",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId.toString(),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        setMenuCategories(data.data.category);
        setMenuItems(data.data.menus);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.show({
        description: "Failed to load menu items",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderStatus) => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem("user_id");
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      if (!storedUserId || !storedOutletId || !tableNumber || !sectionId) {
        throw new Error("Missing required information");
      }

      // Format order items exactly like waiter app
      const orderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: item.quantity,
        comment: item.specialInstructions || "",
        half_or_full: (item.portionSize || "full").toLowerCase(),
      }));

      // Match waiter app request format exactly
      const orderData = {
        user_id: storedUserId.toString(),
        outlet_id: storedOutletId.toString(),
        tables: [tableNumber.toString()],
        section_id: sectionId.toString(),
        order_type: "dine-in",
        order_items: orderItems,
      };

      // Check if table is occupied and has an existing order
      if (params?.isOccupied === "1") {
        if (!orderId) {
          throw new Error("Order ID is required for occupied tables");
        }
        orderData.order_id = orderId.toString();

        // Use update endpoint for occupied tables
        console.log("Updating existing order:", orderData);
        const response = await fetch(`${API_BASE_URL}/update_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        });

        const result = await response.json();
        console.log("Update Order Response:", result);

        if (result.st === 1) {
          toast.show({
            description: "Order updated successfully",
            status: "success",
            duration: 2000,
          });
          router.replace("/(tabs)/orders");
        } else {
          throw new Error(result.msg || "Failed to update order");
        }
      } else {
        // Create new order for unoccupied tables
        console.log("Creating new order:", orderData);
        const response = await fetch(`${API_BASE_URL}/create_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        });

        const result = await response.json();
        console.log("Create Order Response:", result);

        if (result.st === 1) {
          toast.show({
            description: `Order ${result.order_id || ""} created successfully`,
            status: "success",
            duration: 2000,
          });
          router.replace("/(tabs)/orders");
        } else {
          throw new Error(result.msg || "Failed to create order");
        }
      }
    } catch (error) {
      console.error(`${orderStatus.toUpperCase()} Error:`, error);
      toast.show({
        description: error.message || "Failed to process order",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHold = () => createOrder("hold");
  const handleKOT = () => createOrder("kot");

  const handleSettle = async () => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setLoadingMessage("Processing order...");

      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (!storedOutletId) {
        throw new Error("Outlet ID not found");
      }

      // First update the order
      if (orderId) {
        const updatePayload = {
          order_id: parseInt(orderId),
          customer_id: "367",
          outlet_id: storedOutletId,
          table_number: parseInt(tableNumber),
          section_id: parseInt(sectionId),
          order_type: orderType || "Dine-in",
          order_items: selectedItems.map((item) => ({
            menu_id: item.menu_id.toString(),
            quantity: parseInt(item.quantity),
            comment: "",
            half_or_full: (item.portionSize || "Full").toLowerCase(),
          })),
        };

        console.log("Update Order Payload:", updatePayload);

        const updateResponse = await fetch(`${API_BASE_URL}/update_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        });

        const updateData = await updateResponse.json();
        console.log("Update Order Response:", updateData);

        if (updateData.st !== 1) {
          throw new Error(updateData.msg || "Failed to update order");
        }
      }

      // Then update the order status
      setLoadingMessage("Completing order...");

      const statusPayload = {
        outlet_id: storedOutletId,
        order_id: parseInt(orderId),
        order_status: "completed",
        table_number: parseInt(tableNumber),
        section_id: parseInt(sectionId),
      };

      console.log("Status Update Payload:", statusPayload);

      const statusResponse = await fetch(
        `${API_BASE_URL}/captain_manage/update_order_status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(statusPayload),
        }
      );

      const statusText = await statusResponse.text();
      console.log("Raw Status Response:", statusText);

      let statusData;
      try {
        statusData = JSON.parse(statusText);
      } catch (e) {
        console.error("Failed to parse status response:", e);
        throw new Error("Invalid response from server");
      }

      console.log("Parsed Status Response:", statusData);

      if (statusData.st === 1) {
        // Clear all states
        setSelectedItems([]);
        setSearchQuery("");
        setOrderDetails({});
        setServiceCharges(0);
        setGstAmount(0);
        setDiscountAmount(0);

        toast.show({
          description: "Order completed successfully",
          status: "success",
          duration: 2000,
        });

        // Navigate with refresh params
        router.replace({
          pathname: "/(tabs)/orders",
          params: {
            refresh: Date.now().toString(),
            status: "completed",
            fromSettle: true,
          },
        });
      } else {
        throw new Error(statusData.msg || "Failed to complete order");
      }
    } catch (error) {
      console.error("Settle Error:", error);

      let errorMessage = "Failed to settle order";
      if (error.message.includes("Failed to parse")) {
        errorMessage = "Server returned invalid response. Please try again.";
      } else if (error.message.includes("HTTP error")) {
        errorMessage = "Server error. Please try again later.";
      } else {
        errorMessage = error.message;
      }

      toast.show({
        description: errorMessage,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setIsSearchOpen(false);
        setSearchResults([]);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const memoizedGetSearchResults = React.useCallback(
    (query) => {
      if (!query || !menuItems) return [];
      const searchTerm = query.toLowerCase();
      return menuItems.filter((item) => {
        const itemName = item.menu_name?.toLowerCase() || "";
        const itemDescription = item.description?.toLowerCase() || "";
        const itemCategory = item.category?.toLowerCase() || "";

        return (
          itemName.includes(searchTerm) ||
          itemDescription.includes(searchTerm) ||
          itemCategory.includes(searchTerm)
        );
      });
    },
    [menuItems]
  );

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length >= 1) {
      const results = memoizedGetSearchResults(text);
      setSearchResults(results);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  };

  const handleSelectMenuItem = (item) => {
    // Check if item already exists in selectedItems
    const existingItem = selectedItems.find(
      (selectedItem) => selectedItem.menu_id === item.menu_id
    );

    if (existingItem) {
      // If item exists, update its quantity
      const updatedItems = selectedItems.map((selectedItem) =>
        selectedItem.menu_id === item.menu_id
          ? { ...selectedItem, quantity: selectedItem.quantity + 1 }
          : selectedItem
      );
      setSelectedItems(updatedItems);
    } else {
      // If item doesn't exist, add it with quantity 1
      setSelectedItems([
        ...selectedItems,
        {
          menu_id: item.menu_id,
          menu_name: item.menu_name,
          price: parseFloat(item.price),
          quantity: 1,
          portionSize: "Full",
          specialInstructions: "",
        },
      ]);
    }

    // Clear search
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
    Keyboard.dismiss();
  };

  const OrderSummary = () => {
    return (
      <Box bg="white" p={2} rounded="lg" shadow={1} my={1}>
        <VStack space={1}>
          <HStack justifyContent="space-between" alignItems="center">
            <Heading size="sm">
              {orderDetails?.order_number
                ? `Order #${orderDetails.order_number} - Table ${tableNumber}`
                : `Table ${tableNumber}`}
            </Heading>
            <Text fontSize="xs" color="gray.500">
              {orderDetails?.datetime
                ? formatTime(orderDetails.datetime)
                : getCurrentDate()}
            </Text>
          </HStack>
          {isOccupied === "1" && (
            <HStack justifyContent="space-between" mt={1}>
              <Text fontSize="sm" color="gray.600">
                Section: {sectionName}
              </Text>
              <Badge colorScheme="red">Occupied</Badge>
            </HStack>
          )}
        </VStack>
      </Box>
    );
  };

  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => {
      const itemPrice =
        item.portionSize === "Half" ? item.price * 0.6 : item.price;
      return sum + itemPrice * item.quantity;
    }, 0);
  };

  const calculateTotal = (items) => {
    const subtotal = calculateSubtotal(items);
    // Only update these states if they've changed
    const newGst = subtotal * 0.05;
    const newService = subtotal * 0.05;

    if (Math.abs(newGst - gstAmount) > 0.01) {
      setGstAmount(newGst);
    }
    if (Math.abs(newService - serviceCharges) > 0.01) {
      setServiceCharges(newService);
    }

    return (subtotal + newGst + newService - discountAmount).toFixed(2);
  };

  const handleAssignWaiter = async (waiterId) => {
    try {
      await sendNotificationToWaiter(waiterId, {
        tableNumber: tableNumber,
        sectionName: sectionName,
        orderId: orderId,
      });

      toast.show({
        description: "Notification sent to waiter",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast.show({
        description: "Failed to notify waiter",
        status: "error",
        duration: 2000,
      });
    }
  };

  const SelectedItemsList = () => {
    return (
      <VStack space={2}>
        {selectedItems.map((item, index) => (
          <Box key={index} borderBottomWidth={1} borderColor="gray.200" pb={2}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack flex={1}>
                <Text fontWeight="bold">{item.menu_name}</Text>
                <Text fontSize="sm" color="gray.600">
                  ₹{item.price?.toFixed(2)} x {item.quantity} = ₹
                  {item.menu_sub_total?.toFixed(2)}
                </Text>
                {item.specialInstructions && (
                  <Text fontSize="xs" color="gray.500">
                    Note: {item.specialInstructions}
                  </Text>
                )}
              </VStack>
              <Badge
                colorScheme={item.portionSize === "Half" ? "orange" : "blue"}
              >
                {item.portionSize}
              </Badge>
            </HStack>
          </Box>
        ))}
      </VStack>
    );
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <Header
        title={isOccupied === "1" ? "Update Order" : "Create Order"}
        onBackPress={() => router.replace("/(tabs)/tables/sections")}
        rightComponent={
          <Badge colorScheme="blue" rounded="lg" px={3} py={1}>
            <HStack space={1} alignItems="center">
              <Text color="blue.800" fontSize="sm" fontWeight="medium">
                Table {tableNumber}
              </Text>
            </HStack>
          </Badge>
        }
      />

      <Box flex={1} bg="coolGray.100" px={4}>
        {isOccupied === "1" && orderNumber && <OrderSummary />}

        <Input
          placeholder="Search menu items..."
          value={searchQuery}
          mt={2}
          rounded="lg"
          borderWidth={1}
          borderColor="coolGray.400"
          bg="white"
          onChangeText={handleSearch}
          onFocus={() => {
            if (searchQuery.length >= 1) {
              setIsSearchOpen(true);
            }
          }}
          InputLeftElement={
            <MaterialIcons
              name="search"
              size={24}
              color="gray"
              style={{ marginLeft: 10 }}
            />
          }
          InputRightElement={
            searchQuery ? (
              <IconButton
                icon={<MaterialIcons name="close" size={24} color="gray" />}
                size="md"
                rounded="full"
                mr={1}
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearchOpen(false);
                }}
                _pressed={{
                  bg: "coolGray.100",
                }}
              />
            ) : null
          }
          fontSize={18}
          h={12}
          py={3}
          placeholderTextColor="coolGray.400"
          _focus={{
            borderWidth: 0,
            bg: "white",
          }}
        />

        {isSearchOpen && searchQuery.length >= 3 && (
          <Box
            position="absolute"
            top={12}
            left={4}
            right={4}
            bg="white"
            mt={0}
            rounded="lg"
            shadow={3}
            zIndex={2000}
            maxH="60%"
            borderWidth={1}
            borderColor="coolGray.200"
            overflow="hidden"
          >
            <ScrollView
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const isSelected = selectedItems.some(
                    (selectedItem) => selectedItem.menu_id === item.menu_id
                  );

                  return (
                    <Pressable
                      key={item.menu_id}
                      onPress={() => handleSelectMenuItem(item)}
                      borderBottomWidth={1}
                      borderBottomColor="coolGray.200"
                      bg={isSelected ? "coolGray.100" : "white"}
                      _pressed={{ bg: "coolGray.200" }}
                    >
                      <HStack alignItems="center" py={0}>
                        {/* Category Indicator Line */}
                        <Box
                          w={1}
                          h="80px"
                          bg={
                            item.menu_food_type === "veg"
                              ? "green.500"
                              : item.menu_food_type === "nonveg"
                              ? "red.500"
                              : item.menu_food_type === "vegan"
                              ? "green.700"
                              : "gray.300"
                          }
                          mr={0}
                        />

                        <Box w="80px" h="80px">
                          {item.image ? (
                            <Image
                              source={{ uri: item.image }}
                              alt={item.menu_name}
                              w="full"
                              h="full"
                              resizeMode="cover"
                              rounded="md"
                            />
                          ) : (
                            <Box
                              w="full"
                              h="full"
                              bg="coolGray.200"
                              justifyContent="center"
                              alignItems="center"
                              rounded="md"
                            >
                              <MaterialIcons
                                name="restaurant"
                                size={24}
                                color="gray"
                              />
                            </Box>
                          )}
                        </Box>

                        <VStack flex={1} space={1} ml={3}>
                          <HStack
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text
                              fontSize={18}
                              fontWeight={600}
                              numberOfLines={1}
                              flex={1}
                              mb={2}
                            >
                              {item.menu_name}
                            </Text>
                            {isSelected && (
                              <Badge
                                colorScheme="green"
                                variant="subtle"
                                size="sm"
                              >
                                Added
                              </Badge>
                            )}
                          </HStack>

                          <HStack space={4} alignItems="center">
                            <HStack space={1} alignItems="center">
                              <Text
                                fontSize={16}
                                fontWeight={600}
                                color="gray.500"
                              >
                                H:
                              </Text>
                              <Text
                                fontSize={16}
                                fontWeight={600}
                                color="blue.500"
                              >
                                ₹{(item.price * 0.6).toFixed(0)}
                              </Text>
                            </HStack>
                            <HStack space={1} alignItems="center">
                              <Text
                                fontSize={16}
                                fontWeight={600}
                                color="gray.500"
                              >
                                F:
                              </Text>
                              <Text
                                fontSize={16}
                                fontWeight={600}
                                color="blue.500"
                              >
                                ₹{item.price}
                              </Text>
                            </HStack>
                          </HStack>
                        </VStack>
                      </HStack>
                    </Pressable>
                  );
                })
              ) : (
                <Box p={0} alignItems="center"></Box>
              )}
            </ScrollView>
          </Box>
        )}

        <ScrollView
          flex={1}
          mt={2}
          showsVerticalScrollIndicator={false}
          mb={selectedItems.length > 0 ? 32 : 20}
        >
          <VStack space={2}>
            {selectedItems.length === 0 ? (
              <Box
                flex={1}
                justifyContent="center"
                alignItems="center"
                py={10}
                bg="white"
                rounded="lg"
                borderWidth={1}
                borderColor="coolGray.200"
              >
                <MaterialIcons name="restaurant" size={48} color="gray" />
                <Text color="coolGray.400" mt={2}>
                  No items added to order
                </Text>
              </Box>
            ) : (
              <>
                <Box>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Box py={1}>
                      <Text fontSize="sm" color="gray.500">
                        {selectedItems.length}{" "}
                        {selectedItems.length === 1 ? "Item" : "Items"}
                      </Text>
                    </Box>
                    <Button
                      variant="ghost"
                      _text={{ color: "gray.500" }}
                      leftIcon={
                        <MaterialIcons name="close" size={16} color="gray" />
                      }
                      onPress={() => {
                        setSelectedItems([]);
                        setSearchQuery("");
                        toast.show({
                          description: "All items cleared",
                          status: "info",
                          duration: 2000,
                        });
                      }}
                    >
                      Clear All
                    </Button>
                  </HStack>
                </Box>
                {selectedItems.map((item, index) => (
                  <>
                    <Box
                      key={index}
                      bg="white"
                      p={2}
                      mb={1}
                      rounded="lg"
                      borderWidth={1}
                      borderColor="coolGray.200"
                    >
                      <VStack space={1}>
                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text
                            fontWeight={600}
                            flex={1}
                            numberOfLines={1}
                            fontSize={18}
                          >
                            {item.menu_name}
                          </Text>
                          <IconButton
                            icon={
                              <MaterialIcons
                                name="close"
                                size={16}
                                color="gray"
                              />
                            }
                            size="xs"
                            p={1}
                            onPress={() => {
                              const newItems = selectedItems.filter(
                                (_, i) => i !== index
                              );
                              setSelectedItems(newItems);
                            }}
                          />
                        </HStack>

                        <HStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <HStack space={1} alignItems="center">
                            <IconButton
                              borderWidth={1}
                              borderColor="gray.400"
                              icon={
                                <MaterialIcons
                                  name="remove"
                                  size={16}
                                  color="gray"
                                />
                              }
                              size="xs"
                              variant="outline"
                              _pressed={{ bg: "transparent" }}
                              onPress={() => {
                                if (item.quantity > 1) {
                                  const newItems = [...selectedItems];
                                  newItems[index].quantity--;
                                  setSelectedItems(newItems);
                                }
                              }}
                            />
                            <Text
                              w="10"
                              textAlign="center"
                              fontSize={16}
                              fontWeight="600"
                            >
                              {item.quantity}
                            </Text>
                            <IconButton
                              borderWidth={1}
                              borderColor="gray.400"
                              icon={
                                <MaterialIcons
                                  name="add"
                                  size={16}
                                  color="gray"
                                />
                              }
                              size="xs"
                              variant="outline"
                              _pressed={{ bg: "transparent" }}
                              onPress={() => {
                                if (item.quantity < 20) {
                                  const newItems = [...selectedItems];
                                  newItems[index].quantity++;
                                  setSelectedItems(newItems);
                                }
                              }}
                            />
                          </HStack>

                          <Text
                            fontSize={16}
                            fontWeight={600}
                            color="green.600"
                            textAlign="right"
                          >
                            <Text
                              fontSize={16}
                              color="gray.500"
                              ml={4}
                              fontWeight={600}
                            >
                              {item.portionSize} {" : "}
                            </Text>
                            ₹
                            {(item.portionSize === "Half"
                              ? item.price * 0.6
                              : item.price * 1
                            ).toFixed(2)}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  </>
                ))}
              </>
            )}
          </VStack>
        </ScrollView>

        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="transparent"
          px={4}
        >
          {selectedItems.length > 0 && (
            <Box
              bg="white"
              rounded="lg"
              mb={4}
              borderWidth={1}
              borderColor="coolGray.200"
            >
              {/* Price Summary Section */}
              <HStack
                alignItems="center"
                justifyContent="space-between"
                p={1}
                borderBottomWidth={1}
                borderBottomColor="coolGray.200"
              >
                {/* Subtotal */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="sm">
                    ₹
                    {selectedItems
                      .reduce((sum, item) => {
                        const itemPrice =
                          item.portionSize === "Half"
                            ? item.price * 0.6
                            : item.price;
                        return sum + itemPrice * item.quantity;
                      }, 0)
                      .toFixed(2)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Total
                  </Text>
                </VStack>

                {/* Service Charges */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="sm">
                    ₹{serviceCharges.toFixed(2)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Service
                  </Text>
                </VStack>

                {/* GST */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="sm">
                    ₹{gstAmount.toFixed(2)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    GST
                  </Text>
                </VStack>

                {/* Discount - Only shown if greater than 0 */}
                {discountAmount > 0 && (
                  <VStack alignItems="center">
                    <Text fontWeight="bold" fontSize="sm" color="red.500">
                      -₹{discountAmount.toFixed(2)}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Discount
                    </Text>
                  </VStack>
                )}

                {/* Divider */}
                <Box h="70%" w={0.5} bg="gray.200" />

                {/* Grand Total */}
                <VStack alignItems="center">
                  <Text fontWeight="bold" fontSize="lg" color="green.600">
                    ₹{calculateTotal(selectedItems)}
                  </Text>
                  <Text fontSize="xs" color="gray.500" fontWeight={600}>
                    Total
                  </Text>
                </VStack>
              </HStack>

              {/* Action Buttons Section */}
              <HStack space={4} justifyContent="space-between" p={3}>
                <Button
                  bg="gray.400"
                  rounded="lg"
                  onPress={handleHold}
                  isDisabled={loading}
                  _pressed={{ bg: "gray.600" }}
                >
                  Hold
                </Button>
                <Button
                  flex={1}
                  variant="outline"
                  bg="black"
                  leftIcon={
                    <MaterialIcons name="receipt" size={20} color="white" />
                  }
                  onPress={handleKOT}
                  isDisabled={loading}
                  _text={{ color: "white" }}
                >
                  KOT
                </Button>
                <Button
                  flex={1}
                  bg="blue.500"
                  leftIcon={
                    <MaterialIcons name="payment" size={20} color="white" />
                  }
                  onPress={handleSettle}
                  isDisabled={isProcessing}
                  _pressed={{ bg: "blue.600" }}
                >
                  {isProcessing ? "Processing..." : "Settle"}
                </Button>
              </HStack>
            </Box>
          )}
        </Box>
      </Box>

      {isProcessing && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0,0,0,0.3)"
          zIndex={999}
          justifyContent="center"
          alignItems="center"
        >
          <Box bg="white" p={4} rounded="lg" minW="200">
            <VStack space={3} alignItems="center">
              <Spinner size="lg" color="blue.500" />
              <Text fontWeight="medium">{loadingMessage}</Text>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}
