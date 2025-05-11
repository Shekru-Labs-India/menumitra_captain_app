import { useState, useEffect, useCallback, memo, useMemo } from "react";
import {
  Box,
  FlatList,
  Heading,
  HStack,
  VStack,
  Text,
  IconButton,
  Modal,
  FormControl,
  Input,
  Button,
  useToast,
  Select,
  CheckIcon,
  Badge,
  Fab,
  Pressable,
  Avatar,
  Spinner,
  SimpleGrid,
  ScrollView,
  Icon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

// Memoized helper functions
const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Memoized Components
const MemoizedHeader = memo(({ title }) => <Header title={title} />);

const StaffAvatar = memo(({ name, photo, size = "md" }) => (
  <Avatar size={size} bg="cyan.500" source={photo ? { uri: photo } : null}>
    {!photo && name?.charAt(0).toUpperCase()}
  </Avatar>
));

const ListItem = memo(({ item, onPress, onPhonePress }) => (
  <Pressable onPress={onPress}>
    <Box
      bg="white"
      rounded="lg"
      shadow={2}
      mb={3}
      mx={3}
      p={4}
      borderWidth={1}
      borderColor="coolGray.200"
    >
      <HStack space={3} alignItems="center">
        <StaffAvatar name={item.name} photo={item.photo} />
        <VStack flex={1} ml={2}>
          <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
            {toTitleCase(item.name)}
          </Text>
          <Text fontSize="md" color="coolGray.600">
            {toTitleCase(item.role)}
          </Text>
        </VStack>

        <VStack alignItems="flex-end" space={1}>
          <IconButton
            icon={<MaterialIcons name="phone" size={20} color="white" />}
            onPress={() => onPhonePress(item.mobile)}
            bg="green.500"
            _pressed={{ bg: "green.600" }}
            rounded="full"
            size="sm"
            mt={1}
          />
        </VStack>
      </HStack>
    </Box>
  </Pressable>
));

const GridItem = memo(({ item, onPress }) => (
  <Pressable onPress={onPress} flex={1} m={1}>
    <Box
      bg="white"
      rounded="lg"
      shadow={2}
      p={3}
      borderWidth={1}
      borderColor="coolGray.200"
    >
      <VStack space={2} alignItems="center">
        <StaffAvatar name={item.name} photo={item.photo} size="lg" />
        <VStack space={1} alignItems="center">
          <Text fontSize="md" fontWeight="bold" textAlign="center">
            {toTitleCase(item.name)}
          </Text>
          <Text fontSize="sm" color="coolGray.600" textAlign="center">
            {toTitleCase(item.role)}
          </Text>
        </VStack>
      </VStack>
    </Box>
  </Pressable>
));

export default function StaffScreen() {
  const router = useRouter();
  const [staffList, setStaffList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const params = useLocalSearchParams();
  const [outletId, setOutletId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [restaurantName, setRestaurantName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    salary: "",
    joinDate: new Date().toISOString().split("T")[0],
    status: "present",
    emergencyContact: "",
    address: "",
    notes: "",
  });

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

  // Memoized handlers
  const handlePhonePress = useCallback((phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }, []);

  const handleItemPress = useCallback((staffId, restaurantId) => {
    router.push({
      pathname: `/(tabs)/staff/${staffId}`,
      params: { restaurant_id: restaurantId },
    });
  }, [router]);

  // Memoized list renderers
  const renderStaffItem = useCallback(({ item }) => (
    <ListItem
      item={item}
      onPress={() => handleItemPress(item.staff_id, item.restaurant_id)}
      onPhonePress={handlePhonePress}
    />
  ), [handleItemPress, handlePhonePress]);

  const renderGridItem = useCallback(({ item }) => (
    <GridItem
      item={item}
      onPress={() => handleItemPress(item.staff_id, item.restaurant_id)}
    />
  ), [handleItemPress]);

  // Memoized filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList
      .filter((staff) => {
        const matchesSearch =
          staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          staff.mobile?.includes(searchQuery) ||
          staff.role?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesRoleFilter = 
          roleFilter === "all" || 
          staff.role?.toLowerCase() === roleFilter.toLowerCase();
        
        return matchesSearch && matchesRoleFilter;
      })
      .sort((a, b) => {
        const factor = sortOrder === "asc" ? 1 : -1;
        return sortBy === "name"
          ? a.name.localeCompare(b.name) * factor
          : a.role.localeCompare(b.role) * factor;
      });
  }, [staffList, searchQuery, sortBy, sortOrder, roleFilter]);

  // Optimized fetch functions
  const fetchStaffList = useCallback(async () => {
    if (!outletId) return;

    setIsLoading(true);
    try {
      const data = await fetchWithAuth(
        `${getBaseUrl()}/get_staff_list_with_role`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: outletId,
            staff_role: "all",
          }),
        }
      );

      if (data.st === 1 && Array.isArray(data.lists)) {
        setStaffList(data.lists);
      } else {
        setStaffList([]);
        toast.show({
          description: "Failed to fetch staff list",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Fetch Staff Error:", error);
      setStaffList([]);
      toast.show({
        description: "Failed to fetch staff list",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [outletId, toast]);

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          setOutletId(parseInt(storedOutletId));
          fetchStaffList();
        } else {
          toast.show({
            description: "Please login again",
            status: "error",
          });
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
  }, []);

  useEffect(() => {
    if (outletId) {
      fetchStaffList();
    }
  }, [outletId]);

  // Add refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStaffList();
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.show({
        description: "Failed to refresh staff list",
        status: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }, [outletId]);

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, refreshing data...");
      fetchStaffList();
    }, [outletId])
  );

  return (
    <Box flex={1} bg="white" safeArea>
      <MemoizedHeader title="Staff" />

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
              <Icon as={MaterialIcons} name="store" size={5} color="gray.600" />
              <Text fontWeight="medium" fontSize="md">{restaurantName || ""}</Text>
            </HStack>
          </HStack>
        </Pressable>
      </Box>

      <VStack flex={1}>
        <HStack
          px={4}
          py={3}
          alignItems="center"
          justifyContent="flex-end"
          borderBottomWidth={1}
          borderBottomColor="coolGray.200"
          bg="coolGray.50"
        >
          <HStack space={2} alignItems="center">
            <Input
              w="40%"
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              InputLeftElement={
                <MaterialIcons
                  name="search"
                  size={24}
                  color="gray.400"
                  style={{ marginLeft: 15 }}
                />
              }
            />
            
            <Select
              w="110"
              selectedValue={roleFilter}
              onValueChange={setRoleFilter}
              placeholder="Filter role"
              _selectedItem={{
                endIcon: <CheckIcon size={4} />,
              }}
              defaultValue="all"
              alignSelf="center"
            >
              <Select.Item label="All Roles" value="all" />
              <Select.Item label="Cleaner" value="cleaner" />
              <Select.Item label="Receptionist" value="receptionist" />
              
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
        </HStack>

        {isLoading && !refreshing ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Spinner size="lg" />
            <Text mt={2}>Loading staff list...</Text>
          </Box>
        ) : (
          <Box flex={1}>
            <FlatList
              data={filteredStaff}
              renderItem={
                viewType === "list" ? renderStaffItem : renderGridItem
              }
              keyExtractor={(item) => item.staff_id?.toString()}
              numColumns={viewType === "grid" ? 2 : 1}
              key={viewType}
              contentContainerStyle={{
                padding: 4,
                flexGrow: 1,
              }}
              refreshing={refreshing}
              onRefresh={onRefresh}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={8}
              ListEmptyComponent={
                <Box
                  flex={1}
                  justifyContent="center"
                  alignItems="center"
                  py={10}
                >
                  <Text color="gray.500">No staff members found</Text>
                </Box>
              }
            />
          </Box>
        )}
      </VStack>

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        colorScheme="green"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/staff/add")}
        position="absolute"
        bottom={4}
        right={4}
      />
    </Box>
  );
}
