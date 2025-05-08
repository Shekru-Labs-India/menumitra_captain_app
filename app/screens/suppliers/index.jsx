import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
  Icon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar, Linking } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import BottomNavigation from "../../components/BottomNavigation";

const toTitleCase = (str) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function SuppliersScreen() {
  const router = useRouter();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outletId, setOutletId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");

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
      const params = router.params;
      if (params?.isDeleted && params?.deletedSupplierId) {
        setSuppliers((prevSuppliers) =>
          prevSuppliers.filter(
            (supplier) => supplier.id !== params.deletedSupplierId
          )
        );

        router.setParams({
          isDeleted: undefined,
          deletedSupplierId: undefined,
        });
      } else {
        fetchSuppliers();
      }
    }, [router.params])
  );

  const fetchSuppliers = async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/supplier_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId.toString(),
        }),
      });
      console.log("Suppliers List Response:", data);

      if (data.st === 1 && data.data) {
        const formattedSuppliers = data.data.map((supplier) => ({
          id: supplier.supplier_id,
          name: supplier.name,
          mobileNumber1: supplier.mobile_number1,
          status: supplier.supplier_status,
          supplier_code: supplier.supplier_code,
          supplier_id: supplier.supplier_id,
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

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          setOutletId(storedOutletId);
          fetchSuppliers();
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
  }, []);

  const handleSort = (a, b) => {
    return sortOrder === "asc"
      ? a.status?.localeCompare(b.status)
      : b.status?.localeCompare(a.status);
  };

  const filteredSuppliers = suppliers
    ? suppliers
        .filter((supplier) => 
          supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          (statusFilter === "all" || supplier.status === statusFilter)
        )
        .sort(handleSort)
    : [];

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleToggleStatus = async (supplierId, currentStatus) => {
    try {
      setUpdatingStatus(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      const response = await fetchWithAuth(`${getBaseUrl()}/update_active_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId,
          type: "supplier",
          id: supplierId.toString(),
          is_active: !currentStatus
        }),
      });

      if (response.st === 1) {
        // Update the local state
        setSuppliers(prevSuppliers => 
          prevSuppliers.map(supplier => 
            supplier.supplier_id === supplierId 
              ? { ...supplier, status: !currentStatus ? "active" : "inactive" }
              : supplier
          )
        );
        
        toast.show({
          description: `Supplier ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
          status: "success",
        });
      } else {
        throw new Error(response.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Update Status Error:", error);
      toast.show({
        description: "Failed to update supplier status",
        status: "error",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderListItem = ({ item }) => (
    <Pressable
      onPress={() => {
        console.log("Navigating to supplier:", item.supplier_id);
        router.push(`/screens/suppliers/${item.supplier_id}`);
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
            {item.name.charAt(0).toUpperCase()}
          </Avatar>
          <VStack flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              {toTitleCase(item.name)}
            </Text>
            <HStack space={2} mt={1} alignItems="center">
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
          <HStack space={2} alignItems="center">
            <IconButton
              icon={<MaterialIcons name="phone" size={24} color="blue.600" />}
              onPress={() => handleCall(item.mobileNumber1)}
              bg="blue.100"
              _pressed={{ bg: "blue.200" }}
              rounded="full"
              size="md"
              p={2}
            />
            <Switch
              size="md"
              onToggle={() => {
                handleToggleStatus(item.supplier_id, item.status === "active");
              }}
              isChecked={item.status === "active"}
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
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg="coolGray.100" safeAreaTop>
      {/* Header */}
      <Box flex={1} bg="white" safeArea>
        <Header title="Suppliers" />

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

        {/* Search and Filter Bar */}
        <Box bg="white" px={4} py={2} shadow={1}>
          <HStack space={2} alignItems="center" mb={2}>
            <Input
              flex={1}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              bg="coolGray.50"
              borderRadius="lg"
              py={2}
              InputLeftElement={
                <Box pl={2}>
                  <MaterialIcons name="search" size={20} color="coolGray.400" />
                </Box>
              }
            />
          </HStack>
          
          <HStack space={2} alignItems="center">
            <Select
              flex={1}
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              bg="coolGray.50"
              borderRadius="lg"
              placeholder="Filter by status"
              _selectedItem={{
                endIcon: (
                  <MaterialIcons name="check" size={16} color="coolGray.600" />
                ),
              }}
            >
              <Select.Item label="All Status" value="all" />
              <Select.Item label="Active" value="active" />
              <Select.Item label="Inactive" value="inactive" />
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
              variant="ghost"
            />
          </HStack>
        </Box>

        {/* Content */}
        <Box flex={1} bg="coolGray.100">
          {loading ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Spinner size="lg" />
            </Box>
          ) : suppliers.length > 0 ? (
            <FlatList
              data={filteredSuppliers}
              renderItem={renderListItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 100, // Extra padding for FAB
              }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Box flex={1} justifyContent="center" alignItems="center">
              <MaterialIcons
                name="error-outline"
                size={48}
                color="coolGray.400"
              />
              <Text color="coolGray.400" mt={2}>
                No suppliers found
              </Text>
            </Box>
          )}
        </Box>

        {/* FAB */}
        <Fab
          renderInPortal={false}
          shadow={2}
          size="sm"
          icon={<MaterialIcons name="add" size={24} color="white" />}
          onPress={() => router.push("/screens/suppliers/add")}
          bg="green.500"
          _pressed={{ bg: "green.600" }}
          bottom={85}
          right={6}
        />
        
        {/* Bottom Navigation */}
        <BottomNavigation />
      </Box>
    </Box>
  );
}
