import { useState } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  FlatList,
  HStack,
  Pressable,
  Badge,
  ScrollView,
  Divider,
  Input,
  Select,
  Fab,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";

export default function InventoryItemsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState("list");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [inventoryItems] = useState([
    {
      id: "INV001",
      supplierId: "SUP123",
      name: "Sample Item 1",
      description: "This is a sample inventory item",
      category: "Electronics",
      price: 1500,
      quantity: 10,
      serialNo: "SER001",
      status: "in",
      brandName: "Brand X",
      tax: 18,
      paymentStatus: "paid",
      orderId: "ORD123",
      inDateTime: "2024-03-15 10:30 AM",
      outDateTime: "2024-03-16 02:45 PM",
    },
    {
      id: "INV002",
      supplierId: "SUP456",
      name: "Kitchen Mixer",
      description: "Professional grade kitchen mixer with multiple attachments",
      category: "Appliances",
      price: 2500,
      quantity: 5,
      serialNo: "SER002",
      status: "out",
      brandName: "KitchenPro",
      tax: 12,
      paymentStatus: "pending",
      orderId: "ORD124",
      inDateTime: "2024-03-14 09:15 AM",
      outDateTime: "2024-03-15 11:30 AM",
    },
    {
      id: "INV003",
      supplierId: "SUP789",
      name: "Office Chair",
      description:
        "Ergonomic office chair with lumbar support and adjustable height",
      category: "Furniture",
      price: 3500,
      quantity: 8,
      serialNo: "SER003",
      status: "in",
      brandName: "ComfortPlus",
      tax: 15,
      paymentStatus: "paid",
      orderId: "ORD125",
      inDateTime: "2024-03-16 02:00 PM",
      outDateTime: null,
    },
    {
      id: "INV004",
      supplierId: "SUP101",
      name: "LED Monitor",
      description: "27-inch 4K LED Monitor with HDR support",
      category: "Electronics",
      price: 4500,
      quantity: 3,
      serialNo: "SER004",
      status: "in",
      brandName: "TechView",
      tax: 18,
      paymentStatus: "pending",
      orderId: "ORD126",
      inDateTime: "2024-03-17 11:45 AM",
      outDateTime: null,
    },
  ]);

  // Filter items based on search query
  const filteredItems = inventoryItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.supplierId.toLowerCase().includes(searchLower) ||
      item.serialNo.toLowerCase().includes(searchLower)
    );
  });

  // Sort items based on selected criteria
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "category":
        comparison = a.category.localeCompare(b.category);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      default:
        comparison = 0;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const renderInventoryItem = ({ item }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/staff/inventory-item-details",
          params: { itemId: item.id },
        })
      }
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        mb={3}
        mx={4}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <VStack space={3}>
          {/* Header Section */}
          <HStack justifyContent="space-between" alignItems="center">
            <VStack>
              <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
                {item.name}
              </Text>
              <Text fontSize="sm" color="coolGray.600">
                ID: {item.id}
              </Text>
            </VStack>
            <Badge
              colorScheme={item.status === "in" ? "success" : "danger"}
              variant="subtle"
              rounded="md"
            >
              {item.status.toUpperCase()}
            </Badge>
          </HStack>

          <Divider />

          {/* Details Grid */}
          <VStack space={2}>
            <HStack justifyContent="space-between">
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Supplier ID
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {item.supplierId}
                </Text>
              </VStack>
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Category
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {item.category}
                </Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Price
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  ₹{item.price}
                </Text>
              </VStack>
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Quantity
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {item.quantity}
                </Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Serial No.
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {item.serialNo}
                </Text>
              </VStack>
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Brand
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {item.brandName}
                </Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Tax
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {item.tax}%
                </Text>
              </VStack>
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Payment Status
                </Text>
                <Badge
                  colorScheme={
                    item.paymentStatus === "paid" ? "success" : "warning"
                  }
                  variant="subtle"
                  rounded="md"
                >
                  {item.paymentStatus.toUpperCase()}
                </Badge>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between">
              <VStack flex={1}>
                <Text fontSize="xs" color="coolGray.500">
                  Order ID
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {item.orderId}
                </Text>
              </VStack>
            </HStack>

            <Divider />

            {/* Timestamps */}
            <VStack space={1}>
              <HStack justifyContent="space-between">
                <Text fontSize="xs" color="coolGray.500">
                  In Date & Time
                </Text>
                <Text fontSize="xs" fontWeight="medium">
                  {item.inDateTime}
                </Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontSize="xs" color="coolGray.500">
                  Out Date & Time
                </Text>
                <Text fontSize="xs" fontWeight="medium">
                  {item.outDateTime}
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </VStack>
      </Box>
    </Pressable>
  );

  // Grid view render item
  const renderGridItem = ({ item }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/staff/inventory-item-details",
          params: { itemId: item.id },
        })
      }
      flex={1}
      m={1}
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        p={3}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <VStack space={2}>
          <Badge
            colorScheme={item.status === "in" ? "success" : "danger"}
            alignSelf="flex-start"
            variant="subtle"
            rounded="md"
          >
            {item.status.toUpperCase()}
          </Badge>
          <Text fontSize="md" fontWeight="bold" color="coolGray.800">
            {item.name}
          </Text>
          <Text fontSize="xs" color="coolGray.600">
            ID: {item.id}
          </Text>
          <Text fontSize="sm" color="coolGray.600">
            {item.category}
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            ₹{item.price}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Box px={4} py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "gray.100" }}
            position="absolute"
            left={0}
            zIndex={1}
          />
          <Heading size="md" flex={1} textAlign="center">
            Inventory Items
          </Heading>
        </HStack>
      </Box>

      {/* Search and Filter Bar */}
      <HStack
        px={4}
        py={2}
        space={2}
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <Input
          flex={1}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          InputLeftElement={
            <MaterialIcons
              name="search"
              size={20}
              color="coolGray.400"
              style={{ marginLeft: 8 }}
            />
          }
        />
        <IconButton
          icon={
            <MaterialIcons
              name={viewType === "list" ? "grid-view" : "view-list"}
              size={24}
              color="coolGray.600"
            />
          }
          onPress={() => setViewType(viewType === "list" ? "grid" : "list")}
        />
        <Select
          w="110"
          selectedValue={sortBy}
          onValueChange={setSortBy}
          placeholder="Sort by"
          _selectedItem={{
            endIcon: (
              <MaterialIcons name="check" size={16} color="coolGray.600" />
            ),
          }}
        >
          <Select.Item label="Name" value="name" />
          <Select.Item label="Category" value="category" />
          <Select.Item label="Status" value="status" />
        </Select>
        <IconButton
          icon={
            <MaterialIcons
              name={sortOrder === "asc" ? "arrow-upward" : "arrow-downward"}
              size={24}
              color="coolGray.600"
            />
          }
          onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        />
      </HStack>

      <FlatList
        data={sortedItems}
        renderItem={viewType === "list" ? renderInventoryItem : renderGridItem}
        keyExtractor={(item) => item.id}
        numColumns={viewType === "grid" ? 2 : 1}
        key={viewType} // Force re-render when switching view types
        contentContainerStyle={{
          padding: viewType === "grid" ? 3 : 0,
          paddingVertical: 16,
          paddingBottom: 80,
        }}
        showsVerticalScrollIndicator={false}
      />

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/(tabs)/staff/add-inventory-item")}
        bg="#007AFF"
        _pressed={{
          bg: "#0056b3",
        }}
        bottom={85}
        right={6}
      />
    </Box>
  );
}
