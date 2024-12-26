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
  const [restaurantId, setRestaurantId] = useState(null);
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
        // Get params from router
        const {
          tableId,
          tableNumber,
          sectionId,
          sectionName,
          isOccupied,
          orderId: routeOrderId, // Get orderId from route if it exists
        } = params;

        // Set state values from params
        setTableNumber(tableNumber || "");
        setSectionId(sectionId || "");
        setSectionName(sectionName || "");
        setIsOccupied(isOccupied || "0");

        // Only set orderId if it exists in params
        if (routeOrderId) {
          setOrderId(routeOrderId);
          console.log("Order ID set from params:", routeOrderId);
        }

        // Log the initialized values
        console.log("Initialized Order Details:", {
          tableNumber,
          sectionId,
          sectionName,
          isOccupied,
          orderId: routeOrderId || "New Order",
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
  }, [params]); // Only depend on params

  useEffect(() => {
    const getRestaurantId = async () => {
      const storedId = await AsyncStorage.getItem("restaurant_id");
      setRestaurantId(storedId);
    };
    getRestaurantId();
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [restaurantId]);

  useEffect(() => {
    const loadOrderDetails = async () => {
      if (orderNumber && isOccupied === "1") {
        try {
          const storedRestaurantId = await AsyncStorage.getItem(
            "restaurant_id"
          );

          // Fetch order details from API
          const response = await fetch(`${API_BASE_URL}/captain_order/view`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(storedRestaurantId),
              order_number: orderNumber,
            }),
          });

          const data = await response.json();
          console.log("Order Details Response:", data);

          if (data.st === 1 && data.lists?.order_details) {
            setOrderDetails(data.lists.order_details);

            if (data.lists.menu_details) {
              const formattedItems = data.lists.menu_details.map((item) => ({
                menu_id: item.menu_id,
                menu_name: item.menu_name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                portionSize: "Full",
                menu_sub_total: parseFloat(item.menu_sub_total),
              }));
              setSelectedItems(formattedItems);
            }
          }
        } catch (error) {
          console.error("Error loading order details:", error);
          toast.show({
            description: "Failed to load order details",
            status: "error",
          });
        }
      }
    };

    loadOrderDetails();
  }, [orderNumber, isOccupied]);

  useEffect(() => {
    console.log("Received params:", params);
    console.log("orderId:", orderId);
  }, [params, orderId]);

  const fetchMenuItems = async () => {
    if (!restaurantId) return;

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
            restaurant_id: parseInt(restaurantId),
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

  const verifyRequiredData = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      const restaurantId = await AsyncStorage.getItem("restaurant_id");
      const captainId = await AsyncStorage.getItem("captain_id");

      if (!userId || !restaurantId || !captainId) {
        toast.show({
          description: "Missing required data. Please login again.",
          status: "error",
        });
        router.replace("/");
        return false;
      }

      console.log("Verified Data:", {
        userId,
        restaurantId,
        captainId,
      });

      return true;
    } catch (error) {
      console.error("Data verification error:", error);
      return false;
    }
  };

  const handleHold = async () => {
    if (!(await verifyRequiredData())) return;

    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem("user_id");
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      if (!storedUserId || !storedRestaurantId) {
        throw new Error("Missing required information");
      }

      const requestBody = {
        user_id: storedUserId,
        restaurant_id: storedRestaurantId,
        table_number: tableNumber,
        section_id: sectionId,
        order_type: "Dine-in",
        order_status: "paid",
        order_items: selectedItems.map((item) => ({
          menu_id: item.menu_id.toString(),
          quantity: parseInt(item.quantity),
          comment: item.specialInstructions || "Less spicy",
          half_or_full: (item.portionSize || "Full").toLowerCase(),
        })),
      };

      // Only add orderId to request if it exists
      if (orderId) {
        requestBody.order_id = orderId;
        console.log("Updating existing order:", orderId);
      } else {
        console.log("Creating new order");
      }

      const endpoint = orderId
        ? `${API_BASE_URL}/update_order`
        : `${API_BASE_URL}/create_order`;

      console.log("Request Body:", requestBody);
      console.log("Endpoint:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Response:", data);

      if (data.st === 1) {
        toast.show({
          description: orderId
            ? "Order updated successfully"
            : "Order created successfully",
          status: "success",
          duration: 2000,
        });
        router.replace("/(tabs)/orders");
      } else {
        throw new Error(data.msg || "Failed to process order");
      }
    } catch (error) {
      console.error("Hold Order Error:", error);
      toast.show({
        description: error.message || "Failed to process order",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKOT = async () => {
    if (!(await verifyRequiredData())) return;

    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);

      const storedUserId = await AsyncStorage.getItem("user_id");
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      if (!storedUserId || !storedRestaurantId) {
        throw new Error("Missing required information");
      }

      const formattedOrderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id.toString(),
        quantity: parseInt(item.quantity),
        comment: item.specialInstructions || "Less spicy",
        half_or_full: (item.portionSize || "Full").toLowerCase(),
      }));

      const requestBody = {
        user_id: storedUserId,
        restaurant_id: storedRestaurantId,
        table_number: tableNumber.toString(),
        section_id: sectionId.toString(),
        order_type: orderType || "Dine-in",
        order_status: "paid",
        order_items: formattedOrderItems,
      };

      if (orderId) {
        requestBody.order_id = orderId;
      }

      console.log("KOT Request:", requestBody);

      const response = await fetch(
        orderId
          ? `${API_BASE_URL}/update_order`
          : `${API_BASE_URL}/create_order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();
      console.log("KOT Response:", data);

      if (data.st === 1) {
        toast.show({
          description: orderId
            ? "KOT updated successfully"
            : "KOT generated successfully",
          status: "success",
          duration: 2000,
        });
        router.replace("/(tabs)/orders");
      } else {
        throw new Error(data.msg || "Failed to process KOT");
      }
    } catch (error) {
      console.error("KOT Error:", error);
      toast.show({
        description: error.message || "Failed to process KOT",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

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

      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (!storedRestaurantId) {
        throw new Error("Restaurant ID not found");
      }

      // First update the order
      if (orderId) {
        const updatePayload = {
          order_id: parseInt(orderId),
          customer_id: "367",
          restaurant_id: parseInt(storedRestaurantId),
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
        restaurant_id: parseInt(storedRestaurantId),
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

  // Add this function to validate the response
  const isValidResponse = (response) => {
    try {
      return response && typeof response === "object" && "st" in response;
    } catch {
      return false;
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

  const OrderSummary = () => {
    console.log("Order Details:", orderDetails); // Add this for debugging

    return (
      <Box bg="white" p={2} rounded="lg" shadow={1} my={1}>
        <VStack space={1}>
          <HStack justifyContent="space-between" alignItems="center">
            <Heading size="sm">
              Order #{orderDetails?.order_number} - {orderDetails?.table_number}
            </Heading>
            <Text fontSize="xs" color="gray.500">
              {orderDetails?.datetime ? formatTime(orderDetails.datetime) : ""}
            </Text>
          </HStack>
        </VStack>
      </Box>
    );
  };

  const handleTablePress = async (table, section) => {
    if (table.is_occupied === 0) {
      router.push({
        pathname: "/(tabs)/orders/create-order",
        params: {
          tableId: table.table_id.toString(),
          tableNumber: table.table_number.toString(),
          sectionId: section.id,
          sectionName: section.name,
          isOccupied: "0",
        },
      });
    } else {
      try {
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

        // Format date as "DD MMM YYYY"
        const today = new Date();
        const formattedDate = today.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        // First get the ongoing orders list
        const listResponse = await fetch(
          `${API_BASE_URL}/captain_order/listview`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(storedRestaurantId),
              order_status: "ongoing",
              date: formattedDate, // Using the correctly formatted date
            }),
          }
        );

        const listData = await listResponse.json();
        console.log("List Response:", listData);

        if (listData.st === 1 && listData.lists && listData.lists.length > 0) {
          // Find the order for this table
          const tableOrder = listData.lists.find(
            (order) => order.table_number === table.table_number.toString()
          );

          console.log("Found Table Order:", tableOrder);

          if (tableOrder) {
            // Get detailed order info
            const response = await fetch(`${API_BASE_URL}/captain_order/view`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                restaurant_id: parseInt(storedRestaurantId),
                order_number: tableOrder.order_number,
              }),
            });

            const data = await response.json();
            console.log("Order Details:", data);

            if (data.st === 1 && data.lists) {
              const { order_details, menu_details } = data.lists;

              router.push({
                pathname: "/(tabs)/orders/create-order",
                params: {
                  tableId: table.table_id.toString(),
                  tableNumber: table.table_number.toString(),
                  sectionId: section.id.toString(),
                  sectionName: section.name,
                  orderNumber: tableOrder.order_number,
                  customerName: order_details.customer_name || "",
                  customerPhone: order_details.customer_phone || "",
                  orderType: tableOrder.order_type || "Dine In", // Getting order_type from listData
                  existingItems: JSON.stringify(menu_details),
                  isOccupied: "1",
                  grandTotal: order_details.total_bill?.toString() || "0",
                  serviceCharges:
                    order_details.service_charges_amount?.toString() || "0",
                  gstAmount: order_details.gst_amount?.toString() || "0",
                  discountAmount:
                    order_details.discount_amount?.toString() || "0",
                },
              });
            }
          } else {
            throw new Error("No active order found for this table");
          }
        } else {
          throw new Error("No ongoing orders found");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.show({
          description: error.message || "Failed to fetch order details",
          status: "error",
        });
      }
    }
  };

  // Handle device back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace("/(tabs)/tables/sections");
        return true; // Prevents default behavior
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => {
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
      };
    }, [])
  );

  // Add cleanup effect
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Cleanup when screen is unfocused
        if (!isFocused) {
          setSelectedItems([]);
          setOrderDetails({});
          setServiceCharges(0);
          setGstAmount(0);
          setDiscountAmount(0);
          setSearchQuery("");
          setSearchResults([]);
        }
      };
    }, [isFocused])
  );

  // Add navigation effect
  useEffect(() => {
    if (!isFocused) {
      // Reset states when leaving the screen
      setSelectedItems([]);
      setOrderDetails({});
      setServiceCharges(0);
      setGstAmount(0);
      setDiscountAmount(0);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isFocused]);

  return (
    <Box flex={1} bg="white" safeArea>
      <Header
        title={isOccupied === "1" ? "Order Details" : "Create Order"}
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
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.length >= 1) {
              setSearchResults(getSearchResults(text));
              setIsSearchOpen(true);
            } else {
              setSearchResults([]);
              setIsSearchOpen(false);
            }
          }}
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
