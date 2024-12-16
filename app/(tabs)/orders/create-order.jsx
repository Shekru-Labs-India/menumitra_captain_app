import React, { useState, useEffect } from "react";
import { TouchableWithoutFeedback, Keyboard } from "react-native";
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

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function CreateOrderScreen() {
  const router = useRouter();
  const toast = useToast();
  const {
    tableId,
    tableNumber,
    sectionId,
    sectionName,
    orderNumber,
    customerName: existingCustomerName,
    customerPhone: existingCustomerPhone,
    orderType: existingOrderType,
    existingItems,
    isOccupied,
  } = useLocalSearchParams();

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
          console.log("Order Details in Create Order:", data);

          if (data.st === 1 && data.lists) {
            const { order_details, menu_details } = data.lists;

            // Format menu items with all necessary details
            const formattedItems = menu_details.map((item) => ({
              id: item.menu_id,
              menu_id: item.menu_id,
              menu_name: item.menu_name,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity),
              specialInstructions: item.comment || "",
              portionSize: item.half_or_full || "Full",
              total: parseFloat(item.menu_sub_total),
              offer: item.offer || 0,
            }));

            // Set all order details
            setSelectedItems(formattedItems);
            setCustomerName(order_details.customer_name || "");
            setCustomerPhone(order_details.customer_phone || "");
            setOrderType(order_details.order_type || "Dine In");
            setServiceCharges(
              parseFloat(order_details.service_charges_amount || 0)
            );
            setGstAmount(parseFloat(order_details.gst_amount || 0));
            setDiscountAmount(parseFloat(order_details.discount_amount || 0));
            setGrandTotal(parseFloat(order_details.total_bill || 0));
          }
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
  }, [orderNumber, isOccupied]);

  const fetchMenuItems = async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      const response = await fetch(
        "https://men4u.xyz/waiter_api/get_all_menu_list_by_category",
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

  const handleKOT = () => {
    // Implement KOT logic
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
      setLoading(true);
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      // First check if table has an active order
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
            date: getCurrentDate(),
          }),
        }
      );

      const listData = await listResponse.json();
      console.log("Active Orders:", listData);

      // Find if this table has an active order
      const tableOrder = listData.lists?.find(
        (order) =>
          order.table_number === tableNumber &&
          order.section_id === sectionId.toString()
      );

      const formattedOrderItems = selectedItems.map((item) => ({
        menu_id: item.menu_id ? item.menu_id.toString() : item.id.toString(),
        quantity: item.quantity,
        comment: item.specialInstructions || "",
        half_or_full: item.portionSize.toLowerCase(),
      }));

      const endpoint = tableOrder
        ? `${API_BASE_URL}/captain_order/update`
        : "https://men4u.xyz/waiter_api/create_order";

      const requestBody = tableOrder
        ? {
            restaurant_id: restaurantId.toString(),
            table_number: tableNumber.toString(),
            section_id: sectionId.toString(),
            order_type: orderType,
            order_items: formattedOrderItems,
            customer_name: customerName,
            customer_phone: customerPhone,
            order_number: tableOrder.order_number,
          }
        : {
            customer_id: "367",
            restaurant_id: restaurantId.toString(),
            table_number: tableNumber.toString(),
            section_id: sectionId.toString(),
            order_type: orderType,
            order_items: formattedOrderItems,
          };

      console.log("Order Request:", { endpoint, body: requestBody });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Order Response:", data);

      if (data.st === 1) {
        toast.show({
          description: `Order ${
            tableOrder ? "updated" : "created"
          } successfully`,
          status: "success",
          duration: 2000,
        });

        setTimeout(() => {
          router.replace("/(tabs)/orders");
        }, 1000);
      } else {
        throw new Error(
          data.msg || `Failed to ${tableOrder ? "update" : "create"} order`
        );
      }
    } catch (error) {
      console.error("Order Error:", error);
      toast.show({
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
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

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Create Order" />

      <Box flex={1} bg="coolGray.100" px={4}>
        <Input
          placeholder="Search menu items..."
          value={searchQuery}
          mt={2}
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
                <Box p={4} alignItems="center">
                  <Text color="gray.500">No menu items found</Text>
                </Box>
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
                      rounded="sm"
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
            <Box bg="white" p={3} rounded="lg" shadow={2} mb={2}>
              <VStack space={2}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="gray.500">
                    Subtotal:
                  </Text>
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
                </HStack>

                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="gray.500">
                    Service Charges:
                  </Text>
                  <Text fontWeight="bold" fontSize="sm">
                    ₹{serviceCharges.toFixed(2)}
                  </Text>
                </HStack>

                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="gray.500">
                    GST:
                  </Text>
                  <Text fontWeight="bold" fontSize="sm">
                    ₹{gstAmount.toFixed(2)}
                  </Text>
                </HStack>

                {discountAmount > 0 && (
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="sm" color="gray.500">
                      Discount:
                    </Text>
                    <Text fontWeight="bold" fontSize="sm" color="red.500">
                      -₹{discountAmount.toFixed(2)}
                    </Text>
                  </HStack>
                )}

                <Divider my={1} />

                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="black.500" fontWeight={600}>
                    Grand Total:
                  </Text>
                  <Text fontWeight="bold" fontSize={18} color="green.600">
                    ₹{calculateTotal(selectedItems)}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          )}

          {selectedItems.length > 0 && (
            <HStack space={4} justifyContent="space-between" mb={4}>
              <Button
                bg="gray.400"
                rounded="lg"
                onPress={() => {
                  // Add your hold functionality here
                  toast.show({
                    description: "Order placed on hold",
                    status: "info",
                    duration: 2000,
                  });
                }}
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
                onPress={() => handleKOT()}
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
                isLoading={loading}
                _pressed={{ bg: "blue.600" }}
              >
                {loading ? "Creating Order..." : "Settle"}
              </Button>
            </HStack>
          )}
        </Box>
      </Box>

      {loading && (
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
          <Box bg="white" p={4} rounded="lg">
            <Spinner size="lg" color="green.500" />
            <Text mt={2}>Creating Order...</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
