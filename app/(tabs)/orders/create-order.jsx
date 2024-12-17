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
import { useFocusEffect } from "@react-navigation/native";

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

  // Split the datetime string to get date, time and meridiem
  const parts = dateTimeStr.split(" ");
  if (parts.length < 3) return "";

  // Get date, time part and meridiem
  const date = parts[0]; // "17-Dec-2024"
  const time = parts[1]; // "11:04:43"
  const meridiem = parts[2]; // "AM"

  // Split time to get hours and minutes
  const timeParts = time.split(":");
  if (timeParts.length < 2) return "";

  // Return formatted date and time (DD-MMM-YYYY HH:MM AM/PM)
  return `${date} ${timeParts[0]}:${timeParts[1]} ${meridiem}`;
};

export default function CreateOrderScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();
  const {
    tableId,
    tableNumber,
    sectionId,
    sectionName,
    orderId,
    orderNumber,
    customerName: existingCustomerName,
    customerPhone: existingCustomerPhone,
    orderType: existingOrderType,
    existingItems,
    isOccupied,
  } = params;

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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
          // Parse existing items if available
          if (existingItems) {
            const menuItems = JSON.parse(existingItems);
            const formattedItems = menuItems.map((item) => ({
              menu_name: item.menu_name,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity),
              portionSize: "Full",
              menu_sub_total: item.price * item.quantity,
            }));

            setSelectedItems(formattedItems);
          }

          // Set order details
          setOrderDetails({
            order_number: orderNumber,
            table_number: tableNumber,
            total_bill: params.grandTotal ? parseFloat(params.grandTotal) : 0,
            datetime: params.orderDateTime || "",
            order_type: existingOrderType || "Dine In",
          });
        } catch (error) {
          console.error("Error loading order:", error);
          toast.show({
            description: "Failed to load order details",
            status: "error",
          });
        }
      }
    };

    loadOrderDetails();
  }, [
    orderNumber,
    isOccupied,
    existingItems,
    tableNumber,
    params.grandTotal,
    params.orderDateTime,
    existingOrderType,
  ]);

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

  const handleCreateOrder = async () => {
    // Validate if any menu items are selected
    const hasEmptyItems = orderItems.some((item) => !item.menuItem);
    if (hasEmptyItems) {
      toast.show({
        description: "Please select menu items for all order entries",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);

      // Format order items as per API requirements
      const formattedOrderItems = orderItems.map((item) => ({
        menu_id: item.menuItem.toString(),
        quantity: item.quantity,
        comment: item.specialInstructions || "",
        half_or_full: item.portionSize.toLowerCase(),
      }));

      const response = await fetch(
        "https://men4u.xyz/waiter_api/create_order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_id: "367", // You might want to make this dynamic if needed
            restaurant_id: restaurantId.toString(),
            table_number: tableNumber.toString(),
            section_id: sectionId.toString(),
            order_type: orderType,
            order_items: formattedOrderItems,
          }),
        }
      );

      const data = await response.json();

      if (data.st === 1) {
        toast.show({
          description: "Order created successfully",
          status: "success",
          duration: 3000,
        });

        // Navigate back to orders index screen
        router.replace("/(tabs)/orders");
      } else {
        throw new Error(data.msg || "Failed to create order");
      }
    } catch (error) {
      console.error("Create Order Error:", error);
      toast.show({
        description: error.message || "Failed to create order",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new item handler
  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        id: orderItems.length + 1,
        menuItem: "",
        quantity: 1,
        specialInstructions: "",
        portionSize: "Full",
      },
    ]);
  };

  // Delete item handler
  const handleDeleteItem = (itemId) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId));
  };

  const getSearchResults = (query) => {
    if (!query.trim() || query.length < 3) return [];
    const filtered = menuItems.filter((item) =>
      item.menu_name.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.slice(0, 5); // Limit to 5 results
  };

  const handleSelectMenuItem = (menuItem, portionSize = "Full") => {
    console.log("Selected menu item:", menuItem);

    const exists = selectedItems.find(
      (item) => item.menu_id === menuItem.menu_id
    );

    if (exists) {
      // Update quantity if item exists
      const updatedItems = selectedItems.map((item) =>
        item.menu_id === menuItem.menu_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        ...menuItem,
        quantity: 1,
        specialInstructions: "",
        portionSize: portionSize,
      };
      setSelectedItems((prevItems) => [...prevItems, newItem]);
    }

    // Clear search and close dropdown after adding item
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);

    toast.show({
      description: exists ? "Item quantity updated" : "Item added to order",
      status: "success",
      duration: 1000,
    });
  };

  const calculateTax = (items) => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return (subtotal * 0.18).toFixed(2);
  };

  const calculateTotal = (items) => {
    const subtotal = items.reduce((sum, item) => {
      const itemPrice =
        item.portionSize === "Half" ? item.price * 0.6 : item.price;
      return sum + itemPrice * item.quantity;
    }, 0);

    const total = subtotal + serviceCharges + gstAmount - discountAmount;
    return total.toFixed(2);
  };

  const handleHold = async () => {
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
      });
      return;
    }

    const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
    if (!storedRestaurantId) {
      toast.show({
        description: "Restaurant ID not found. Please login again.",
        status: "error",
      });
      return;
    }

    try {
      setLoading(true);
      console.log("Selected Items before formatting:", selectedItems);

      const formattedOrderItems = selectedItems.map((item) => {
        // Find the matching menu item from menuItems array
        const menuItem = menuItems.find(
          (menu) => menu.menu_name === item.menu_name
        );

        return {
          menu_id: menuItem?.menu_id?.toString() || item.menu_id?.toString(),
          quantity: item.quantity || 1,
          comment: item.specialInstructions || "",
          half_or_full: (item.portionSize || "Full").toLowerCase(),
        };
      });

      console.log("Formatted Order Items:", formattedOrderItems);

      if (orderId) {
        const requestBody = {
          order_id: orderId,
          customer_id: "367",
          restaurant_id: parseInt(storedRestaurantId),
          table_number: parseInt(tableNumber),
          section_id: parseInt(sectionId),
          order_type: orderType,
          order_items: formattedOrderItems,
        };

        console.log("Update Order Request:", requestBody);

        const response = await fetch(`${API_BASE_URL}/update_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("Update Order Response:", data);

        if (data.st === 1) {
          toast.show({
            description: "Order updated successfully",
            status: "success",
            duration: 2000,
          });
          router.replace("/(tabs)/orders");
        } else {
          throw new Error(data.msg || "Failed to update order");
        }
      } else {
        // Handle new order creation
        const requestBody = {
          customer_id: "367",
          restaurant_id: parseInt(storedRestaurantId),
          table_number: parseInt(tableNumber),
          section_id: parseInt(sectionId),
          order_type: orderType,
          order_items: formattedOrderItems,
        };

        console.log("Hold Create Request:", requestBody);

        const response = await fetch(`${API_BASE_URL}/create_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("Hold Create Response:", data);

        if (data.st === 1) {
          toast.show({
            description: "Order placed on hold successfully",
            status: "success",
            duration: 2000,
          });
          router.replace("/(tabs)/orders");
        } else {
          throw new Error(data.msg || "Failed to create order");
        }
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
    if (selectedItems.length === 0) {
      toast.show({
        description: "Please add items to the order",
        status: "warning",
      });
      return;
    }

    const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
    if (!storedRestaurantId) {
      toast.show({
        description: "Restaurant ID not found. Please login again.",
        status: "error",
      });
      return;
    }

    try {
      setLoading(true);
      console.log("Selected Items before formatting:", selectedItems);

      const formattedOrderItems = selectedItems.map((item) => {
        // Find the matching menu item from menuItems array
        const menuItem = menuItems.find(
          (menu) => menu.menu_name === item.menu_name
        );

        return {
          menu_id: menuItem?.menu_id?.toString() || item.menu_id?.toString(),
          quantity: item.quantity || 1,
          comment: item.specialInstructions || "",
          half_or_full: (item.portionSize || "Full").toLowerCase(),
        };
      });

      console.log("Formatted Order Items:", formattedOrderItems);

      if (orderId) {
        const requestBody = {
          order_id: orderId,
          customer_id: "367",
          restaurant_id: parseInt(storedRestaurantId),
          table_number: parseInt(tableNumber),
          section_id: parseInt(sectionId),
          order_type: orderType,
          order_items: formattedOrderItems,
        };

        console.log("Update Order Request:", requestBody);

        const response = await fetch(`${API_BASE_URL}/update_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("Update Order Response:", data);

        if (data.st === 1) {
          toast.show({
            description: "KOT updated successfully",
            status: "success",
            duration: 2000,
          });
          router.replace("/(tabs)/orders");
        } else {
          throw new Error(data.msg || "Failed to update KOT");
        }
      } else {
        // Handle new KOT creation
        const requestBody = {
          customer_id: "367",
          restaurant_id: parseInt(storedRestaurantId),
          table_number: parseInt(tableNumber),
          section_id: parseInt(sectionId),
          order_type: orderType,
          order_items: formattedOrderItems,
        };

        console.log("KOT Create Request:", requestBody);

        const response = await fetch(`${API_BASE_URL}/create_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("KOT Create Response:", data);

        if (data.st === 1) {
          toast.show({
            description: "KOT generated successfully",
            status: "success",
            duration: 2000,
          });
          router.replace("/(tabs)/orders");
        } else {
          throw new Error(data.msg || "Failed to create KOT");
        }
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

    const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
    if (!storedRestaurantId) {
      toast.show({
        description: "Restaurant ID not found. Please login again.",
        status: "error",
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log("Selected Items before formatting:", selectedItems);

      const formattedOrderItems = selectedItems.map((item) => {
        const menuItem = menuItems.find(
          (menu) => menu.menu_name === item.menu_name
        );

        return {
          menu_id: menuItem?.menu_id?.toString() || item.menu_id?.toString(),
          quantity: item.quantity || 1,
          comment: item.specialInstructions || "",
          half_or_full: (item.portionSize || "Full").toLowerCase(),
        };
      });

      if (orderId) {
        // For existing orders
        setLoadingMessage("Updating order...");
        const updateRequestBody = {
          order_id: orderId,
          customer_id: "367",
          restaurant_id: parseInt(storedRestaurantId),
          table_number: parseInt(tableNumber),
          section_id: parseInt(sectionId),
          order_type: orderType,
          order_items: formattedOrderItems,
        };

        const updateResponse = await fetch(`${API_BASE_URL}/update_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateRequestBody),
        });

        const updateData = await updateResponse.json();

        if (updateData.st === 1) {
          setLoadingMessage("Completing order...");
          const completeRequestBody = {
            restaurant_id: parseInt(storedRestaurantId),
            order_status: "completed",
            order_id: parseInt(orderId),
          };

          const completeResponse = await fetch(
            `${API_BASE_URL}/captain_manage/update_order_status`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(completeRequestBody),
            }
          );

          const completeData = await completeResponse.json();

          if (completeData.st === 1) {
            toast.show({
              description: "Order updated and completed successfully",
              status: "success",
              duration: 3000,
            });
            router.replace("/(tabs)/orders");
          } else {
            throw new Error(completeData.msg || "Failed to complete order");
          }
        } else {
          throw new Error(updateData.msg || "Failed to update order");
        }
      } else {
        // For new orders
        setLoadingMessage("Creating new order...");
        const createRequestBody = {
          customer_id: "367",
          restaurant_id: parseInt(storedRestaurantId),
          table_number: parseInt(tableNumber),
          section_id: parseInt(sectionId),
          order_type: orderType,
          order_items: formattedOrderItems,
        };

        const createResponse = await fetch(`${API_BASE_URL}/create_order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createRequestBody),
        });

        const createData = await createResponse.json();

        if (createData.st === 1) {
          setLoadingMessage("Completing new order...");
          const completeRequestBody = {
            restaurant_id: parseInt(storedRestaurantId),
            order_status: "completed",
            order_id: parseInt(createData.order_id),
          };

          const completeResponse = await fetch(
            `${API_BASE_URL}/captain_manage/update_order_status`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(completeRequestBody),
            }
          );

          const completeData = await completeResponse.json();

          if (completeData.st === 1) {
            toast.show({
              description: "New order created and completed successfully",
              status: "success",
              duration: 3000,
            });
            router.replace("/(tabs)/orders");
          } else {
            throw new Error(completeData.msg || "Failed to complete new order");
          }
        } else {
          throw new Error(createData.msg || "Failed to create new order");
        }
      }
    } catch (error) {
      console.error("Settle Order Error:", error);
      toast.show({
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoadingMessage("");
      setIsProcessing(false);
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

  const OrderSummary = () => (
    <Box bg="white" p={2} rounded="lg" shadow={1} my={1}>
      <VStack space={1}>
        <HStack justifyContent="space-between" alignItems="center">
          <Heading size="sm">
            Order #{orderDetails.order_number} - T{orderDetails.table_number}
          </Heading>
          <Text fontSize="xs" color="gray.500">
            {formatTime(orderDetails.datetime)}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );

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

  return (
    <Box flex={1} bg="white" safeArea>
      <Header
        title={isOccupied === "1" ? "Order Details" : "Create Order"}
        onBackPress={() => {
          router.replace("/(tabs)/tables/sections");
        }}
        rightComponent={
          <Badge colorScheme="blue" rounded="lg" px={3} py={1}>
            <HStack space={1} alignItems="center">
              <Text color="blue.800" fontSize="sm" fontWeight="medium">
                Table
              </Text>
              <Text color="blue.800" fontSize="sm" fontWeight="medium">
                T{tableNumber}
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
            if (text.length >= 3) {
              setSearchResults(getSearchResults(text));
              setIsSearchOpen(true);
            } else {
              setSearchResults([]);
              setIsSearchOpen(false);
            }
          }}
          onFocus={() => {
            if (searchQuery.length >= 3) {
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
                    <Text fontSize="xs" color="gray.500">
                      Discount
                    </Text>
                    <Text fontWeight="bold" fontSize="sm" color="red.500">
                      -₹{discountAmount.toFixed(2)}
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
