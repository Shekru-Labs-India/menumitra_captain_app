import React, { useState, useEffect } from "react";
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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function CreateOrderScreen() {
  const router = useRouter();
  const toast = useToast();
  const { tableId, tableNumber, sectionId, sectionName } =
    useLocalSearchParams();

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

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Create New Order" />

      <ScrollView>
        <VStack space={4} p={4}>
          {/* Table Info */}
          <Box
            bg="coolGray.50"
            p={4}
            rounded="lg"
            borderWidth={1}
            borderColor="coolGray.200"
          >
            <VStack space={2}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text color="coolGray.600">Section:</Text>
                <Text fontWeight="bold">{sectionName}</Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text color="coolGray.600">Table Number:</Text>
                <Badge colorScheme="green" rounded="md">
                  {tableNumber}
                </Badge>
              </HStack>
            </VStack>
          </Box>

          <Divider />

          {/* Order Type Selection */}
          <FormControl>
            <FormControl.Label>Order Type</FormControl.Label>
            <Select
              defaultValue="Dine In"
              value={orderType}
              onValueChange={(value) => setOrderType(value)}
              accessibilityLabel="Choose Order Type"
              placeholder="Choose Order Type"
              _selectedItem={{
                bg: "coolGray.100",
                endIcon: <MaterialIcons name="check" size={20} color="black" />,
              }}
            >
              <Select.Item label="Dine In" value="Dine In" />
              <Select.Item label="Parcel" value="Parsel" />
            </Select>
          </FormControl>

          {/* Order Items Section */}
          <VStack space={4}>
            <HStack justifyContent="space-between" alignItems="center">
              <Heading size="sm">Order Items</Heading>
              <Button
                leftIcon={<MaterialIcons name="add" size={20} color="white" />}
                colorScheme="green"
                size="sm"
                onPress={handleAddItem}
              >
                Add Item
              </Button>
            </HStack>

            {/* Map through order items */}
            {orderItems.map((item, index) => (
              <Box
                key={item.id}
                bg="coolGray.50"
                p={4}
                rounded="lg"
                borderWidth={1}
                borderColor="coolGray.200"
              >
                <VStack space={4}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="bold">Item {index + 1}</Text>
                    {orderItems.length > 1 && ( // Only show delete if more than 1 item
                      <IconButton
                        icon={
                          <MaterialIcons name="delete" size={20} color="red" />
                        }
                        colorScheme="red"
                        variant="ghost"
                        size="sm"
                        onPress={() => handleDeleteItem(item.id)}
                      />
                    )}
                  </HStack>

                  <FormControl isRequired>
                    <FormControl.Label>Menu Item</FormControl.Label>
                    <Select
                      placeholder="Select Menu Item"
                      value={item.menuItem}
                      onValueChange={(value) => {
                        const updatedItems = [...orderItems];
                        updatedItems[index].menuItem = value;
                        setOrderItems(updatedItems);
                      }}
                      _selectedItem={{
                        bg: "coolGray.100",
                        endIcon: (
                          <MaterialIcons name="check" size={20} color="black" />
                        ),
                      }}
                    >
                      {menuItems.map((menuItem) => (
                        <Select.Item
                          key={menuItem.menu_id}
                          label={menuItem.menu_name}
                          value={menuItem.menu_id}
                        >
                          <Box py={2}>
                            <HStack space={3} alignItems="center">
                              <Box
                                w="60px"
                                h="60px"
                                rounded="md"
                                overflow="hidden"
                              >
                                {menuItem.image ? (
                                  <Image
                                    source={{ uri: menuItem.image }}
                                    alt={menuItem.menu_name}
                                    w="full"
                                    h="full"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <Box
                                    w="full"
                                    h="full"
                                    bg="coolGray.200"
                                    justifyContent="center"
                                    alignItems="center"
                                  >
                                    <MaterialIcons
                                      name="restaurant"
                                      size={24}
                                      color="gray"
                                    />
                                  </Box>
                                )}
                              </Box>

                              <VStack flex={1} space={1}>
                                <HStack
                                  space={2}
                                  alignItems="center"
                                  flexWrap="wrap"
                                >
                                  <Badge
                                    colorScheme={
                                      menuItem.menu_food_type === "veg"
                                        ? "green"
                                        : menuItem.menu_food_type === "vegan"
                                        ? "emerald"
                                        : "red"
                                    }
                                    rounded="sm"
                                    variant="subtle"
                                    size="sm"
                                  >
                                    {menuItem.menu_food_type.toUpperCase()}
                                  </Badge>
                                  {menuItem.is_special && (
                                    <Badge
                                      colorScheme="orange"
                                      rounded="sm"
                                      size="sm"
                                    >
                                      SPECIAL
                                    </Badge>
                                  )}
                                  <Badge
                                    colorScheme="coolGray"
                                    rounded="sm"
                                    size="sm"
                                  >
                                    {menuItem.category_name}
                                  </Badge>
                                </HStack>

                                <Text
                                  fontSize="sm"
                                  fontWeight="bold"
                                  numberOfLines={1}
                                >
                                  {menuItem.menu_name}
                                </Text>

                                <HStack space={2} alignItems="center">
                                  <Text
                                    fontSize="sm"
                                    fontWeight="bold"
                                    color="blue.500"
                                  >
                                    ₹{menuItem.price}
                                  </Text>
                                  {menuItem.offer > 0 && (
                                    <HStack space={1} alignItems="center">
                                      <Text
                                        fontSize="xs"
                                        color="coolGray.400"
                                        textDecorationLine="line-through"
                                      >
                                        ₹{menuItem.price}
                                      </Text>
                                      <Badge
                                        colorScheme="green"
                                        variant="outline"
                                        size="sm"
                                      >
                                        {menuItem.offer}% OFF
                                      </Badge>
                                    </HStack>
                                  )}
                                </HStack>
                              </VStack>

                              <VStack alignItems="flex-end" space={2}>
                                {menuItem.rating !== "null" && (
                                  <HStack
                                    space={1}
                                    alignItems="center"
                                    bg="amber.100"
                                    px={2}
                                    py={0.5}
                                    rounded="full"
                                  >
                                    <MaterialIcons
                                      name="star"
                                      size={12}
                                      color="orange"
                                    />
                                    <Text
                                      fontSize="xs"
                                      color="amber.700"
                                      fontWeight="bold"
                                    >
                                      {menuItem.rating}
                                    </Text>
                                  </HStack>
                                )}

                                {parseInt(menuItem.spicy_index) > 0 && (
                                  <HStack
                                    space={0.5}
                                    bg="red.100"
                                    px={2}
                                    py={0.5}
                                    rounded="full"
                                  >
                                    {[
                                      ...Array(parseInt(menuItem.spicy_index)),
                                    ].map((_, i) => (
                                      <MaterialIcons
                                        key={i}
                                        name="whatshot"
                                        size={12}
                                        color="red"
                                      />
                                    ))}
                                  </HStack>
                                )}
                              </VStack>
                            </HStack>
                          </Box>
                        </Select.Item>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl
                    isRequired
                    isInvalid={item.quantity < 1 || item.quantity > 20}
                  >
                    <FormControl.Label>Quantity</FormControl.Label>
                    <Input
                      keyboardType="numeric"
                      value={item.quantity ? item.quantity.toString() : ""}
                      onChangeText={(value) => {
                        const updatedItems = [...orderItems];

                        // If value is empty, don't update the quantity
                        if (value === "") {
                          updatedItems[index].quantity = "";
                          setOrderItems(updatedItems);
                          return;
                        }

                        const newQuantity = parseInt(value);

                        // Only update if it's a valid number
                        if (!isNaN(newQuantity)) {
                          if (newQuantity < 1) {
                            toast.show({
                              description: "Quantity cannot be less than 1",
                              status: "warning",
                            });
                            updatedItems[index].quantity = 1;
                          } else if (newQuantity > 20) {
                            toast.show({
                              description: "Quantity cannot exceed 20",
                              status: "warning",
                            });
                            updatedItems[index].quantity = 20;
                          } else {
                            updatedItems[index].quantity = newQuantity;
                          }
                          setOrderItems(updatedItems);
                        }
                      }}
                      onPressIn={() => {
                        toast.closeAll(); // Closes all active toasts when input is clicked
                      }}
                      placeholder="Enter quantity"
                    />
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>Special Instructions</FormControl.Label>
                    <Input
                      placeholder="Enter any special instructions"
                      value={item.specialInstructions}
                      onChangeText={(value) => {
                        const updatedItems = [...orderItems];
                        updatedItems[index].specialInstructions = value;
                        setOrderItems(updatedItems);
                      }}
                      multiline
                      numberOfLines={2}
                    />
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>Portion Size</FormControl.Label>
                    <Select
                      placeholder="Select Portion Size"
                      value={item.portionSize}
                      onValueChange={(value) => {
                        const updatedItems = [...orderItems];
                        updatedItems[index].portionSize = value;
                        setOrderItems(updatedItems);
                      }}
                      _selectedItem={{
                        bg: "coolGray.100",
                        endIcon: (
                          <MaterialIcons name="check" size={20} color="black" />
                        ),
                      }}
                    >
                      <Select.Item label="Full" value="Full" />
                      <Select.Item label="Half" value="Half" />
                    </Select>
                  </FormControl>
                </VStack>
              </Box>
            ))}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Create Order Button */}
      <Box p={4} bg="white" shadow={2}>
        <Button
          size="lg"
          colorScheme="green"
          isLoading={loading}
          onPress={handleCreateOrder}
        >
          Create Order
        </Button>
      </Box>
    </Box>
  );
}
