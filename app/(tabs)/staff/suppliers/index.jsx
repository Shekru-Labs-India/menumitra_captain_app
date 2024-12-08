import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  FlatList,
  HStack,
  Avatar,
  Fab,
  Pressable,
  Input,
  Select,
  useToast,
  Spinner,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function SuppliersScreen() {
  const router = useRouter();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState("list");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier/listview`,
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
      console.log("Suppliers List Response:", data);

      if (data.st === 1 && data.data) {
        const formattedSuppliers = data.data.map((supplier) => ({
          id: supplier.supplier_code,
          name: supplier.name,
          mobileNumber1: supplier.mobile_number1,
          status: supplier.supplier_status,
          supplier_code: supplier.supplier_code,
        }));
        console.log("Formatted Suppliers:", formattedSuppliers);
        setSuppliers(formattedSuppliers);
      } else {
        throw new Error(data.msg || "Failed to fetch suppliers");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: "Failed to fetch suppliers",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (a, b) => {
    if (sortBy === "name") {
      return sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortBy === "status") {
      return sortOrder === "asc"
        ? a.status?.localeCompare(b.status)
        : b.status?.localeCompare(a.status);
    }
    return 0;
  };

  const filteredSuppliers = suppliers
    ? suppliers
        .filter((supplier) =>
          supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort(handleSort)
    : [];

  const renderListItem = ({ item }) => (
    <Pressable
      onPress={() => {
        console.log("Navigating to supplier:", item.supplier_code);
        router.push(`/staff/suppliers/${item.supplier_code}`);
      }}
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        mb={3}
        mx={1}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <HStack space={3} alignItems="center">
          <Avatar size="md" bg="cyan.500">
            {item.name.charAt(0)}
          </Avatar>
          <VStack flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              {item.name}
            </Text>
            <HStack space={2} mt={1}>
              <MaterialIcons name="phone" size={16} color="coolGray.500" />
              <Text fontSize="sm" color="coolGray.500">
                {item.mobileNumber1}
              </Text>
              <Text fontSize="sm" color="coolGray.500">
                •
              </Text>
              <Text
                fontSize="sm"
                color={item.status === "active" ? "green.500" : "red.500"}
              >
                {item.status
                  ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                  : "Not specified"}
              </Text>
            </HStack>
          </VStack>
          <MaterialIcons name="chevron-right" size={24} color="coolGray.400" />
        </HStack>
      </Box>
    </Pressable>
  );

  const renderGridItem = ({ item }) => (
    <Pressable
      onPress={() => router.push(`/staff/suppliers/${item.id}`)}
      flex={1}
      m={1}
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <VStack space={2} alignItems="center">
          <Avatar size="lg" bg="cyan.500">
            {item.name.charAt(0)}
          </Avatar>
          <VStack space={1} alignItems="center">
            <Text fontSize="md" fontWeight="bold" textAlign="center">
              {item.name}
            </Text>
            <Text fontSize="sm" color="coolGray.600" textAlign="center">
              {item.type || "Not specified"}
            </Text>
            <Text fontSize="sm" color="coolGray.500" textAlign="center">
              {item.mobileNumber1}
            </Text>
            <Text
              fontSize="sm"
              color={item.status === "active" ? "green.500" : "red.500"}
              textAlign="center"
            >
              {item.status
                ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                : "Not specified"}
            </Text>
          </VStack>
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
      <Box px={4} py={3} bg="white" shadow={2}>
        <HStack justifyContent="space-between" alignItems="center">
          <Heading size="lg">Suppliers</Heading>
          <IconButton
            icon={<MaterialIcons name="inventory" size={24} color="black" />}
            onPress={() => router.push("/staff/suppliers/inventory")}
          />
        </HStack>
      </Box>

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

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      ) : suppliers.length > 0 ? (
        <FlatList
          data={filteredSuppliers}
          renderItem={viewType === "list" ? renderListItem : renderGridItem}
          keyExtractor={(item) => item.id}
          key={viewType}
          numColumns={viewType === "grid" ? 2 : 1}
          contentContainerStyle={{ padding: 16 }}
        />
      ) : (
        <Box flex={1} justifyContent="center" alignItems="center">
          <MaterialIcons name="error-outline" size={48} color="coolGray.400" />
          <Text color="coolGray.400">No suppliers found</Text>
        </Box>
      )}

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/staff/suppliers/add")}
        position="absolute"
        bottom={4}
        right={4}
      />
    </Box>
  );
}
